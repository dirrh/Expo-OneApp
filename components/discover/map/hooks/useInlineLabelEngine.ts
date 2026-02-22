import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Platform } from "react-native";
import type { MapViewRef } from "../../../../lib/interfaces";
import {
  selectInlineLabelIds,
  selectInlineLabelLayout,
  type LabelPlacement,
  type LabelSlot,
  type MarkerLabelCandidate,
  type ResolvedDiscoverMapLabelPolicy,
} from "../../../../lib/maps/labelSelection";
import {
  clampNumber,
  projectToWorld,
  wrapWorldDelta,
} from "../../../../lib/maps/discoverMapUtils";
import {
  IOS_ZOOM_OFFSET,
  IOS_LABEL_RECOMPUTE_PAN_THRESHOLD_PX,
  IOS_LABEL_RECOMPUTE_ZOOM_THRESHOLD,
  MAP_LABEL_COLLISION_V2_LOGS_ENABLED,
  MAP_LABEL_DENSE_LOW_ZOOM_BUDGET,
  MAP_LABEL_DENSE_MARKER_COUNT_THRESHOLD,
  MAP_LABEL_GESTURE_RECOMPUTE_MS,
  MAP_LABEL_MAX_CANDIDATES_V3,
  MAP_LABEL_STICKY_SLOT_BONUS,
  MAP_IOS_STABLE_MARKERS_LOGS_ENABLED,
} from "../../../../lib/constants/discover";
import {
  FULL_SPRITE_VIEWPORT_MARGIN_X,
  FULL_SPRITE_VIEWPORT_MARGIN_Y,
  INLINE_LABEL_COLLISION_GAP_X,
  INLINE_LABEL_COLLISION_GAP_Y,
  INLINE_LABEL_FIXED_SLOT_OFFSETS,
  INLINE_LABEL_FIXED_SLOT_PENALTIES,
  INLINE_LABEL_PRECISE_COLLISION_HEIGHT_SCALE,
  INLINE_LABEL_PRECISE_COLLISION_WIDTH_SCALE,
  LABEL_RECOMPUTE_SKIP_PAN_PX,
  LABEL_RECOMPUTE_SKIP_ZOOM,
} from "../constants";
import type {
  InlineLabelRecomputeSource,
  MapLayoutSize,
} from "../types";

type LabelEngineBaseSize = {
  width: number;
  height: number;
  offsetY: number;
};

type UseInlineLabelEngineParams = {
  cameraRef: MapViewRef;
  cameraCenter: [number, number];
  zoom: number;
  showSingleLayer: boolean;
  singleLayerEnterZoom: number;
  mapLayoutSize: MapLayoutSize;
  labelCandidates: MarkerLabelCandidate[];
  labelEngineBaseSize: LabelEngineBaseSize;
  mapLabelCollisionV2Enabled: boolean;
  labelLayoutV3Enabled: boolean;
  resolvedLabelPolicy: ResolvedDiscoverMapLabelPolicy;
  useInlineLabelOverlay: boolean;
  fullSpriteTextLayersEnabled: boolean;
  isIOSStableMarkersMode: boolean;
  localFullSpriteIdSet: Set<string>;
};

type InlineLabelEngineResult = {
  inlineLabelIds: string[];
  inlineLabelPlacements: LabelPlacement[];
  recomputeInlineLabels: (
    nextCenter: [number, number],
    nextZoom: number,
    source?: InlineLabelRecomputeSource
  ) => void;
  scheduleGestureLabelRecompute: (nextCenter: [number, number], nextZoom: number) => void;
  clearPendingGestureLabelRecompute: () => void;
  forceInlineLabelIdsRef: MutableRefObject<Set<string>>;
};

export const useInlineLabelEngine = ({
  cameraRef,
  cameraCenter,
  zoom,
  showSingleLayer,
  singleLayerEnterZoom,
  mapLayoutSize,
  labelCandidates,
  labelEngineBaseSize,
  mapLabelCollisionV2Enabled,
  labelLayoutV3Enabled,
  resolvedLabelPolicy,
  useInlineLabelOverlay,
  fullSpriteTextLayersEnabled,
  isIOSStableMarkersMode,
  localFullSpriteIdSet,
}: UseInlineLabelEngineParams): InlineLabelEngineResult => {
  const [inlineLabelIds, setInlineLabelIds] = useState<string[]>([]);
  const [inlineLabelPlacements, setInlineLabelPlacements] = useState<LabelPlacement[]>([]);

  const inlineLabelIdsRef = useRef<string[]>([]);
  const stickySlotByIdRef = useRef<Map<string, LabelSlot>>(new Map());
  const forceInlineLabelIdsRef = useRef<Set<string>>(new Set());
  const inlineLabelHashRef = useRef("");
  const inlineLabelsEnabledRef = useRef(false);

  const lastInlineRecomputeRef = useRef<{
    center: [number, number];
    zoom: number;
  } | null>(null);
  const cameraCenterRef = useRef(cameraCenter);
  const zoomRef = useRef(zoom);
  const recomputeCounterRef = useRef(0);
  const nativeProjectionRequestRef = useRef(0);
  const mountedRef = useRef(true);
  const gestureRecomputeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingGestureRecomputeRef = useRef<{
    center: [number, number];
    zoom: number;
  } | null>(null);
  const lastGestureRecomputeTsRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const commitInlineLabelLayout = useCallback(
    (
      nextPlacements: LabelPlacement[],
      enabled: boolean,
      explicitHash?: string,
      explicitIds?: string[]
    ) => {
      const nextIds =
        explicitIds && explicitIds.length > 0
          ? [...explicitIds]
          : nextPlacements.map((placement) => placement.id);
      const nextHash =
        explicitHash ??
        [...nextPlacements]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((placement) => `${placement.id}:${placement.slot}`)
          .join("|");
      const hasSameState =
        inlineLabelHashRef.current === nextHash &&
        inlineLabelsEnabledRef.current === enabled;
      if (hasSameState) {
        return;
      }
      inlineLabelHashRef.current = nextHash;
      inlineLabelsEnabledRef.current = enabled;
      inlineLabelIdsRef.current = nextIds;
      stickySlotByIdRef.current = new Map(
        nextPlacements.map((placement) => [placement.id, placement.slot])
      );
      setInlineLabelIds(nextIds);
      setInlineLabelPlacements(nextPlacements);
    },
    []
  );

  useEffect(() => {
    inlineLabelIdsRef.current = inlineLabelIds;
  }, [inlineLabelIds]);

  useEffect(() => {
    cameraCenterRef.current = cameraCenter;
  }, [cameraCenter]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const recomputeInlineLabels = useCallback(
    (
      nextCenter: [number, number],
      nextZoom: number,
      source: InlineLabelRecomputeSource = "dataset"
    ) => {
      const startedAtMs = Date.now();
      const selectionRunId = nativeProjectionRequestRef.current + 1;
      nativeProjectionRequestRef.current = selectionRunId;
      const effectiveNextZoomRaw =
        Platform.OS === "ios" ? nextZoom + IOS_ZOOM_OFFSET : nextZoom;
      const effectiveNextZoom = clampNumber(effectiveNextZoomRaw, 0, 20);
      const shouldShowSingleLayerForPass =
        effectiveNextZoom >= singleLayerEnterZoom;
      if (
        mapLayoutSize.width <= 0 ||
        mapLayoutSize.height <= 0 ||
        labelCandidates.length === 0 ||
        !shouldShowSingleLayerForPass
      ) {
        commitInlineLabelLayout([], false, "", []);
        lastInlineRecomputeRef.current = null;
        stickySlotByIdRef.current = new Map();
        forceInlineLabelIdsRef.current.clear();
        return;
      }

      const hasForcedIds = forceInlineLabelIdsRef.current.size > 0;
      const previousRecompute = lastInlineRecomputeRef.current;
      let panDeltaPx = Number.POSITIVE_INFINITY;
      let zoomDelta = Number.POSITIVE_INFINITY;
      if (previousRecompute) {
        const worldSize = 256 * Math.pow(2, effectiveNextZoom);
        const previousPoint = projectToWorld(
          previousRecompute.center[0],
          previousRecompute.center[1],
          worldSize
        );
        const nextPoint = projectToWorld(nextCenter[0], nextCenter[1], worldSize);
        const deltaX = wrapWorldDelta(nextPoint.x - previousPoint.x, worldSize);
        const deltaY = nextPoint.y - previousPoint.y;
        panDeltaPx = Math.hypot(deltaX, deltaY);
        zoomDelta = Math.abs(effectiveNextZoom - previousRecompute.zoom);
      }
      const shouldThrottleIOSRecompute =
        isIOSStableMarkersMode &&
        source === "region-change" &&
        !hasForcedIds;

      if (shouldThrottleIOSRecompute) {
        if (
          previousRecompute &&
          panDeltaPx < IOS_LABEL_RECOMPUTE_PAN_THRESHOLD_PX &&
          zoomDelta < IOS_LABEL_RECOMPUTE_ZOOM_THRESHOLD
        ) {
          return;
        }
      }

      if (
        source === "region-complete" &&
        !hasForcedIds &&
        previousRecompute &&
        panDeltaPx < LABEL_RECOMPUTE_SKIP_PAN_PX &&
        zoomDelta < LABEL_RECOMPUTE_SKIP_ZOOM
      ) {
        return;
      }

      const applySelection = (selectionCandidates: MarkerLabelCandidate[]) => {
        if (
          !mountedRef.current ||
          nativeProjectionRequestRef.current !== selectionRunId
        ) {
          return;
        }

        const previousHash = inlineLabelHashRef.current;
        const previousEnabled = inlineLabelsEnabledRef.current;

        if (!mapLabelCollisionV2Enabled) {
          if (effectiveNextZoom < singleLayerEnterZoom) {
            commitInlineLabelLayout([], false, "", []);
            lastInlineRecomputeRef.current = {
              center: [nextCenter[0], nextCenter[1]],
              zoom: effectiveNextZoom,
            };
            stickySlotByIdRef.current = new Map();
            forceInlineLabelIdsRef.current.clear();
            return;
          }

          const worldSize = 256 * Math.pow(2, effectiveNextZoom);
          const centerPoint = projectToWorld(nextCenter[0], nextCenter[1], worldSize);
          const visiblePlacements: LabelPlacement[] = [];

          selectionCandidates.forEach((candidate) => {
            const hasNativePoint =
              typeof candidate.screenX === "number" &&
              Number.isFinite(candidate.screenX) &&
              typeof candidate.screenY === "number" &&
              Number.isFinite(candidate.screenY);
            let screenX = 0;
            let screenY = 0;

            if (hasNativePoint) {
              screenX = candidate.screenX!;
              screenY = candidate.screenY!;
            } else {
              const candidatePoint = projectToWorld(
                candidate.coordinate.longitude,
                candidate.coordinate.latitude,
                worldSize
              );
              const dx = wrapWorldDelta(candidatePoint.x - centerPoint.x, worldSize);
              const dy = candidatePoint.y - centerPoint.y;
              screenX = mapLayoutSize.width / 2 + dx;
              screenY = mapLayoutSize.height / 2 + dy;
            }

            const candidateWidth = candidate.estimatedWidth ?? labelEngineBaseSize.width;
            const candidateHeight = candidate.labelHeight ?? labelEngineBaseSize.height;
            const candidateOffsetX = candidate.labelOffsetX ?? 0;
            const candidateOffsetY = candidate.labelOffsetY ?? labelEngineBaseSize.offsetY;
            const renderLeft = screenX + candidateOffsetX - candidateWidth / 2;
            const renderTop = screenY + candidateOffsetY;
            const renderRight = renderLeft + candidateWidth;
            const renderBottom = renderTop + candidateHeight;

            if (
              renderRight < -FULL_SPRITE_VIEWPORT_MARGIN_X ||
              renderLeft > mapLayoutSize.width + FULL_SPRITE_VIEWPORT_MARGIN_X ||
              renderBottom < -FULL_SPRITE_VIEWPORT_MARGIN_Y ||
              renderTop > mapLayoutSize.height + FULL_SPRITE_VIEWPORT_MARGIN_Y
            ) {
              return;
            }

            visiblePlacements.push({
              id: candidate.id,
              title: candidate.title,
              slot: "below",
              left: renderLeft,
              top: renderTop,
              width: candidateWidth,
              height: candidateHeight,
              screenX: screenX + candidateOffsetX,
              screenY: screenY + candidateOffsetY,
              score: 1,
            });
          });

          const visibleIds = visiblePlacements.map((placement) => placement.id);
          const visibleHash = visiblePlacements
            .map((placement) => `${placement.id}:${placement.slot}`)
            .sort()
            .join("|");
          commitInlineLabelLayout(
            visiblePlacements,
            true,
            visibleHash,
            visibleIds
          );
          lastInlineRecomputeRef.current = {
            center: [nextCenter[0], nextCenter[1]],
            zoom: effectiveNextZoom,
          };
          forceInlineLabelIdsRef.current.clear();
          return;
        }

        const denseLowZoomCircuitBreakerActive =
          selectionCandidates.length > MAP_LABEL_DENSE_MARKER_COUNT_THRESHOLD &&
          effectiveNextZoom < singleLayerEnterZoom;
        const policyForPass = denseLowZoomCircuitBreakerActive
          ? {
              ...resolvedLabelPolicy,
              lowZoomMax: Math.min(
                resolvedLabelPolicy.lowZoomMax,
                MAP_LABEL_DENSE_LOW_ZOOM_BUDGET
              ),
            }
          : resolvedLabelPolicy;
        const forcedIds =
          forceInlineLabelIdsRef.current.size > 0
            ? new Set(forceInlineLabelIdsRef.current)
            : undefined;
        const maxCandidatesForPass = Math.max(
          MAP_LABEL_MAX_CANDIDATES_V3,
          selectionCandidates.length
        );
        const selection = labelLayoutV3Enabled
          ? selectInlineLabelLayout({
              candidates: selectionCandidates,
              center: nextCenter,
              zoom: effectiveNextZoom,
              singleModeZoom: singleLayerEnterZoom,
              preferVisibleNonOverlapping: true,
              collisionGapX: INLINE_LABEL_COLLISION_GAP_X,
              collisionGapY: INLINE_LABEL_COLLISION_GAP_Y,
              collisionWidthScale: INLINE_LABEL_PRECISE_COLLISION_WIDTH_SCALE,
              collisionHeightScale: INLINE_LABEL_PRECISE_COLLISION_HEIGHT_SCALE,
              maxCandidates: maxCandidatesForPass,
              stickySlotBonus: MAP_LABEL_STICKY_SLOT_BONUS,
              slotOffsets: INLINE_LABEL_FIXED_SLOT_OFFSETS,
              slotPenalties: INLINE_LABEL_FIXED_SLOT_PENALTIES,
              markerObstacleScope: "all",
              mapSize: mapLayoutSize,
              labelSize: labelEngineBaseSize,
              policy: policyForPass,
              wasEnabled: inlineLabelsEnabledRef.current,
              stickyIds: new Set(inlineLabelIdsRef.current),
              stickySlots: stickySlotByIdRef.current,
              forceIncludeIds: forcedIds,
            })
          : (() => {
              const legacySelection = selectInlineLabelIds({
                candidates: selectionCandidates,
                center: nextCenter,
                zoom: effectiveNextZoom,
                singleModeZoom: singleLayerEnterZoom,
                preferVisibleNonOverlapping: true,
                markerObstacleScope: "all",
                mapSize: mapLayoutSize,
                labelSize: labelEngineBaseSize,
                policy: policyForPass,
                wasEnabled: inlineLabelsEnabledRef.current,
                stickyIds: new Set(inlineLabelIdsRef.current),
                forceIncludeIds: forcedIds,
              });
              return {
                ...legacySelection,
                placements: [] as LabelPlacement[],
                hiddenCount: 0,
                forcedPlaced: 0,
                evicted: 0,
              };
            })();

        commitInlineLabelLayout(
          selection.placements,
          selection.enabled,
          selection.hash,
          selection.ids
        );
        lastInlineRecomputeRef.current = {
          center: [nextCenter[0], nextCenter[1]],
          zoom: effectiveNextZoom,
        };
        forceInlineLabelIdsRef.current.clear();
        const currentHash = selection.hash;
        const hashChanged =
          previousHash !== currentHash || previousEnabled !== selection.enabled;
        if (hashChanged) {
          recomputeCounterRef.current += 1;
        }
        if (isIOSStableMarkersMode && MAP_IOS_STABLE_MARKERS_LOGS_ENABLED) {
          const recomputeMs = Date.now() - startedAtMs;
          const fallbackCount = selection.ids.filter(
            (id) => !localFullSpriteIdSet.has(id)
          ).length;
          console.debug(
            `[map_ios_stable_markers_v1] source=${source} markers=${selectionCandidates.length} inlineLabelCount=${selection.ids.length} selectionHashChanges=${recomputeCounterRef.current} recomputeMs=${recomputeMs} fallbackCount=${fallbackCount}`
          );
        }

        if (MAP_LABEL_COLLISION_V2_LOGS_ENABLED) {
          const recomputeMs = Date.now() - startedAtMs;
          console.debug(
            `[map_label_collision_v2] source=${source} markers=${selectionCandidates.length} candidates=${selection.candidateCount ?? 0} projected=${selection.projectedCount ?? 0} selected=${selection.ids.length} hidden=${selection.hiddenCount ?? 0} forcedPlaced=${selection.forcedPlaced ?? 0} evicted=${selection.evicted ?? 0} rejectedByCollision=${selection.rejectedByCollision ?? 0} zoom=${effectiveNextZoom.toFixed(2)} recomputeMs=${recomputeMs}`
          );
        }
      };

      const shouldUseNativeProjection =
        labelLayoutV3Enabled &&
        mapLabelCollisionV2Enabled &&
        labelCandidates.length <= MAP_LABEL_MAX_CANDIDATES_V3;
      const mapView = cameraRef.current;
      if (!shouldUseNativeProjection || !mapView) {
        applySelection(labelCandidates);
        return;
      }

      const nativeProjectionLimit = labelCandidates.length;
      let nativeProjectionCandidates = labelCandidates;
      if (nativeProjectionLimit < labelCandidates.length) {
        const stickyNativeProjectionIds = new Set<string>([
          ...inlineLabelIdsRef.current,
          ...Array.from(forceInlineLabelIdsRef.current),
        ]);
        const worldSize = 256 * Math.pow(2, effectiveNextZoom);
        const centerPoint = projectToWorld(nextCenter[0], nextCenter[1], worldSize);
        const distanceToCenterById = new Map<string, number>();
        labelCandidates.forEach((candidate) => {
          const point = projectToWorld(
            candidate.coordinate.longitude,
            candidate.coordinate.latitude,
            worldSize
          );
          const dx = wrapWorldDelta(point.x - centerPoint.x, worldSize);
          const dy = point.y - centerPoint.y;
          distanceToCenterById.set(candidate.id, Math.hypot(dx, dy));
        });
        nativeProjectionCandidates = [...labelCandidates]
          .sort((left, right) => {
            const leftSticky = stickyNativeProjectionIds.has(left.id) ? 1 : 0;
            const rightSticky = stickyNativeProjectionIds.has(right.id) ? 1 : 0;
            if (rightSticky !== leftSticky) {
              return rightSticky - leftSticky;
            }
            const leftDistance =
              distanceToCenterById.get(left.id) ?? Number.POSITIVE_INFINITY;
            const rightDistance =
              distanceToCenterById.get(right.id) ?? Number.POSITIVE_INFINITY;
            if (leftDistance !== rightDistance) {
              return leftDistance - rightDistance;
            }
            const leftPriority = Number.isFinite(left.labelPriority)
              ? left.labelPriority
              : 0;
            const rightPriority = Number.isFinite(right.labelPriority)
              ? right.labelPriority
              : 0;
            if (rightPriority !== leftPriority) {
              return rightPriority - leftPriority;
            }
            const leftRating = Number.isFinite(left.rating) ? left.rating : 0;
            const rightRating = Number.isFinite(right.rating) ? right.rating : 0;
            if (rightRating !== leftRating) {
              return rightRating - leftRating;
            }
            return left.id.localeCompare(right.id);
          })
          .slice(0, nativeProjectionLimit);
      }

      const shouldRunInstantPassBeforeNative =
        source !== "region-change" &&
        (!fullSpriteTextLayersEnabled ||
          useInlineLabelOverlay ||
          source === "map-ready" ||
          source === "dataset" ||
          source === "layout" ||
          !inlineLabelsEnabledRef.current ||
          inlineLabelIdsRef.current.length === 0);

      if (shouldRunInstantPassBeforeNative) {
        applySelection(labelCandidates);
      }

      if (nativeProjectionCandidates.length === 0) {
        applySelection(labelCandidates);
        return;
      }

      void Promise.all(
        nativeProjectionCandidates.map(async (candidate) => {
          try {
            const point = await mapView.pointForCoordinate(candidate.coordinate);
            if (
              point &&
              Number.isFinite(point.x) &&
              Number.isFinite(point.y)
            ) {
              return {
                ...candidate,
                screenX: point.x,
                screenY: point.y,
              };
            }
          } catch {
          }
          return candidate;
        })
      )
        .then((projectedCandidatesSubset) => {
          const projectedById = new Map(
            projectedCandidatesSubset.map((candidate) => [candidate.id, candidate])
          );
          const mergedCandidates = labelCandidates.map(
            (candidate) => projectedById.get(candidate.id) ?? candidate
          );
          applySelection(mergedCandidates);
        })
        .catch(() => {
          applySelection(labelCandidates);
        });
    },
    [
      cameraRef,
      commitInlineLabelLayout,
      fullSpriteTextLayersEnabled,
      isIOSStableMarkersMode,
      labelCandidates,
      labelEngineBaseSize,
      labelLayoutV3Enabled,
      localFullSpriteIdSet,
      mapLabelCollisionV2Enabled,
      mapLayoutSize,
      resolvedLabelPolicy,
      singleLayerEnterZoom,
      useInlineLabelOverlay,
    ]
  );

  useEffect(() => {
    recomputeInlineLabels(cameraCenterRef.current, zoomRef.current, "dataset");
  }, [labelCandidates, recomputeInlineLabels]);

  useEffect(() => {
    recomputeInlineLabels(
      cameraCenterRef.current,
      zoomRef.current,
      "region-complete"
    );
  }, [recomputeInlineLabels, showSingleLayer]);

  const clearPendingGestureLabelRecompute = useCallback(() => {
    if (gestureRecomputeTimeoutRef.current) {
      clearTimeout(gestureRecomputeTimeoutRef.current);
      gestureRecomputeTimeoutRef.current = null;
    }
    pendingGestureRecomputeRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearPendingGestureLabelRecompute();
    };
  }, [clearPendingGestureLabelRecompute]);

  const scheduleGestureLabelRecompute = useCallback(
    (nextCenter: [number, number], nextZoom: number) => {
      if (!labelLayoutV3Enabled) {
        return;
      }
      if (fullSpriteTextLayersEnabled && !useInlineLabelOverlay) {
        return;
      }

      pendingGestureRecomputeRef.current = {
        center: [nextCenter[0], nextCenter[1]],
        zoom: nextZoom,
      };

      const now = Date.now();
      const elapsed = now - lastGestureRecomputeTsRef.current;
      const runImmediate =
        elapsed >= MAP_LABEL_GESTURE_RECOMPUTE_MS &&
        gestureRecomputeTimeoutRef.current === null;

      if (runImmediate) {
        lastGestureRecomputeTsRef.current = now;
        const pending = pendingGestureRecomputeRef.current;
        pendingGestureRecomputeRef.current = null;
        if (pending) {
          recomputeInlineLabels(pending.center, pending.zoom, "region-change");
        }
        return;
      }

      if (gestureRecomputeTimeoutRef.current) {
        return;
      }

      const waitMs = Math.max(1, MAP_LABEL_GESTURE_RECOMPUTE_MS - elapsed);
      gestureRecomputeTimeoutRef.current = setTimeout(() => {
        gestureRecomputeTimeoutRef.current = null;
        lastGestureRecomputeTsRef.current = Date.now();
        const pending = pendingGestureRecomputeRef.current;
        pendingGestureRecomputeRef.current = null;
        if (pending) {
          recomputeInlineLabels(pending.center, pending.zoom, "region-change");
        }
      }, waitMs);
    },
    [
      fullSpriteTextLayersEnabled,
      labelLayoutV3Enabled,
      recomputeInlineLabels,
      useInlineLabelOverlay,
    ]
  );

  return {
    inlineLabelIds,
    inlineLabelPlacements,
    recomputeInlineLabels,
    scheduleGestureLabelRecompute,
    clearPendingGestureLabelRecompute,
    forceInlineLabelIdsRef,
  };
};

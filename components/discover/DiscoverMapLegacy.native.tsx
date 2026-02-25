import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, type LayoutChangeEvent, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import type { DiscoverMapProps, DiscoverMapMarker } from "../../lib/interfaces";
import { styles } from "./discoverStyles";
import {
  normalizeCenter,
  regionToZoom,
  setMapCamera,
  zoomToRegion,
} from "../../lib/maps/camera";
import {
  isFiniteCoordinate,
  isValidMapCoordinate,
  isValidRegion,
} from "../../lib/maps/discoverMapUtils";
import {
  DEFAULT_CAMERA_ZOOM,
  DEFAULT_CITY_CENTER,
  FORCE_CLUSTER_ZOOM,
  SINGLE_MODE_ZOOM,
  IOS_ZOOM_OFFSET,
  IOS_FORCE_CLUSTER_ZOOM,
  IOS_SINGLE_MODE_ZOOM,
  ANDROID_CLUSTER_CELL_PX,
  IOS_CLUSTER_CELL_PX,
  MAP_LABEL_COLLISION_V2,
  MAP_LABEL_LAYOUT_V3,
  MAP_FULL_SPRITES_V1,
  MAP_MARKER_PIPELINE_OPT_V1,
  MAP_IOS_STABLE_MARKERS_V1,
  MAP_IOS_STRICT_SAFE_RENDERER_ENABLED,
  MAP_IOS_POOL_RENDERER_ENABLED,
  MAP_IOS_EMERGENCY_CLUSTER_ONLY_ENABLED,
  MAP_IOS_CRASH_HARDENING_LOGS_ENABLED,
} from "../../lib/constants/discover";
import { normalizeDiscoverMapLabelPolicy } from "../../lib/maps/labelSelection";
import { CLUSTER_ICON_SOURCES, ClusterCountKey } from "../../lib/maps/clusterIcons";
import { FILTER_CLUSTER_ICON_SOURCES } from "../../lib/maps/clusterFilterIcons";
import { STACKED_ICON_SOURCES } from "../../lib/maps/stackedIcons";
import {
  BADGED_TITLE_HEIGHT,
  BADGED_TITLE_WIDTH,
  BASE_ANCHOR_X,
  BASE_ANCHOR_Y,
  CLUSTER_ZOOM_BUCKET_SIZE,
  CLUSTER_CULL_RELEASE_DELAY_MS,
  CLUSTER_PRESS_TARGET_MARGIN_ZOOM,
  CLUSTER_PRESS_ZOOM_STEP,
  CLUSTER_REDRAW_INTERACTION_ENABLED,
  FULL_SPRITE_TITLE_HEIGHT,
  FULL_SPRITE_TITLE_MIN_WIDTH,
  FULL_SPRITE_TITLE_OFFSET_Y,
  GOOGLE_MAP_STYLE,
  MARKER_TITLE_OFFSET_Y,
  MULTI_ICON,
  SINGLE_LAYER_ENTER_ZOOM_OFFSET,
  IOS_SINGLE_LAYER_MAX_MARKERS,
  IOS_STRICT_SAFE_POOL_SIZE,
  IOS_SINGLE_LAYER_STAGED_INITIAL_MARKERS,
  IOS_SINGLE_LAYER_STAGED_BATCH_MARKERS,
  IOS_STRICT_SAFE_STAGED_INITIAL_MARKERS,
  IOS_STRICT_SAFE_STAGED_BATCH_MARKERS,
  IOS_DISPLAY_MODE_ENTRY_HYSTERESIS_ZOOM,
  IOS_DISPLAY_MODE_EXIT_HYSTERESIS_ZOOM,
  IOS_DISPLAY_MODE_SWITCH_COOLDOWN_MS,
  STACKED_CENTER_DURATION_MS,
  STACKED_OPEN_FALLBACK_MS,
  USER_MARKER_COLOR,
  USER_MARKER_ID,
  VIEWPORT_PADDING_RATIO,
} from "./map/constants";
import type {
  RenderMarker,
  SingleLayerMarkerGroup,
} from "./map/types";
import { useClusteredFeatures } from "./map/hooks/useClusteredFeatures";
import { useSingleLayerDerived } from "./map/hooks/useSingleLayerDerived";
import { useInlineLabelEngine } from "./map/hooks/useInlineLabelEngine";
import { useFullSpriteOverlay } from "./map/hooks/useFullSpriteOverlay";
import { useStackedTooltip } from "./map/hooks/useStackedTooltip";
import { buildResolvedMarkerVisuals } from "./map/pipelines/markerVisualPipeline";
import {
  type IOSDisplayMode,
  resolveIOSDisplayModeRequest,
  shouldCommitIOSDisplayModeSwitch,
} from "./map/pipelines/iosDisplayMode";
import {
  buildIOSMarkerPool,
  createIOSMarkerPoolState,
} from "./map/pipelines/iosMarkerPool";
import { FullSpriteOverlayLayer } from "./map/layers/FullSpriteOverlayLayer";
import { InlineLabelLayer } from "./map/layers/InlineLabelLayer";
import { MarkerLayer } from "./map/layers/MarkerLayer";
import { StackedTooltipLayer } from "./map/layers/StackedTooltipLayer";

/**
 * DiscoverMap: Natívna Discover mapa s marker clusteringom, kamerou a callbackmi na výber podniku.
 *
 * Prečo: Komplexnú mapovú logiku drží v jednom mieste, aby bola interakcia plynulá aj pri veľa bodoch.
 */
function DiscoverMap({
  cameraRef,
  filteredMarkers,
  userCoord,
  hasActiveFilter,
  onCameraChanged,
  mapCenter,
  mapZoom,
  cityCenter,
  onMarkerPress,
  initialCamera,
  labelPolicy,
  markerRenderPolicy,
}: DiscoverMapProps) {
  const fallbackCenter = mapCenter ?? cityCenter ?? DEFAULT_CITY_CENTER;
  const fallbackZoom = mapZoom ?? DEFAULT_CAMERA_ZOOM;

  const initialRegionRef = useRef<Region | null>(null);
  if (!initialRegionRef.current) {
    initialRegionRef.current = zoomToRegion(fallbackCenter, fallbackZoom);
  }

  const initialRegion = useMemo(() => {
    if (initialCamera) {
      return zoomToRegion(initialCamera.center, initialCamera.zoom);
    }
    return initialRegionRef.current!;
  }, [initialCamera]);

  const [renderCamera, setRenderCamera] = useState<{
    center: [number, number];
    zoom: number;
  }>(() => ({
    center: [initialRegion.longitude, initialRegion.latitude],
    zoom: regionToZoom(initialRegion),
  }));

  const applyRenderCamera = useCallback((center: [number, number], zoom: number) => {
    const normalizedCenter = normalizeCenter(center);
    setRenderCamera((prev) => {
      const delta = Math.hypot(
        normalizedCenter[0] - prev.center[0],
        normalizedCenter[1] - prev.center[1]
      );
      if (delta < 0.000001 && Math.abs(zoom - prev.zoom) < 0.0001) {
        return prev;
      }
      return { center: normalizedCenter, zoom };
    });
  }, []);

  const cameraCenter = renderCamera.center;
  const zoom = renderCamera.zoom;
  const cameraCenterRef = useRef(cameraCenter);
  const zoomRef = useRef(zoom);
  const [suppressClusterViewportCull, setSuppressClusterViewportCull] = useState(false);
  const suppressClusterCullReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    cameraCenterRef.current = cameraCenter;
  }, [cameraCenter]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const setSuppressClusterViewportCullSafe = useCallback((nextValue: boolean) => {
    setSuppressClusterViewportCull((previous) =>
      previous === nextValue ? previous : nextValue
    );
  }, []);

  const clearSuppressClusterCullRelease = useCallback(() => {
    if (suppressClusterCullReleaseTimeoutRef.current) {
      clearTimeout(suppressClusterCullReleaseTimeoutRef.current);
      suppressClusterCullReleaseTimeoutRef.current = null;
    }
  }, []);

  const markClusterInteractionActive = useCallback(() => {
    clearSuppressClusterCullRelease();
    setSuppressClusterViewportCullSafe(true);
  }, [clearSuppressClusterCullRelease, setSuppressClusterViewportCullSafe]);

  const scheduleClusterInteractionRelease = useCallback(() => {
    clearSuppressClusterCullRelease();
    suppressClusterCullReleaseTimeoutRef.current = setTimeout(() => {
      suppressClusterCullReleaseTimeoutRef.current = null;
      setSuppressClusterViewportCullSafe(false);
    }, CLUSTER_CULL_RELEASE_DELAY_MS);
  }, [clearSuppressClusterCullRelease, setSuppressClusterViewportCullSafe]);

  const singleLayerMarkers = useMemo<SingleLayerMarkerGroup[]>(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        coordinate: { latitude: number; longitude: number };
        items: DiscoverMapMarker[];
      }
    >();

    filteredMarkers.forEach((marker) => {
      const lat = marker.coord?.lat;
      const lng = marker.coord?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const fallbackKey = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
      const key = marker.groupId ?? fallbackKey;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          id: key,
          coordinate: { latitude: lat, longitude: lng },
          items: [marker],
        });
        return;
      }

      existing.items.push(marker);
    });

    return Array.from(grouped.values());
  }, [filteredMarkers]);

  const effectiveZoomRaw = Platform.OS === "ios" ? zoom + IOS_ZOOM_OFFSET : zoom;
  const effectiveZoom = Math.max(0, Math.min(20, effectiveZoomRaw));
  const superclusterZoom = Math.max(0, Math.min(20, Math.floor(effectiveZoom)));
  const forceClusterZoom =
    Platform.OS === "ios" ? IOS_FORCE_CLUSTER_ZOOM : FORCE_CLUSTER_ZOOM;
  const singleModeZoom =
    Platform.OS === "ios" ? IOS_SINGLE_MODE_ZOOM : SINGLE_MODE_ZOOM;
  const singleLayerEnterZoom = Math.max(0, singleModeZoom + SINGLE_LAYER_ENTER_ZOOM_OFFSET);
  const isIOS = Platform.OS === "ios";
  const isIOSPoolRenderer =
    isIOS && (MAP_IOS_POOL_RENDERER_ENABLED || MAP_IOS_STRICT_SAFE_RENDERER_ENABLED);
  const mapMarkerPipelineOptV1 = MAP_MARKER_PIPELINE_OPT_V1;
  const isIOSStrictSafeRenderer = isIOSPoolRenderer;
  const isIOSEmergencyClusterOnly =
    isIOS && MAP_IOS_EMERGENCY_CLUSTER_ONLY_ENABLED;
  const isIOSCrashHardeningLogsEnabled =
    isIOS && MAP_IOS_CRASH_HARDENING_LOGS_ENABLED;
  const isIOSStableMarkersMode =
    isIOS && MAP_IOS_STABLE_MARKERS_V1 && !isIOSStrictSafeRenderer;
  const fullSpritesEnabled =
    markerRenderPolicy?.fullSpritesEnabled ?? MAP_FULL_SPRITES_V1;
  const labelLayoutV3Enabled = MAP_LABEL_LAYOUT_V3;
  const fullSpriteTextLayersEnabled = fullSpritesEnabled;
  const useInlineLabelOverlay =
    labelLayoutV3Enabled &&
    !fullSpriteTextLayersEnabled &&
    !isIOSStrictSafeRenderer;
  const labelsEnabledForCurrentMode = !isIOSStrictSafeRenderer;
  const labelEngineBaseSize = useMemo(
    () =>
      fullSpriteTextLayersEnabled
        ? {
            width: FULL_SPRITE_TITLE_MIN_WIDTH,
            height: FULL_SPRITE_TITLE_HEIGHT,
            offsetY: FULL_SPRITE_TITLE_OFFSET_Y,
          }
        : {
            width: BADGED_TITLE_WIDTH,
            height: BADGED_TITLE_HEIGHT,
            offsetY: MARKER_TITLE_OFFSET_Y,
          },
    [fullSpriteTextLayersEnabled]
  );
  const fullSpriteFadeEnabled = false;
  const useOverlayFullSpritesBase =
    fullSpriteTextLayersEnabled &&
    !isIOSStableMarkersMode &&
    !isIOSStrictSafeRenderer;
  const allowRemoteFullSpriteOverlay = !isIOSStrictSafeRenderer;
  const resolvedLabelPolicy = useMemo(
    () => normalizeDiscoverMapLabelPolicy(labelPolicy),
    [labelPolicy]
  );
  const mapLabelCollisionV2Enabled =
    MAP_LABEL_COLLISION_V2 && !isIOSStrictSafeRenderer;
  const clusterRadiusPx = isIOS
    ? Math.max(36, Math.round(IOS_CLUSTER_CELL_PX * 0.58))
    : Math.max(40, Math.round(ANDROID_CLUSTER_CELL_PX * 0.58));
  const stableClusterZoom = Math.max(
    0,
    Math.min(
      forceClusterZoom,
      Math.floor(superclusterZoom / CLUSTER_ZOOM_BUCKET_SIZE) *
        CLUSTER_ZOOM_BUCKET_SIZE
    )
  );

  const liveShowSingleLayer =
    !isIOSEmergencyClusterOnly && effectiveZoom >= singleLayerEnterZoom;
  const [iosDisplayMode, setIOSDisplayMode] = useState<IOSDisplayMode>(() =>
    liveShowSingleLayer ? "single" : "cluster"
  );
  const iosDisplayModeRef = useRef<IOSDisplayMode>(iosDisplayMode);
  useEffect(() => {
    iosDisplayModeRef.current = iosDisplayMode;
  }, [iosDisplayMode]);
  useEffect(() => {
    if (!isIOSStrictSafeRenderer || !isIOSEmergencyClusterOnly) {
      return;
    }
    if (iosDisplayModeRef.current === "cluster") {
      return;
    }
    iosDisplayModeRef.current = "cluster";
    setIOSDisplayMode("cluster");
  }, [isIOSEmergencyClusterOnly, isIOSStrictSafeRenderer]);
  const iosDisplayModeLastSwitchAtMsRef = useRef<number | null>(null);
  const renderMarkersRef = useRef<RenderMarker[]>([]);
  const iosMarkerPoolStateRef = useRef(
    createIOSMarkerPoolState(IOS_STRICT_SAFE_POOL_SIZE)
  );
  const resolveRequestedIOSDisplayMode = useCallback(
    (nextZoom: number, currentMode: IOSDisplayMode) => {
      if (isIOSEmergencyClusterOnly) {
        return "cluster";
      }
      return resolveIOSDisplayModeRequest({
        zoom: nextZoom,
        singleLayerEnterZoom,
        currentMode,
        entryHysteresisZoom: IOS_DISPLAY_MODE_ENTRY_HYSTERESIS_ZOOM,
        exitHysteresisZoom: IOS_DISPLAY_MODE_EXIT_HYSTERESIS_ZOOM,
      });
    },
    [isIOSEmergencyClusterOnly, singleLayerEnterZoom]
  );
  const activeDisplayMode = isIOSStrictSafeRenderer
    ? isIOSEmergencyClusterOnly
      ? "cluster"
      : iosDisplayMode
    : liveShowSingleLayer
      ? "single"
      : "cluster";
  const showSingleLayer = activeDisplayMode === "single";
  const showClusterLayer = activeDisplayMode === "cluster";
  const useOverlayFullSprites = useOverlayFullSpritesBase;

  // Two-phase cluster→single transition: delay single layer by one RAF frame so iOS
  // MapKit can process cluster marker removals before receiving up to 80 new markers.
  const singleLayerPhaseRafRef = useRef<number | null>(null);
  const singleLayerPhaseOffRafRef = useRef<number | null>(null);
  const [singleLayerPhaseReady, setSingleLayerPhaseReady] = useState(showSingleLayer);
  useEffect(() => {
    if (singleLayerPhaseRafRef.current !== null) {
      cancelAnimationFrame(singleLayerPhaseRafRef.current);
      singleLayerPhaseRafRef.current = null;
    }
    if (singleLayerPhaseOffRafRef.current !== null) {
      cancelAnimationFrame(singleLayerPhaseOffRafRef.current);
      singleLayerPhaseOffRafRef.current = null;
    }
    if (!showSingleLayer) {
      if (isIOSStrictSafeRenderer) {
        singleLayerPhaseRafRef.current = requestAnimationFrame(() => {
          singleLayerPhaseRafRef.current = null;
          singleLayerPhaseOffRafRef.current = requestAnimationFrame(() => {
            singleLayerPhaseOffRafRef.current = null;
            setSingleLayerPhaseReady(false);
          });
        });
      } else {
        setSingleLayerPhaseReady(false);
      }
      return;
    }
    singleLayerPhaseRafRef.current = requestAnimationFrame(() => {
      singleLayerPhaseRafRef.current = null;
      setSingleLayerPhaseReady(true);
    });
    return () => {
      if (singleLayerPhaseRafRef.current !== null) {
        cancelAnimationFrame(singleLayerPhaseRafRef.current);
        singleLayerPhaseRafRef.current = null;
      }
      if (singleLayerPhaseOffRafRef.current !== null) {
        cancelAnimationFrame(singleLayerPhaseOffRafRef.current);
        singleLayerPhaseOffRafRef.current = null;
      }
    };
  }, [isIOSStrictSafeRenderer, showSingleLayer]);
  const effectiveShowSingleLayer = showSingleLayer && singleLayerPhaseReady;

  // Two-phase single→cluster transition: delay cluster layer by one RAF frame so iOS
  // MapKit can process single marker removals before receiving new cluster markers.
  const clusterLayerPhaseRafRef = useRef<number | null>(null);
  const clusterLayerPhaseOffRafRef = useRef<number | null>(null);
  const [clusterLayerPhaseReady, setClusterLayerPhaseReady] = useState(showClusterLayer);
  useEffect(() => {
    if (clusterLayerPhaseRafRef.current !== null) {
      cancelAnimationFrame(clusterLayerPhaseRafRef.current);
      clusterLayerPhaseRafRef.current = null;
    }
    if (clusterLayerPhaseOffRafRef.current !== null) {
      cancelAnimationFrame(clusterLayerPhaseOffRafRef.current);
      clusterLayerPhaseOffRafRef.current = null;
    }
    if (!showClusterLayer) {
      if (isIOSStrictSafeRenderer) {
        clusterLayerPhaseRafRef.current = requestAnimationFrame(() => {
          clusterLayerPhaseRafRef.current = null;
          clusterLayerPhaseOffRafRef.current = requestAnimationFrame(() => {
            clusterLayerPhaseOffRafRef.current = null;
            setClusterLayerPhaseReady(false);
          });
        });
      } else {
        setClusterLayerPhaseReady(false);
      }
      return;
    }
    clusterLayerPhaseRafRef.current = requestAnimationFrame(() => {
      clusterLayerPhaseRafRef.current = null;
      setClusterLayerPhaseReady(true);
    });
    return () => {
      if (clusterLayerPhaseRafRef.current !== null) {
        cancelAnimationFrame(clusterLayerPhaseRafRef.current);
        clusterLayerPhaseRafRef.current = null;
      }
      if (clusterLayerPhaseOffRafRef.current !== null) {
        cancelAnimationFrame(clusterLayerPhaseOffRafRef.current);
        clusterLayerPhaseOffRafRef.current = null;
      }
    };
  }, [isIOSStrictSafeRenderer, showClusterLayer]);
  const effectiveShowClusterLayer = showClusterLayer && clusterLayerPhaseReady;
  const iosStrictSafePoolSize = IOS_STRICT_SAFE_POOL_SIZE;
  const iosSingleLayerMaxMarkers = isIOSStrictSafeRenderer
    ? iosStrictSafePoolSize
    : IOS_SINGLE_LAYER_MAX_MARKERS;
  const iosSingleLayerStagedInitialMarkers = isIOSStrictSafeRenderer
    ? IOS_STRICT_SAFE_STAGED_INITIAL_MARKERS
    : IOS_SINGLE_LAYER_STAGED_INITIAL_MARKERS;
  const iosSingleLayerStagedBatchMarkers = isIOSStrictSafeRenderer
    ? IOS_STRICT_SAFE_STAGED_BATCH_MARKERS
    : IOS_SINGLE_LAYER_STAGED_BATCH_MARKERS;
  const singleLayerStagingRafRef = useRef<number | null>(null);
  const [iosSingleLayerRenderCap, setIOSSingleLayerRenderCap] = useState(
    iosSingleLayerMaxMarkers
  );
  const previousShowSingleLayerRef = useRef(showSingleLayer);

  useEffect(() => {
    return () => {
      if (singleLayerStagingRafRef.current !== null) {
        cancelAnimationFrame(singleLayerStagingRafRef.current);
        singleLayerStagingRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isIOS) {
      return;
    }

    const wasShowingSingleLayer = previousShowSingleLayerRef.current;
    previousShowSingleLayerRef.current = showSingleLayer;

    if (!showSingleLayer) {
      if (singleLayerStagingRafRef.current !== null) {
        cancelAnimationFrame(singleLayerStagingRafRef.current);
        singleLayerStagingRafRef.current = null;
      }
      if (iosSingleLayerRenderCap !== iosSingleLayerMaxMarkers) {
        setIOSSingleLayerRenderCap(iosSingleLayerMaxMarkers);
      }
      return;
    }

    if (!wasShowingSingleLayer && showSingleLayer) {
      setIOSSingleLayerRenderCap(iosSingleLayerStagedInitialMarkers);
    }
  }, [
    iosSingleLayerMaxMarkers,
    iosSingleLayerStagedInitialMarkers,
    isIOS,
    iosSingleLayerRenderCap,
    showSingleLayer,
  ]);

  useEffect(() => {
    if (!isIOS || !effectiveShowSingleLayer) {
      return;
    }
    if (iosSingleLayerRenderCap >= iosSingleLayerMaxMarkers) {
      return;
    }

    if (singleLayerStagingRafRef.current !== null) {
      cancelAnimationFrame(singleLayerStagingRafRef.current);
      singleLayerStagingRafRef.current = null;
    }

    singleLayerStagingRafRef.current = requestAnimationFrame(() => {
      singleLayerStagingRafRef.current = null;
      setIOSSingleLayerRenderCap((previous) =>
        Math.min(
          iosSingleLayerMaxMarkers,
          previous + iosSingleLayerStagedBatchMarkers
        )
      );
    });

    return () => {
      if (singleLayerStagingRafRef.current !== null) {
        cancelAnimationFrame(singleLayerStagingRafRef.current);
        singleLayerStagingRafRef.current = null;
      }
    };
  }, [
    effectiveShowSingleLayer,
    iosSingleLayerMaxMarkers,
    iosSingleLayerRenderCap,
    iosSingleLayerStagedBatchMarkers,
    isIOS,
  ]);

  const commitIOSDisplayModeIfNeeded = useCallback(
    (nextZoom: number, trigger: "native-sync" | "region-complete") => {
      if (!isIOSStrictSafeRenderer) {
        return;
      }

      const currentMode = iosDisplayModeRef.current;
      const requestedMode = resolveRequestedIOSDisplayMode(nextZoom, currentMode);
      const nowMs = Date.now();
      const switchDecision = shouldCommitIOSDisplayModeSwitch({
        nowMs,
        lastSwitchAtMs: iosDisplayModeLastSwitchAtMsRef.current,
        currentMode,
        requestedMode,
        cooldownMs: IOS_DISPLAY_MODE_SWITCH_COOLDOWN_MS,
      });

      if (isIOSCrashHardeningLogsEnabled) {
        const realMarkerCount = renderMarkersRef.current.length;
        console.debug(
          `[map_ios_crash_hardening] switch-check trigger=${trigger} zoom=${nextZoom.toFixed(
            3
          )} current=${currentMode} requested=${requestedMode} decision=${
            switchDecision.reason
          } elapsedMs=${switchDecision.elapsedMs} cap=${iosSingleLayerRenderCap} realMarkers=${realMarkerCount} pooledSlots=${iosStrictSafePoolSize}`
        );
      }

      if (!switchDecision.commit) {
        return;
      }

      const markerCountBefore = renderMarkersRef.current.length;
      iosDisplayModeLastSwitchAtMsRef.current = nowMs;
      iosDisplayModeRef.current = requestedMode;
      setIOSDisplayMode(requestedMode);

      if (isIOSCrashHardeningLogsEnabled) {
        requestAnimationFrame(() => {
          const markerCountAfter = renderMarkersRef.current.length;
          console.debug(
            `[map_ios_crash_hardening] switch-commit trigger=${trigger} from=${currentMode} to=${requestedMode} zoom=${nextZoom.toFixed(
              3
            )} markersBefore=${markerCountBefore} markersAfter=${markerCountAfter} cap=${iosSingleLayerRenderCap} pooledSlots=${iosStrictSafePoolSize}`
          );
        });
      }
    },
    [
      iosStrictSafePoolSize,
      iosSingleLayerRenderCap,
      isIOSCrashHardeningLogsEnabled,
      isIOSStrictSafeRenderer,
      resolveRequestedIOSDisplayMode,
    ]
  );

  const shouldCullClustersByViewport =
    isIOSStrictSafeRenderer && effectiveShowClusterLayer
      ? false
      : !suppressClusterViewportCull;
  const clusterTracksViewChangesEnabled =
    CLUSTER_REDRAW_INTERACTION_ENABLED && suppressClusterViewportCull;

  const clusteredFeatures = useClusteredFeatures({
    showClusterLayer: effectiveShowClusterLayer,
    filteredMarkers,
    cameraCenter,
    zoom,
    shouldCullClustersByViewport,
    mapMarkerPipelineOptV1,
    clusterRadiusPx,
    forceClusterZoom,
    stableClusterZoom,
    isIOS,
  });

  const singleLayerDerived = useSingleLayerDerived({
    singleLayerMarkers,
    fullSpriteTextLayersEnabled,
    mapMarkerPipelineOptV1,
  });
  const labelCandidates = singleLayerDerived.labelCandidates;
  const localFullSpriteIdSet = singleLayerDerived.localFullSpriteIdSet;
  const singleMarkerById = singleLayerDerived.singleMarkerById;

  const renderMarkers = useMemo<RenderMarker[]>(() => {
    const markers: RenderMarker[] = [];

    if (effectiveShowClusterLayer) {
      clusteredFeatures.forEach((feature) => {
        const clusterCount = Math.min(
          99,
          Math.max(0, Math.floor(Number(feature.count ?? 0)))
        );
        const clusterIconSet = hasActiveFilter
          ? FILTER_CLUSTER_ICON_SOURCES
          : CLUSTER_ICON_SOURCES;
        const clusterIcon =
          clusterIconSet[String(clusterCount) as ClusterCountKey] ?? MULTI_ICON;

        markers.push({
          key: `cluster-layer:${feature.id}`,
          id: feature.id,
          coordinate: feature.coordinates,
          image: clusterIcon,
          category: "Multi",
          anchor: {
            x: BASE_ANCHOR_X,
            y: BASE_ANCHOR_Y,
          },
          zIndex: 2,
          isCluster: true,
          focusCoordinate: feature.focusCoordinates ?? feature.coordinates,
        });
      });
    }

    if (effectiveShowSingleLayer) {
      let singleLayerBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null = null;
      if (isIOS) {
        const curCenter = cameraCenterRef.current;
        const curZoom = zoomRef.current;
        const vp = zoomToRegion(curCenter, curZoom);
        const halfLng = Math.min(179.999, Math.max(0.0001, Math.abs(vp.longitudeDelta) / 2));
        const halfLat = Math.min(85, Math.max(0.0001, Math.abs(vp.latitudeDelta) / 2));
        const pHalfLng = Math.min(179.999, halfLng * (1 + VIEWPORT_PADDING_RATIO));
        const pHalfLat = Math.min(85, halfLat * (1 + VIEWPORT_PADDING_RATIO));
        singleLayerBounds = {
          minLng: Math.max(-180, vp.longitude - pHalfLng),
          maxLng: Math.min(180, vp.longitude + pHalfLng),
          minLat: Math.max(-85, vp.latitude - pHalfLat),
          maxLat: Math.min(85, vp.latitude + pHalfLat),
        };
      }

      singleLayerMarkers.forEach((group) => {
        if (singleLayerBounds) {
          const lat = group.coordinate.latitude;
          const lng = group.coordinate.longitude;
          if (lat < singleLayerBounds.minLat || lat > singleLayerBounds.maxLat ||
              lng < singleLayerBounds.minLng || lng > singleLayerBounds.maxLng) {
            return;
          }
        }

        if (group.items.length > 1) {
          const stackedItems =
            mapMarkerPipelineOptV1
              ? singleLayerDerived.sortedStackedItemsByGroupId.get(group.id) ??
                [...group.items].sort((a, b) =>
                  (a.title ?? a.id).localeCompare(b.title ?? b.id)
                )
              : [...group.items].sort((a, b) =>
                  (a.title ?? a.id).localeCompare(b.title ?? b.id)
                );
          const stackedCount = Math.min(6, Math.max(2, stackedItems.length));
          const stackedIcon =
            STACKED_ICON_SOURCES[String(stackedCount) as ClusterCountKey] ??
            STACKED_ICON_SOURCES["6"] ??
            STACKED_ICON_SOURCES["2"];

          markers.push({
            key: `stacked-layer:${group.id}`,
            id: `stacked:${group.id}`,
            coordinate: group.coordinate,
            image: stackedIcon,
            category: "Multi",
            anchor: {
              x: BASE_ANCHOR_X,
              y: BASE_ANCHOR_Y,
            },
            zIndex: 3,
            isCluster: false,
            isStacked: true,
            stackedItems,
            focusCoordinate: group.coordinate,
          });
          return;
        }

        const marker = group.items[0];
        if (!marker) {
          return;
        }
        markers.push({
          key: `single-layer:${marker.id}`,
          id: marker.id,
          coordinate: group.coordinate,
          category: marker.category,
          markerData: marker,
          zIndex: 1,
          isCluster: false,
          isStacked: false,
          focusCoordinate: group.coordinate,
        });
      });
    }

    const shouldUseStagedCap = isIOS && effectiveShowSingleLayer;
    const maxRenderableMarkers = shouldUseStagedCap
      ? Math.min(
          iosSingleLayerMaxMarkers,
          Math.max(iosSingleLayerStagedInitialMarkers, iosSingleLayerRenderCap)
        )
      : iosSingleLayerMaxMarkers;

    if (isIOS && markers.length > maxRenderableMarkers) {
      const clat = cameraCenterRef.current[1];
      const clng = cameraCenterRef.current[0];
      markers.sort((a, b) => {
        const da = (a.coordinate.latitude - clat) ** 2 + (a.coordinate.longitude - clng) ** 2;
        const db = (b.coordinate.latitude - clat) ** 2 + (b.coordinate.longitude - clng) ** 2;
        return da - db;
      });
      markers.length = maxRenderableMarkers;
    }

    const seenKeys = new Set<string>();
    return markers.filter((marker) => {
      if (!marker.key) {
        return false;
      }
      if (seenKeys.has(marker.key)) {
        return false;
      }
      seenKeys.add(marker.key);
      return true;
    });
  }, [
    clusterLayerPhaseReady,
    clusteredFeatures,
    hasActiveFilter,
    iosSingleLayerMaxMarkers,
    iosSingleLayerRenderCap,
    iosSingleLayerStagedInitialMarkers,
    isIOS,
    mapMarkerPipelineOptV1,
    singleLayerDerived.sortedStackedItemsByGroupId,
    singleLayerPhaseReady,
    singleLayerMarkers,
  ]);

  useEffect(() => {
    if (!isIOSStrictSafeRenderer) {
      iosMarkerPoolStateRef.current = createIOSMarkerPoolState(iosStrictSafePoolSize);
      return;
    }
    const currentPool = iosMarkerPoolStateRef.current;
    if (currentPool.markerIdBySlot.length !== iosStrictSafePoolSize) {
      iosMarkerPoolStateRef.current = createIOSMarkerPoolState(iosStrictSafePoolSize);
    }
  }, [iosStrictSafePoolSize, isIOSStrictSafeRenderer]);

  const iosMarkerPoolResult = useMemo(() => {
    if (!isIOSStrictSafeRenderer) {
      return null;
    }
    return buildIOSMarkerPool({
      markers: renderMarkers,
      poolSize: iosStrictSafePoolSize,
      state: iosMarkerPoolStateRef.current,
    });
  }, [iosStrictSafePoolSize, isIOSStrictSafeRenderer, renderMarkers]);

  const markerLayerMarkers = iosMarkerPoolResult?.pooledMarkers ?? renderMarkers;
  const markerLayerVisibleCount = iosMarkerPoolResult?.visibleCount ?? renderMarkers.length;
  useEffect(() => {
    if (!isIOSCrashHardeningLogsEnabled) {
      return;
    }
    console.debug(
      `[map_ios_crash_hardening] pool-state mode=${activeDisplayMode} zoom=${effectiveZoom.toFixed(
        3
      )} realMarkers=${renderMarkers.length} layerMarkers=${markerLayerMarkers.length} pooledVisible=${markerLayerVisibleCount} pooledSlots=${iosStrictSafePoolSize} cap=${iosSingleLayerRenderCap}`
    );
  }, [
    activeDisplayMode,
    effectiveZoom,
    iosSingleLayerRenderCap,
    iosStrictSafePoolSize,
    isIOSCrashHardeningLogsEnabled,
    markerLayerMarkers.length,
    markerLayerVisibleCount,
    renderMarkers.length,
  ]);

  renderMarkersRef.current = renderMarkers;

  const [mapLayoutSize, setMapLayoutSize] = useState({ width: 0, height: 0 });

  const {
    selectedStackedMarkerId,
    setSelectedStackedMarkerId,
    selectedStackedMarker,
    tooltipItems,
    stackedTooltipLayout,
    pendingStackedOpenRef,
    clearPendingStackedOpen,
    closeStackedTooltip,
    updateStackedTooltipPosition,
  } = useStackedTooltip({
    cameraRef,
    renderMarkers,
    mapLayoutSize,
  });

  const selectedStackedMarkerIdRef = useRef(selectedStackedMarkerId);
  selectedStackedMarkerIdRef.current = selectedStackedMarkerId;

  const {
    inlineLabelIds,
    inlineLabelPlacements,
    recomputeInlineLabels,
    scheduleGestureLabelRecompute,
    clearPendingGestureLabelRecompute,
    forceInlineLabelIdsRef,
  } = useInlineLabelEngine({
    cameraRef,
    cameraCenter,
    zoom,
    showSingleLayer: labelsEnabledForCurrentMode && effectiveShowSingleLayer,
    singleLayerEnterZoom,
    mapLayoutSize,
    labelCandidates,
    labelEngineBaseSize,
    mapLabelCollisionV2Enabled,
    labelLayoutV3Enabled,
    resolvedLabelPolicy,
    disableNativeProjection: isIOSStrictSafeRenderer,
    disableGestureRecompute: isIOSStrictSafeRenderer,
    useInlineLabelOverlay,
    fullSpriteTextLayersEnabled,
    isIOSStableMarkersMode,
    localFullSpriteIdSet,
  });

  const {
    effectiveFullSpriteOpacityById,
    inlineTextRenderedByMarkerIdSet,
    failedRemoteSpriteKeySet,
  } = useFullSpriteOverlay({
    inlineLabelIds,
    localFullSpriteIdSet,
    singleMarkerById,
    fullSpriteTextLayersEnabled,
    showSingleLayer: effectiveShowSingleLayer,
    isIOSStableMarkersMode,
    useOverlayFullSprites,
    allowRemoteFullSpriteOverlay,
    fullSpriteFadeEnabled,
    filteredMarkersLength: filteredMarkers.length,
  });

  const suppressNextMapPressRef = useRef(false);
  const gestureRef = useRef(false);
  const didSyncInitialRegionRef = useRef(false);
  const gestureReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (gestureReleaseTimeoutRef.current) {
        clearTimeout(gestureReleaseTimeoutRef.current);
      }
      clearSuppressClusterCullRelease();
    };
  }, [clearSuppressClusterCullRelease]);

  useEffect(() => {
    const nextCenter: [number, number] = [
      initialRegion.longitude,
      initialRegion.latitude,
    ];
    const nextZoom = regionToZoom(initialRegion);
    applyRenderCamera(nextCenter, nextZoom);
  }, [initialRegion, applyRenderCamera]);

  const syncRenderCameraFromNative = useCallback(async () => {
    const mapView = cameraRef.current;
    if (!mapView) {
      return;
    }

    try {
      const nativeCamera = await mapView.getCamera();
      const latFromCamera = nativeCamera?.center?.latitude;
      const lngFromCamera = nativeCamera?.center?.longitude;
      const zoomFromCamera =
        typeof nativeCamera?.zoom === "number" && Number.isFinite(nativeCamera.zoom)
          ? nativeCamera.zoom
          : NaN;

      let nextCenter: [number, number] | null =
        Number.isFinite(latFromCamera) && Number.isFinite(lngFromCamera)
          ? [lngFromCamera, latFromCamera]
          : null;
      let nextZoom = zoomFromCamera;

      if (!nextCenter || !Number.isFinite(nextZoom)) {
        try {
          const bounds = await mapView.getMapBoundaries();
          const northEast = bounds?.northEast;
          const southWest = bounds?.southWest;
          const neLat = northEast?.latitude;
          const neLng = northEast?.longitude;
          const swLat = southWest?.latitude;
          const swLng = southWest?.longitude;

          if (
            Number.isFinite(neLat) &&
            Number.isFinite(neLng) &&
            Number.isFinite(swLat) &&
            Number.isFinite(swLng)
          ) {
            const rawLngDelta = neLng - swLng;
            let longitudeDelta = Math.abs(rawLngDelta);
            if (longitudeDelta > 180) {
              longitudeDelta = 360 - longitudeDelta;
            }

            let centerLng = (neLng + swLng) / 2;
            if (Math.abs(rawLngDelta) > 180) {
              const wrappedNeLng = neLng < 0 ? neLng + 360 : neLng;
              const wrappedSwLng = swLng < 0 ? swLng + 360 : swLng;
              const wrappedCenter = (wrappedNeLng + wrappedSwLng) / 2;
              centerLng = wrappedCenter > 180 ? wrappedCenter - 360 : wrappedCenter;
            }

            const centerLat = (neLat + swLat) / 2;
            nextCenter = [centerLng, centerLat];
            nextZoom = regionToZoom({ longitudeDelta });
          }
        } catch {
        }
      }

      if (!nextCenter) {
        return;
      }
      if (!Number.isFinite(nextZoom)) {
        nextZoom = fallbackZoom;
      }

      const normalizedCenter = normalizeCenter(nextCenter);
      applyRenderCamera(normalizedCenter, nextZoom);
      onCameraChanged(normalizedCenter, nextZoom, false);
      commitIOSDisplayModeIfNeeded(nextZoom, "native-sync");
    } catch {
    }
  }, [
    applyRenderCamera,
    cameraRef,
    commitIOSDisplayModeIfNeeded,
    fallbackZoom,
    onCameraChanged,
  ]);

  const handleMapReady = useCallback(() => {
    void syncRenderCameraFromNative();
    recomputeInlineLabels(cameraCenterRef.current, zoomRef.current, "map-ready");
  }, [syncRenderCameraFromNative, recomputeInlineLabels]);

  const markGestureActive = useCallback(() => {
    gestureRef.current = true;
    if (gestureReleaseTimeoutRef.current) {
      clearTimeout(gestureReleaseTimeoutRef.current);
      gestureReleaseTimeoutRef.current = null;
    }
  }, []);

  const scheduleGestureRelease = useCallback(() => {
    if (gestureReleaseTimeoutRef.current) {
      clearTimeout(gestureReleaseTimeoutRef.current);
    }
    gestureReleaseTimeoutRef.current = setTimeout(() => {
      gestureRef.current = false;
      gestureReleaseTimeoutRef.current = null;
    }, 120);
  }, []);

  const handlePanDrag = useCallback(() => {
    markGestureActive();
    markClusterInteractionActive();
    if (selectedStackedMarkerIdRef.current || pendingStackedOpenRef.current) {
      closeStackedTooltip();
    }
  }, [
    closeStackedTooltip,
    markClusterInteractionActive,
    markGestureActive,
    pendingStackedOpenRef,
  ]);

  const handleRegionChange = useCallback(
    (region: Region) => {
      if (!isValidRegion(region)) {
        return;
      }
      markClusterInteractionActive();

      const nextCenter = normalizeCenter([region.longitude, region.latitude]);
      const nextZoom = regionToZoom(region);
      if (!isFiniteCoordinate(nextCenter[1], nextCenter[0]) || !Number.isFinite(nextZoom)) {
        return;
      }

      if (!didSyncInitialRegionRef.current) {
        didSyncInitialRegionRef.current = true;
        applyRenderCamera(nextCenter, nextZoom);
        onCameraChanged(nextCenter, nextZoom, false);
      }

      if (!gestureRef.current) {
        return;
      }
      if (!isIOSStrictSafeRenderer) {
        scheduleGestureLabelRecompute(nextCenter, nextZoom);
      }
      onCameraChanged(nextCenter, nextZoom, true);
    },
    [
      applyRenderCamera,
      isIOSStrictSafeRenderer,
      markClusterInteractionActive,
      onCameraChanged,
      scheduleGestureLabelRecompute,
    ]
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region, details?: { isGesture?: boolean }) => {
      if (!isValidRegion(region)) {
        scheduleGestureRelease();
        scheduleClusterInteractionRelease();
        return;
      }

      const isUserGesture = Boolean(details?.isGesture ?? gestureRef.current);
      const nextCenter = normalizeCenter([region.longitude, region.latitude]);
      const nextZoom = regionToZoom(region);
      if (!isFiniteCoordinate(nextCenter[1], nextCenter[0]) || !Number.isFinite(nextZoom)) {
        scheduleGestureRelease();
        scheduleClusterInteractionRelease();
        return;
      }

      applyRenderCamera(nextCenter, nextZoom);
      scheduleGestureRelease();
      scheduleClusterInteractionRelease();
      clearPendingGestureLabelRecompute();
      onCameraChanged(
        nextCenter,
        nextZoom,
        isUserGesture
      );
      commitIOSDisplayModeIfNeeded(nextZoom, "region-complete");

      const pendingStackedId = pendingStackedOpenRef.current?.id;
      if (pendingStackedId) {
        const pendingVisible = renderMarkersRef.current.some(
          (marker) => marker.isStacked && marker.id === pendingStackedId
        );
        clearPendingStackedOpen();
        if (pendingVisible) {
          setSelectedStackedMarkerId(pendingStackedId);
        }
      }

      if (selectedStackedMarker) {
        void updateStackedTooltipPosition(selectedStackedMarker);
      }
      recomputeInlineLabels(nextCenter, nextZoom, "region-complete");
    },
    [
      applyRenderCamera,
      commitIOSDisplayModeIfNeeded,
      clearPendingGestureLabelRecompute,
      clearPendingStackedOpen,
      onCameraChanged,
      recomputeInlineLabels,
      scheduleGestureRelease,
      scheduleClusterInteractionRelease,
      selectedStackedMarker,
      setSelectedStackedMarkerId,
      updateStackedTooltipPosition,
      pendingStackedOpenRef,
    ]
  );

  const handleMarkerPress = useCallback(
    (marker: RenderMarker) => {
      if (marker.id === USER_MARKER_ID) {
        return;
      }
      if (
        !isFiniteCoordinate(
          marker.focusCoordinate.latitude,
          marker.focusCoordinate.longitude
        )
      ) {
        return;
      }

      if (marker.isStacked) {
        suppressNextMapPressRef.current = true;
        const isSameOpen =
          selectedStackedMarkerIdRef.current === marker.id &&
          pendingStackedOpenRef.current === null;
        if (isSameOpen) {
          closeStackedTooltip();
          return;
        }

        closeStackedTooltip();

        const pendingId = marker.id;
        const openFallbackTimeout = setTimeout(() => {
          if (pendingStackedOpenRef.current?.id !== pendingId) {
            return;
          }
          clearPendingStackedOpen();
          setSelectedStackedMarkerId(pendingId);
        }, STACKED_OPEN_FALLBACK_MS);

        pendingStackedOpenRef.current = {
          id: pendingId,
          timeout: openFallbackTimeout,
        };

        const mapView = cameraRef.current;
        const focusLat = marker.focusCoordinate.latitude;
        const focusLng = marker.focusCoordinate.longitude;
        if (mapView) {
          void mapView
            .getCamera()
            .then((currentCamera) => {
              if (!currentCamera) {
                setMapCamera(cameraRef, {
                  center: [focusLng, focusLat],
                  zoom: zoomRef.current,
                  durationMs: STACKED_CENTER_DURATION_MS,
                });
                return;
              }
              mapView.animateCamera(
                {
                  ...currentCamera,
                  center: {
                    latitude: focusLat,
                    longitude: focusLng,
                  },
                },
                { duration: STACKED_CENTER_DURATION_MS }
              );
            })
            .catch(() => {
              setMapCamera(cameraRef, {
                center: [focusLng, focusLat],
                zoom: zoomRef.current,
                durationMs: STACKED_CENTER_DURATION_MS,
              });
            });
        } else {
          setMapCamera(cameraRef, {
            center: [focusLng, focusLat],
            zoom: zoomRef.current,
            durationMs: STACKED_CENTER_DURATION_MS,
          });
        }
        return;
      }

      closeStackedTooltip();

      if (marker.isCluster) {
        const targetZoom = Math.min(
          20,
          Math.max(
            zoomRef.current + CLUSTER_PRESS_ZOOM_STEP,
            singleLayerEnterZoom + CLUSTER_PRESS_TARGET_MARGIN_ZOOM
          )
        );
        if (isIOSCrashHardeningLogsEnabled) {
          const committedMode = iosDisplayModeRef.current;
          const requestedMode = isIOSStrictSafeRenderer
            ? resolveRequestedIOSDisplayMode(targetZoom, committedMode)
            : targetZoom >= singleLayerEnterZoom
              ? "single"
              : "cluster";
          console.debug(
            `[map_ios_crash_hardening] cluster-press targetZoom=${targetZoom.toFixed(
              3
            )} committedMode=${committedMode} requestedMode=${requestedMode}`
          );
        }

        setMapCamera(cameraRef, {
          center: [
            marker.focusCoordinate.longitude,
            marker.focusCoordinate.latitude,
          ],
          zoom: targetZoom,
          durationMs: 500,
        });
        return;
      }

      if (mapLabelCollisionV2Enabled) {
        forceInlineLabelIdsRef.current = new Set([marker.id]);
        recomputeInlineLabels(
          cameraCenterRef.current,
          zoomRef.current,
          "marker-press"
        );
      }

      onMarkerPress?.(marker.id);
    },
    [
      cameraRef,
      clearPendingStackedOpen,
      closeStackedTooltip,
      forceInlineLabelIdsRef,
      isIOSCrashHardeningLogsEnabled,
      isIOSStrictSafeRenderer,
      mapLabelCollisionV2Enabled,
      onMarkerPress,
      pendingStackedOpenRef,
      recomputeInlineLabels,
      resolveRequestedIOSDisplayMode,
      setSelectedStackedMarkerId,
      singleLayerEnterZoom,
    ]
  );

  const handleMapPress = useCallback(() => {
    if (suppressNextMapPressRef.current) {
      suppressNextMapPressRef.current = false;
      return;
    }
    if (selectedStackedMarkerIdRef.current || pendingStackedOpenRef.current) {
      closeStackedTooltip();
    }
  }, [closeStackedTooltip, pendingStackedOpenRef]);

  const handleMapTouchStart = useCallback(() => {
    markGestureActive();
    markClusterInteractionActive();
  }, [markClusterInteractionActive, markGestureActive]);

  const handleMapTouchEnd = useCallback(() => {
    scheduleClusterInteractionRelease();
  }, [scheduleClusterInteractionRelease]);

  const handleMapTouchCancel = useCallback(() => {
    scheduleClusterInteractionRelease();
  }, [scheduleClusterInteractionRelease]);

  const handleMapLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = Math.round(event.nativeEvent.layout.width);
      const height = Math.round(event.nativeEvent.layout.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return;
      }
      setMapLayoutSize((prev) => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }
        return { width, height };
      });
      if (selectedStackedMarker) {
        void updateStackedTooltipPosition(selectedStackedMarker);
      }
      recomputeInlineLabels(cameraCenterRef.current, zoomRef.current, "layout");
    },
    [
      recomputeInlineLabels,
      selectedStackedMarker,
      updateStackedTooltipPosition,
    ]
  );

  const resolvedMarkerVisualById = useMemo(
    () => {
      if (!mapMarkerPipelineOptV1) {
        return new Map();
      }
      return buildResolvedMarkerVisuals({
        markers: renderMarkers,
        failedRemoteSpriteKeySet,
        fullSpriteTextLayersEnabled,
        isIOSStableMarkersMode,
        useOverlayFullSprites,
      });
    },
    [
      mapMarkerPipelineOptV1,
      failedRemoteSpriteKeySet,
      fullSpriteTextLayersEnabled,
      isIOSStableMarkersMode,
      renderMarkers,
      useOverlayFullSprites,
    ]
  );

  const inlineLabelIdSet = useMemo(() => new Set(inlineLabelIds), [inlineLabelIds]);

  if (Platform.OS === "web") {
    return (
      <View style={styles.map}>
        <Text style={{ textAlign: "center", marginTop: 50, color: "#666" }}>
          Map view is not available on web. Please use the mobile app.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.map} onLayout={handleMapLayout}>
      <MapView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onMapReady={handleMapReady}
        onPanDrag={handlePanDrag}
        onTouchStart={handleMapTouchStart}
        onTouchEnd={handleMapTouchEnd}
        onTouchCancel={handleMapTouchCancel}
        onPress={handleMapPress}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsCompass={false}
        zoomControlEnabled={false}
        rotateEnabled={true}
        pitchEnabled={true}
        scrollDuringRotateOrZoomEnabled={true}
        customMapStyle={Platform.OS === "android" ? GOOGLE_MAP_STYLE : undefined}
        showsPointsOfInterest={Platform.OS === "ios" ? false : undefined}
      >
        <MarkerLayer
          renderMarkers={markerLayerMarkers}
          inlineLabelIdSet={inlineLabelIdSet}
          effectiveFullSpriteOpacityById={effectiveFullSpriteOpacityById}
          clusterTracksViewChangesEnabled={clusterTracksViewChangesEnabled}
          hasActiveFilter={Boolean(hasActiveFilter)}
          handleMarkerPress={handleMarkerPress}
          mapMarkerPipelineOptV1={mapMarkerPipelineOptV1}
          resolvedMarkerVisualById={resolvedMarkerVisualById}
          isIOSStableMarkersMode={isIOSStableMarkersMode}
          isIOSStrictSafeRenderer={isIOSStrictSafeRenderer}
          fullSpriteTextLayersEnabled={fullSpriteTextLayersEnabled}
          failedRemoteSpriteKeySet={failedRemoteSpriteKeySet}
          useOverlayFullSprites={useOverlayFullSprites}
        />

        <FullSpriteOverlayLayer
          useOverlayFullSprites={useOverlayFullSprites}
          renderMarkers={renderMarkers}
          effectiveFullSpriteOpacityById={effectiveFullSpriteOpacityById}
          mapMarkerPipelineOptV1={mapMarkerPipelineOptV1}
          resolvedMarkerVisualById={resolvedMarkerVisualById}
          failedRemoteSpriteKeySet={failedRemoteSpriteKeySet}
          handleMarkerPress={handleMarkerPress}
        />

        {userCoord && isValidMapCoordinate(userCoord[1], userCoord[0]) && (
          <Marker
            key={USER_MARKER_ID}
            coordinate={{ latitude: userCoord[1], longitude: userCoord[0] }}
            pinColor={USER_MARKER_COLOR}
            tracksViewChanges={false}
          />
        )}
      </MapView>

      {!isIOSStrictSafeRenderer ? (
        <InlineLabelLayer
          showSingleLayer={labelsEnabledForCurrentMode && effectiveShowSingleLayer}
          inlineLabelPlacements={inlineLabelPlacements}
          useInlineLabelOverlay={useInlineLabelOverlay}
          inlineTextRenderedByMarkerIdSet={inlineTextRenderedByMarkerIdSet}
        />
      ) : null}

      <StackedTooltipLayer
        selectedStackedMarker={selectedStackedMarker}
        stackedTooltipLayout={stackedTooltipLayout}
        tooltipItems={tooltipItems}
        closeStackedTooltip={closeStackedTooltip}
        onMarkerPress={onMarkerPress}
      />
    </View>
  );
}

export default memo(DiscoverMap);

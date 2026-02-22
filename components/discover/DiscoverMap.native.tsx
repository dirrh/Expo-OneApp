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
  CLUSTER_PRESS_TARGET_MARGIN_ZOOM,
  CLUSTER_PRESS_ZOOM_STEP,
  FULL_SPRITE_TITLE_HEIGHT,
  FULL_SPRITE_TITLE_MIN_WIDTH,
  FULL_SPRITE_TITLE_OFFSET_Y,
  GOOGLE_MAP_STYLE,
  MARKER_TITLE_OFFSET_Y,
  MULTI_ICON,
  SINGLE_LAYER_ENTER_ZOOM_OFFSET,
  STACKED_CENTER_DURATION_MS,
  STACKED_OPEN_FALLBACK_MS,
  USER_MARKER_COLOR,
  USER_MARKER_ID,
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

  useEffect(() => {
    cameraCenterRef.current = cameraCenter;
  }, [cameraCenter]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

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
  const mapMarkerPipelineOptV1 = MAP_MARKER_PIPELINE_OPT_V1;
  const isIOSStableMarkersMode = isIOS && MAP_IOS_STABLE_MARKERS_V1;
  const fullSpritesEnabled =
    markerRenderPolicy?.fullSpritesEnabled ?? MAP_FULL_SPRITES_V1;
  const labelLayoutV3Enabled = MAP_LABEL_LAYOUT_V3;
  const fullSpriteTextLayersEnabled = fullSpritesEnabled;
  const useInlineLabelOverlay = labelLayoutV3Enabled && !fullSpriteTextLayersEnabled;
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
  const useOverlayFullSprites =
    fullSpriteTextLayersEnabled && !isIOSStableMarkersMode;
  const resolvedLabelPolicy = useMemo(
    () => normalizeDiscoverMapLabelPolicy(labelPolicy),
    [labelPolicy]
  );
  const mapLabelCollisionV2Enabled = MAP_LABEL_COLLISION_V2;
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

  const showSingleLayer = effectiveZoom >= singleLayerEnterZoom;
  const showClusterLayer = !showSingleLayer;
  const shouldCullClustersByViewport = Platform.OS !== "ios";

  const clusteredFeatures = useClusteredFeatures({
    showClusterLayer,
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

    if (showClusterLayer) {
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

    if (showSingleLayer) {
      singleLayerMarkers.forEach((group) => {
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
    showClusterLayer,
    clusteredFeatures,
    hasActiveFilter,
    mapMarkerPipelineOptV1,
    singleLayerDerived.sortedStackedItemsByGroupId,
    showSingleLayer,
    singleLayerMarkers,
  ]);

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
    showSingleLayer,
    isIOSStableMarkersMode,
    useOverlayFullSprites,
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
    };
  }, []);

  useEffect(() => {
    applyRenderCamera(
      [initialRegion.longitude, initialRegion.latitude],
      regionToZoom(initialRegion)
    );
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
    } catch {
    }
  }, [applyRenderCamera, cameraRef, fallbackZoom, onCameraChanged]);

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
    if (selectedStackedMarkerId || pendingStackedOpenRef.current) {
      closeStackedTooltip();
    }
  }, [markGestureActive, selectedStackedMarkerId, closeStackedTooltip, pendingStackedOpenRef]);

  const handleRegionChange = useCallback(
    (region: Region) => {
      if (!isValidRegion(region)) {
        return;
      }

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
      scheduleGestureLabelRecompute(nextCenter, nextZoom);
      onCameraChanged(nextCenter, nextZoom, true);
    },
    [applyRenderCamera, onCameraChanged, scheduleGestureLabelRecompute]
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region, details?: { isGesture?: boolean }) => {
      if (!isValidRegion(region)) {
        scheduleGestureRelease();
        return;
      }

      const isUserGesture = Boolean(details?.isGesture ?? gestureRef.current);
      const nextCenter = normalizeCenter([region.longitude, region.latitude]);
      const nextZoom = regionToZoom(region);
      if (!isFiniteCoordinate(nextCenter[1], nextCenter[0]) || !Number.isFinite(nextZoom)) {
        scheduleGestureRelease();
        return;
      }

      applyRenderCamera(nextCenter, nextZoom);
      scheduleGestureRelease();
      clearPendingGestureLabelRecompute();
      onCameraChanged(
        nextCenter,
        nextZoom,
        isUserGesture
      );

      const pendingStackedId = pendingStackedOpenRef.current?.id;
      if (pendingStackedId) {
        const pendingVisible = renderMarkers.some(
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
      clearPendingGestureLabelRecompute,
      clearPendingStackedOpen,
      onCameraChanged,
      recomputeInlineLabels,
      renderMarkers,
      scheduleGestureRelease,
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
          selectedStackedMarkerId === marker.id &&
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
        if (mapView) {
          void mapView
            .getCamera()
            .then((currentCamera) => {
              mapView.animateCamera(
                {
                  ...currentCamera,
                  center: {
                    latitude: marker.focusCoordinate.latitude,
                    longitude: marker.focusCoordinate.longitude,
                  },
                },
                { duration: STACKED_CENTER_DURATION_MS }
              );
            })
            .catch(() => {
              setMapCamera(cameraRef, {
                center: [
                  marker.focusCoordinate.longitude,
                  marker.focusCoordinate.latitude,
                ],
                zoom: zoomRef.current,
                durationMs: STACKED_CENTER_DURATION_MS,
              });
            });
        } else {
          setMapCamera(cameraRef, {
            center: [
              marker.focusCoordinate.longitude,
              marker.focusCoordinate.latitude,
            ],
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
      mapLabelCollisionV2Enabled,
      onMarkerPress,
      pendingStackedOpenRef,
      recomputeInlineLabels,
      selectedStackedMarkerId,
      setSelectedStackedMarkerId,
      singleLayerEnterZoom,
    ]
  );

  const handleMapPress = useCallback(() => {
    if (suppressNextMapPressRef.current) {
      suppressNextMapPressRef.current = false;
      return;
    }
    if (selectedStackedMarkerId || pendingStackedOpenRef.current) {
      closeStackedTooltip();
    }
  }, [selectedStackedMarkerId, closeStackedTooltip, pendingStackedOpenRef]);

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
      recomputeInlineLabels(cameraCenter, zoom, "layout");
    },
    [
      cameraCenter,
      recomputeInlineLabels,
      selectedStackedMarker,
      updateStackedTooltipPosition,
      zoom,
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
        onMapReady={() => {
          void syncRenderCameraFromNative();
          recomputeInlineLabels(cameraCenter, zoom, "map-ready");
        }}
        onPanDrag={handlePanDrag}
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
          renderMarkers={renderMarkers}
          inlineLabelIdSet={inlineLabelIdSet}
          effectiveFullSpriteOpacityById={effectiveFullSpriteOpacityById}
          hasActiveFilter={Boolean(hasActiveFilter)}
          handleMarkerPress={handleMarkerPress}
          mapMarkerPipelineOptV1={mapMarkerPipelineOptV1}
          resolvedMarkerVisualById={resolvedMarkerVisualById}
          isIOSStableMarkersMode={isIOSStableMarkersMode}
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
            onPress={() => undefined}
          />
        )}
      </MapView>

      <InlineLabelLayer
        showSingleLayer={showSingleLayer}
        inlineLabelPlacements={inlineLabelPlacements}
        useInlineLabelOverlay={useInlineLabelOverlay}
        inlineTextRenderedByMarkerIdSet={inlineTextRenderedByMarkerIdSet}
      />

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

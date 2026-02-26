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
  IOS_CLUSTER_CELL_PX,
  MAP_MARKER_PIPELINE_OPT_V1,
  MAP_IOS_CRASH_HARDENING_LOGS_ENABLED,
  MAP_IOS_POOL_SIZE,
  MAP_IOS_LOCAL_ONLY_SPRITES_ENABLED,
  MAP_IOS_EMERGENCY_CLUSTER_ONLY_ENABLED,
  MAP_IOS_SPRITE_COLLISION_ENABLED,
  MAP_IOS_SPRITE_COLLISION_W,
  MAP_IOS_SPRITE_COLLISION_H,
} from "../../lib/constants/discover";
import {
  CLUSTER_PRESS_TARGET_MARGIN_ZOOM,
  CLUSTER_PRESS_ZOOM_STEP,
  CLUSTER_ZOOM_BUCKET_SIZE,
  GOOGLE_MAP_STYLE,
  SINGLE_LAYER_ENTER_ZOOM_OFFSET,
  STACKED_CENTER_DURATION_MS,
  STACKED_OPEN_FALLBACK_MS,
  USER_MARKER_COLOR,
  USER_MARKER_ID,
} from "./map/constants";
import type { RenderMarker, SingleLayerMarkerGroup } from "./map/types";
import { useClusteredFeatures } from "./map/hooks/useClusteredFeatures";
import { useSingleLayerDerived } from "./map/hooks/useSingleLayerDerived";
import { useStackedTooltip } from "./map/hooks/useStackedTooltip";
import { useIOSMapModeController } from "./map/ios/hooks/useIOSMapModeController";
import { useIOSAnnotationDataset } from "./map/ios/hooks/useIOSAnnotationDataset";
import { useIOSAnnotationPool } from "./map/ios/hooks/useIOSAnnotationPool";
import { useIOSSpriteCollision } from "./map/ios/hooks/useIOSSpriteCollision";
import { IOSMarkerLayer } from "./map/ios/layers/IOSMarkerLayer";
import { resolveIOSPoolPlaceholderSprite } from "./map/ios/pipelines/iosSpriteRegistry";
import type { IOSRenderItem } from "./map/ios/types";
import { StackedTooltipLayer } from "./map/layers/StackedTooltipLayer";

const IOS_MODE_ENTRY_HYSTERESIS_ZOOM = 0.18;
const IOS_MODE_EXIT_HYSTERESIS_ZOOM = 0.22;
const IOS_MODE_SWITCH_COOLDOWN_MS = 240;

function DiscoverMapIOS({
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
}: DiscoverMapProps) {
  const fallbackCenter = mapCenter ?? cityCenter ?? DEFAULT_CITY_CENTER;
  const fallbackZoom = mapZoom ?? DEFAULT_CAMERA_ZOOM;
  const mapMarkerPipelineOptV1 = MAP_MARKER_PIPELINE_OPT_V1;
  const localOnlySprites = MAP_IOS_LOCAL_ONLY_SPRITES_ENABLED;
  const emergencyClusterOnly = MAP_IOS_EMERGENCY_CLUSTER_ONLY_ENABLED;
  const logsEnabled = MAP_IOS_CRASH_HARDENING_LOGS_ENABLED;
  const poolSize = MAP_IOS_POOL_SIZE;

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
  const [mapLayoutSize, setMapLayoutSize] = useState({ width: 0, height: 0 });

  const applyRenderCamera = useCallback((center: [number, number], zoom: number) => {
    const normalizedCenter = normalizeCenter(center);
    setRenderCamera((previous) => {
      const delta = Math.hypot(
        normalizedCenter[0] - previous.center[0],
        normalizedCenter[1] - previous.center[1]
      );
      if (delta < 0.000001 && Math.abs(zoom - previous.zoom) < 0.0001) {
        return previous;
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

  const effectiveZoomRaw = zoom + IOS_ZOOM_OFFSET;
  const effectiveZoom = Math.max(0, Math.min(20, effectiveZoomRaw));
  const superclusterZoom = Math.max(0, Math.min(20, Math.floor(effectiveZoom)));
  const forceClusterZoom =
    Platform.OS === "ios" ? IOS_FORCE_CLUSTER_ZOOM : FORCE_CLUSTER_ZOOM;
  const singleModeZoom =
    Platform.OS === "ios" ? IOS_SINGLE_MODE_ZOOM : SINGLE_MODE_ZOOM;
  const singleLayerEnterZoom = Math.max(0, singleModeZoom + SINGLE_LAYER_ENTER_ZOOM_OFFSET);
  const clusterRadiusPx = Math.max(36, Math.round(IOS_CLUSTER_CELL_PX * 0.58));
  const stableClusterZoom = Math.max(
    0,
    Math.min(
      forceClusterZoom,
      Math.floor(superclusterZoom / CLUSTER_ZOOM_BUCKET_SIZE) *
        CLUSTER_ZOOM_BUCKET_SIZE
    )
  );

  const initialMode = emergencyClusterOnly
    ? "cluster"
    : effectiveZoom >= singleLayerEnterZoom
      ? "single"
      : "cluster";
  const {
    displayMode,
    displayModeRef,
    resolveRequestedMode,
    commitModeForZoom,
    forceClusterMode,
  } = useIOSMapModeController({
    initialMode,
    singleLayerEnterZoom,
    entryHysteresisZoom: IOS_MODE_ENTRY_HYSTERESIS_ZOOM,
    exitHysteresisZoom: IOS_MODE_EXIT_HYSTERESIS_ZOOM,
    cooldownMs: IOS_MODE_SWITCH_COOLDOWN_MS,
    emergencyClusterOnly,
    logsEnabled,
  });
  const showSingleLayer = displayMode === "single" && !emergencyClusterOnly;
  const showClusterLayer = displayMode === "cluster" || emergencyClusterOnly;

  useEffect(() => {
    if (emergencyClusterOnly) {
      forceClusterMode();
    }
  }, [emergencyClusterOnly, forceClusterMode]);

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

  const singleLayerDerived = useSingleLayerDerived({
    singleLayerMarkers,
    fullSpriteTextLayersEnabled: true,
    mapMarkerPipelineOptV1,
  });

  const clusteredFeatures = useClusteredFeatures({
    showClusterLayer,
    filteredMarkers,
    cameraCenter,
    zoom,
    shouldCullClustersByViewport: false,
    mapMarkerPipelineOptV1,
    clusterRadiusPx,
    forceClusterZoom,
    stableClusterZoom,
    isIOS: true,
  });

  const rawMarkers = useIOSAnnotationDataset({
    showClusterLayer,
    showSingleLayer,
    clusteredFeatures,
    singleLayerMarkers,
    sortedStackedItemsByGroupId: singleLayerDerived.sortedStackedItemsByGroupId,
    hasActiveFilter: Boolean(hasActiveFilter),
    cameraCenter,
    itemCap: poolSize,
    localOnlySprites,
  });
  const collisionFiltered = useIOSSpriteCollision({
    items: rawMarkers,
    zoom,
    cameraCenter,
    mapWidth: mapLayoutSize.width > 0 ? mapLayoutSize.width : 390,
    collisionW: MAP_IOS_SPRITE_COLLISION_W,
    collisionH: MAP_IOS_SPRITE_COLLISION_H,
    enabled: MAP_IOS_SPRITE_COLLISION_ENABLED,
  });
  const placeholderSprite = useMemo(() => resolveIOSPoolPlaceholderSprite(), []);
  const { pooledItems, visibleCount } = useIOSAnnotationPool({
    items: collisionFiltered,
    poolSize,
    placeholderImage: placeholderSprite.image,
    placeholderAnchor: placeholderSprite.anchor,
  });

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
    renderMarkers: pooledItems as unknown as RenderMarker[],
    mapLayoutSize,
  });
  const selectedStackedMarkerIdRef = useRef(selectedStackedMarkerId);
  selectedStackedMarkerIdRef.current = selectedStackedMarkerId;

  const renderMarkersRef = useRef<IOSRenderItem[]>(pooledItems);
  renderMarkersRef.current = pooledItems;
  useEffect(() => {
    if (!logsEnabled) {
      return;
    }
    console.debug(
      `[map_ios_rewrite_v2] pool-state mode=${displayMode} zoom=${effectiveZoom.toFixed(
        3
      )} raw=${rawMarkers.length} pooledVisible=${visibleCount} pooledSlots=${poolSize}`
    );
  }, [displayMode, effectiveZoom, logsEnabled, poolSize, rawMarkers.length, visibleCount]);

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
    const nextCenter: [number, number] = [
      initialRegion.longitude,
      initialRegion.latitude,
    ];
    const nextZoom = regionToZoom(initialRegion);
    applyRenderCamera(nextCenter, nextZoom);
  }, [applyRenderCamera, initialRegion]);

  const syncRenderCameraFromNative = useCallback(async () => {
    const mapView = cameraRef.current;
    if (!mapView) {
      return;
    }
    try {
      const nativeCamera = await mapView.getCamera();
      const lat = nativeCamera?.center?.latitude;
      const lng = nativeCamera?.center?.longitude;
      const nativeZoom =
        typeof nativeCamera?.zoom === "number" && Number.isFinite(nativeCamera.zoom)
          ? nativeCamera.zoom
          : NaN;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      const nextCenter = normalizeCenter([lng, lat]);
      const nextZoom = Number.isFinite(nativeZoom) ? nativeZoom : fallbackZoom;
      applyRenderCamera(nextCenter, nextZoom);
      onCameraChanged(nextCenter, nextZoom, false);
      commitModeForZoom({
        zoom: nextZoom,
        trigger: "native-sync",
        markerCount: rawMarkers.length,
      });
    } catch {
    }
  }, [
    applyRenderCamera,
    cameraRef,
    commitModeForZoom,
    fallbackZoom,
    onCameraChanged,
    rawMarkers.length,
  ]);

  const handleMapReady = useCallback(() => {
    void syncRenderCameraFromNative();
    commitModeForZoom({
      zoom: zoomRef.current,
      trigger: "map-ready",
      markerCount: rawMarkers.length,
    });
  }, [commitModeForZoom, rawMarkers.length, syncRenderCameraFromNative]);

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
    if (selectedStackedMarkerIdRef.current || pendingStackedOpenRef.current) {
      closeStackedTooltip();
    }
  }, [closeStackedTooltip, markGestureActive, pendingStackedOpenRef]);

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
      if (gestureRef.current) {
        onCameraChanged(nextCenter, nextZoom, true);
      }
    },
    [applyRenderCamera, onCameraChanged]
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
      onCameraChanged(nextCenter, nextZoom, isUserGesture);
      commitModeForZoom({
        zoom: nextZoom,
        trigger: "region-complete",
        markerCount: rawMarkers.length,
      });

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
        void updateStackedTooltipPosition(selectedStackedMarker as unknown as RenderMarker);
      }
    },
    [
      applyRenderCamera,
      clearPendingStackedOpen,
      commitModeForZoom,
      onCameraChanged,
      pendingStackedOpenRef,
      rawMarkers.length,
      scheduleGestureRelease,
      selectedStackedMarker,
      setSelectedStackedMarkerId,
      updateStackedTooltipPosition,
    ]
  );

  const handleMarkerPress = useCallback(
    (marker: IOSRenderItem) => {
      if (marker.isPoolPlaceholder || marker.id === USER_MARKER_ID) {
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
                  center: { latitude: focusLat, longitude: focusLng },
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
        if (logsEnabled) {
          const committedMode = displayModeRef.current;
          const requestedMode = resolveRequestedMode(targetZoom, committedMode);
          console.debug(
            `[map_ios_rewrite_v2] cluster-press targetZoom=${targetZoom.toFixed(
              3
            )} committedMode=${committedMode} requestedMode=${requestedMode}`
          );
        }

        setMapCamera(cameraRef, {
          center: [marker.focusCoordinate.longitude, marker.focusCoordinate.latitude],
          zoom: targetZoom,
          durationMs: 500,
        });
        return;
      }

      onMarkerPress?.(marker.id);
    },
    [
      cameraRef,
      clearPendingStackedOpen,
      closeStackedTooltip,
      displayModeRef,
      logsEnabled,
      onMarkerPress,
      pendingStackedOpenRef,
      resolveRequestedMode,
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
  }, [markGestureActive]);

  const handleMapTouchEnd = useCallback(() => {
    scheduleGestureRelease();
  }, [scheduleGestureRelease]);

  const handleMapTouchCancel = useCallback(() => {
    scheduleGestureRelease();
  }, [scheduleGestureRelease]);

  const handleMapLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = Math.round(event.nativeEvent.layout.width);
      const height = Math.round(event.nativeEvent.layout.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return;
      }
      setMapLayoutSize((previous) => {
        if (previous.width === width && previous.height === height) {
          return previous;
        }
        return { width, height };
      });
      if (selectedStackedMarker) {
        void updateStackedTooltipPosition(selectedStackedMarker as unknown as RenderMarker);
      }
    },
    [selectedStackedMarker, updateStackedTooltipPosition]
  );

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
        showsPointsOfInterest={false}
      >
        <IOSMarkerLayer markers={pooledItems} onPressMarker={handleMarkerPress} />

        {userCoord && isValidMapCoordinate(userCoord[1], userCoord[0]) && (
          <Marker
            key={USER_MARKER_ID}
            coordinate={{ latitude: userCoord[1], longitude: userCoord[0] }}
            pinColor={USER_MARKER_COLOR}
            tracksViewChanges={false}
          />
        )}
      </MapView>

      <StackedTooltipLayer
        selectedStackedMarker={selectedStackedMarker as unknown as RenderMarker | null}
        stackedTooltipLayout={stackedTooltipLayout}
        tooltipItems={tooltipItems}
        closeStackedTooltip={closeStackedTooltip}
        onMarkerPress={onMarkerPress}
      />
    </View>
  );
}

export default memo(DiscoverMapIOS);

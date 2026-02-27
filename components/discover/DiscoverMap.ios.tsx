import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import type { DiscoverMapProps } from "../../lib/interfaces";
import { styles } from "./discoverStyles";
import { normalizeCenter, regionToZoom, setMapCamera, zoomToRegion } from "../../lib/maps/camera";
import { isFiniteCoordinate, isValidMapCoordinate } from "../../lib/maps/discoverMapUtils";
import {
  DEFAULT_CAMERA_ZOOM,
  DEFAULT_CITY_CENTER,
  IOS_CLUSTER_CELL_PX,
  IOS_FORCE_CLUSTER_ZOOM,
  IOS_ZOOM_OFFSET,
} from "../../lib/constants/discover";
import { CLUSTER_PRESS_ZOOM_STEP, GOOGLE_MAP_STYLE, USER_MARKER_COLOR, USER_MARKER_ID } from "./map/constants";
import { useClusteredFeatures } from "./map/hooks/useClusteredFeatures";
import {
  buildIOSV3ClusterSourceMarkers,
  buildIOSV3Dataset,
  groupIOSV3MarkersByLocation,
  resolveIOSV3PoolPlaceholderSprite,
} from "./map/ios_v3/buildIOSV3Dataset";
import { useIOSV3CameraGate } from "./map/ios_v3/useIOSV3CameraGate";
import { IOSV3MarkerLayer } from "./map/ios_v3/IOSV3MarkerLayer";
import type { IOSV3RenderItem } from "./map/ios_v3/types";
import {
  IOS_V3_MODE_SWITCH_COOLDOWN_MS,
  IOS_V3_SINGLE_ENTER_ZOOM,
  IOS_V3_SINGLE_EXIT_ZOOM,
  useIOSV3Mode,
} from "./map/ios_v3/useIOSV3Mode";
import { IOS_V3_POOL_SIZE, useIOSV3Pool } from "./map/ios_v3/useIOSV3Pool";

const IOS_V3_CAMERA_DEBOUNCE_MS = 220;
const IOS_V3_GESTURE_RELEASE_DELAY_MS = 160;
const IOS_V3_CLUSTER_PRESS_MARGIN_ZOOM = 0.5;

const areAnchorsEqual = (
  left: { x: number; y: number } | undefined,
  right: { x: number; y: number } | undefined
) => {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.x === right.x && left.y === right.y;
};

const areRenderItemsEquivalent = (left: IOSV3RenderItem, right: IOSV3RenderItem) =>
  left.id === right.id &&
  left.kind === right.kind &&
  left.image === right.image &&
  left.coordinate.latitude === right.coordinate.latitude &&
  left.coordinate.longitude === right.coordinate.longitude &&
  left.zIndex === right.zIndex &&
  left.isPoolPlaceholder === right.isPoolPlaceholder &&
  areAnchorsEqual(left.anchor, right.anchor);

const shouldKeepFrozenItems = (previous: IOSV3RenderItem[], next: IOSV3RenderItem[]) => {
  if (previous === next) {
    return true;
  }
  if (previous.length !== next.length) {
    return false;
  }
  for (let index = 0; index < previous.length; index += 1) {
    if (!areRenderItemsEquivalent(previous[index], next[index])) {
      return false;
    }
  }
  return true;
};

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

  const initialCenter = useMemo<[number, number]>(
    () => [initialRegion.longitude, initialRegion.latitude],
    [initialRegion]
  );
  const initialZoom = useMemo(() => regionToZoom(initialRegion), [initialRegion]);

  const {
    renderCamera,
    modeSourceZoom,
    isGestureActive,
    markGestureStart,
    markGestureEnd,
    handleRegionChange,
    handleRegionChangeComplete,
    commitCameraNow,
  } = useIOSV3CameraGate({
    initialCenter,
    initialZoom,
    onCameraChanged,
    debounceMs: IOS_V3_CAMERA_DEBOUNCE_MS,
    gestureReleaseDelayMs: IOS_V3_GESTURE_RELEASE_DELAY_MS,
  });

  useEffect(() => {
    commitCameraNow(initialCenter, initialZoom, false);
  }, [commitCameraNow, initialCenter, initialZoom]);

  const [stableFilteredMarkers, setStableFilteredMarkers] = useState(() => filteredMarkers);
  const latestFilteredMarkersRef = useRef(filteredMarkers);
  useEffect(() => {
    latestFilteredMarkersRef.current = filteredMarkers;
    if (!isGestureActive) {
      setStableFilteredMarkers(filteredMarkers);
    }
  }, [filteredMarkers, isGestureActive]);

  useEffect(() => {
    if (!isGestureActive) {
      setStableFilteredMarkers(latestFilteredMarkersRef.current);
    }
  }, [isGestureActive]);

  const cameraCenter = renderCamera.center;
  const zoom = renderCamera.zoom;
  const modeEffectiveZoom = Math.max(0, Math.min(20, modeSourceZoom + IOS_ZOOM_OFFSET));
  const effectiveZoom = Math.max(0, Math.min(20, zoom + IOS_ZOOM_OFFSET));
  const initialMode = effectiveZoom >= IOS_V3_SINGLE_ENTER_ZOOM ? "single" : "cluster";
  const { mode, commitModeForZoom } = useIOSV3Mode({
    initialMode,
    singleEnterZoom: IOS_V3_SINGLE_ENTER_ZOOM,
    singleExitZoom: IOS_V3_SINGLE_EXIT_ZOOM,
    cooldownMs: IOS_V3_MODE_SWITCH_COOLDOWN_MS,
  });

  useEffect(() => {
    commitModeForZoom(modeEffectiveZoom);
  }, [commitModeForZoom, modeEffectiveZoom]);

  const groups = useMemo(
    () => groupIOSV3MarkersByLocation(stableFilteredMarkers),
    [stableFilteredMarkers]
  );
  const clusterSourceMarkers = useMemo(
    () => buildIOSV3ClusterSourceMarkers(groups),
    [groups]
  );

  const clusterRadiusPx = Math.max(28, Math.round(IOS_CLUSTER_CELL_PX * 0.58));
  const stableClusterZoom = Math.max(
    0,
    Math.min(IOS_FORCE_CLUSTER_ZOOM, Math.floor(effectiveZoom))
  );

  const clusteredFeatures = useClusteredFeatures({
    showClusterLayer: mode === "cluster",
    filteredMarkers: clusterSourceMarkers,
    cameraCenter,
    zoom,
    shouldCullClustersByViewport: false,
    mapMarkerPipelineOptV1: true,
    clusterRadiusPx,
    forceClusterZoom: IOS_FORCE_CLUSTER_ZOOM,
    stableClusterZoom,
    isIOS: true,
  });

  const datasetItems = useMemo(
    () =>
      buildIOSV3Dataset({
        mode,
        groups,
        clusteredFeatures,
        hasActiveFilter: Boolean(hasActiveFilter),
        cameraCenter,
        poolSize: IOS_V3_POOL_SIZE,
      }),
    [cameraCenter, clusteredFeatures, groups, hasActiveFilter, mode]
  );

  const placeholderSprite = useMemo(() => resolveIOSV3PoolPlaceholderSprite(), []);
  const { pooledItems, visibleCount } = useIOSV3Pool({
    items: datasetItems,
    poolSize: IOS_V3_POOL_SIZE,
    placeholderImage: placeholderSprite.image,
    placeholderAnchor: placeholderSprite.anchor,
  });

  const [frozenPooledItems, setFrozenPooledItems] = useState<IOSV3RenderItem[]>(() => pooledItems);
  const latestPooledItemsRef = useRef<IOSV3RenderItem[]>(pooledItems);
  const previousModeRef = useRef(mode);

  useEffect(() => {
    latestPooledItemsRef.current = pooledItems;
    const modeChanged = previousModeRef.current !== mode;
    const shouldHoldClusterFrame =
      mode === "cluster" &&
      previousModeRef.current === "cluster" &&
      visibleCount === 0 &&
      stableFilteredMarkers.length > 0;
    if (
      shouldHoldClusterFrame
    ) {
      return;
    }
    if (!isGestureActive || modeChanged) {
      setFrozenPooledItems((previous) =>
        shouldKeepFrozenItems(previous, pooledItems) ? previous : pooledItems
      );
    }
  }, [isGestureActive, mode, pooledItems, stableFilteredMarkers.length, visibleCount]);

  useEffect(() => {
    const modeChanged = previousModeRef.current !== mode;
    if (!isGestureActive || modeChanged) {
      const shouldHoldClusterFrame =
        mode === "cluster" &&
        previousModeRef.current === "cluster" &&
        visibleCount === 0 &&
        stableFilteredMarkers.length > 0;
      if (
        shouldHoldClusterFrame
      ) {
        return;
      }
      const nextItems = latestPooledItemsRef.current;
      setFrozenPooledItems((previous) =>
        shouldKeepFrozenItems(previous, nextItems) ? previous : nextItems
      );
    }
  }, [isGestureActive, mode, stableFilteredMarkers.length, visibleCount]);

  useEffect(() => {
    previousModeRef.current = mode;
  }, [mode]);

  const handleMapReady = useCallback(() => {
    const mapView = cameraRef.current;
    if (!mapView) {
      return;
    }
    void mapView
      .getCamera()
      .then((nativeCamera) => {
        const lat = nativeCamera?.center?.latitude;
        const lng = nativeCamera?.center?.longitude;
        const nativeZoom =
          typeof nativeCamera?.zoom === "number" && Number.isFinite(nativeCamera.zoom)
            ? nativeCamera.zoom
            : fallbackZoom;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return;
        }
        commitCameraNow(normalizeCenter([lng, lat]), nativeZoom, false);
      })
      .catch(() => undefined);
  }, [cameraRef, commitCameraNow, fallbackZoom]);

  const handleMarkerPress = useCallback(
    (marker: IOSV3RenderItem) => {
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

      if (marker.kind === "cluster") {
        const targetZoom = Math.min(
          20,
          Math.max(
            zoom + CLUSTER_PRESS_ZOOM_STEP,
            IOS_V3_SINGLE_ENTER_ZOOM + IOS_V3_CLUSTER_PRESS_MARGIN_ZOOM
          )
        );
        setMapCamera(cameraRef, {
          center: [marker.focusCoordinate.longitude, marker.focusCoordinate.latitude],
          zoom: targetZoom,
          durationMs: 500,
        });
        return;
      }

      onMarkerPress?.(marker.id);
    },
    [cameraRef, onMarkerPress, zoom]
  );

  const handleMapTouchStart = useCallback(() => {
    markGestureStart();
  }, [markGestureStart]);

  const handleMapTouchEnd = useCallback(() => {
    markGestureEnd();
  }, [markGestureEnd]);

  const handleMapTouchCancel = useCallback(() => {
    markGestureEnd();
  }, [markGestureEnd]);

  const handlePanDrag = useCallback(() => {
    markGestureStart();
  }, [markGestureStart]);

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
    <View style={styles.map}>
      <MapView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onMapReady={handleMapReady}
        onPanDrag={handlePanDrag}
        onTouchStart={handleMapTouchStart}
        onTouchEnd={handleMapTouchEnd}
        onTouchCancel={handleMapTouchCancel}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsCompass={false}
        zoomControlEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        scrollDuringRotateOrZoomEnabled={true}
        customMapStyle={Platform.OS === "android" ? GOOGLE_MAP_STYLE : undefined}
        showsPointsOfInterest={false}
      >
        <IOSV3MarkerLayer markers={frozenPooledItems} onPressMarker={handleMarkerPress} />

        {userCoord && isValidMapCoordinate(userCoord[1], userCoord[0]) && (
          <Marker
            key={USER_MARKER_ID}
            coordinate={{ latitude: userCoord[1], longitude: userCoord[0] }}
            pinColor={USER_MARKER_COLOR}
            tracksViewChanges={false}
          />
        )}
      </MapView>
    </View>
  );
}

export default memo(DiscoverMapIOS);

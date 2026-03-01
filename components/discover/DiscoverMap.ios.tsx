import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import type { DiscoverMapProps } from "../../lib/interfaces";
import {
  AppConfig,
  type AppConfigMapIOSTextMode,
} from "../../lib/config/AppConfig";
import { styles } from "./discoverStyles";
import { normalizeCenter, regionToZoom, setMapCamera, zoomToRegion } from "../../lib/maps/camera";
import {
  isFiniteCoordinate,
  isValidMapCoordinate,
} from "../../lib/maps/discoverMapUtils";
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
import type { IOSV3RenderItem, IOSV3TextBudget } from "./map/ios_v3/types";
import { normalizeIOSV3PoolSize, useIOSV3Pool } from "./map/ios_v3/useIOSV3Pool";
import { isIOSV3MapFullyIdle } from "./map/ios_v3/updatePolicy";
import {
  IOS_V3_SINGLE_ENTER_ZOOM,
  useIOSV3ZoneMode,
} from "./map/ios_v3/useIOSV3ZoneMode";

const IOS_V3_CAMERA_DEBOUNCE_MS = 350;
const IOS_V3_GESTURE_RELEASE_DELAY_MS = 160;
const IOS_V3_CLUSTER_PRESS_MARGIN_ZOOM = 0.5;
const IOS_V3_ALWAYS_TEXT_BUDGET: IOSV3TextBudget = {
  maxTextMarkers: 8,
  maxFullMarkers: 8,
};
const IOS_V3_DISABLED_TEXT_BUDGET: IOSV3TextBudget = {
  maxTextMarkers: 0,
  maxFullMarkers: 0,
};

const createDynamicIOSV3TextBudget = (
  singleOnlyGroupCount: number,
  _isMapFullyIdle: boolean
): IOSV3TextBudget => {
  if (singleOnlyGroupCount <= 5) {
    return {
      maxTextMarkers: singleOnlyGroupCount,
      maxFullMarkers: singleOnlyGroupCount,
    };
  }
  if (singleOnlyGroupCount <= 15) {
    return IOS_V3_ALWAYS_TEXT_BUDGET;
  }
  if (singleOnlyGroupCount <= 30) {
    return { maxTextMarkers: 6, maxFullMarkers: 6 };
  }
  return { maxTextMarkers: 4, maxFullMarkers: 4 };
};

const resolveIOSV3TextBudget = (
  textMode: AppConfigMapIOSTextMode,
  singleOnlyGroupCount: number,
  isMapFullyIdle: boolean
): IOSV3TextBudget => {
  if (textMode === "off") {
    return IOS_V3_DISABLED_TEXT_BUDGET;
  }
  if (textMode === "always") {
    return IOS_V3_ALWAYS_TEXT_BUDGET;
  }
  return createDynamicIOSV3TextBudget(singleOnlyGroupCount, isMapFullyIdle);
};

const areAnchorsEqual = (
  left: { x: number; y: number } | undefined,
  right: { x: number; y: number } | undefined
) => {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.x === right.x && left.y === right.y;
};

const areImagesEqual = (
  left: number | { uri: string },
  right: number | { uri: string }
) => {
  if (left === right) return true;
  if (typeof left === "object" && typeof right === "object") {
    return left.uri === right.uri;
  }
  return false;
};

const areRenderItemsEquivalent = (left: IOSV3RenderItem, right: IOSV3RenderItem) =>
  left.id === right.id &&
  left.kind === right.kind &&
  areImagesEqual(left.image, right.image) &&
  left.coordinate.latitude === right.coordinate.latitude &&
  left.coordinate.longitude === right.coordinate.longitude &&
  left.zIndex === right.zIndex &&
  Boolean(left.isPoolPlaceholder) === Boolean(right.isPoolPlaceholder) &&
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const fallbackCenter = mapCenter ?? cityCenter ?? DEFAULT_CITY_CENTER;
  const fallbackZoom = mapZoom ?? DEFAULT_CAMERA_ZOOM;
  const poolSize = normalizeIOSV3PoolSize(AppConfig.mapIOSPoolSize);

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
    completedZoom,
    gesturePhase,
    isInteractionBlocked,
    markGestureStart,
    markGestureEnd,
    refreshGestureEndTimer,
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

  const commitCameraNowRef = useRef(commitCameraNow);
  commitCameraNowRef.current = commitCameraNow;

  const isMapFullyIdle = isIOSV3MapFullyIdle({
    gesturePhase,
    isInteractionBlocked,
  });

  useEffect(() => {
    commitCameraNowRef.current(initialCenter, initialZoom, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter, initialZoom]);

  // Guard: reset stuck gesture state when returning from background.
  // Without this, backgrounding mid-gesture leaves gesturePhase="active" forever.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        markGestureEnd();
      }
    });
    return () => subscription.remove();
  }, [markGestureEnd]);

  // Guard: track mount status to prevent setState on unmounted component.
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const [stableFilteredMarkers, setStableFilteredMarkers] = useState(() => filteredMarkers);
  const latestFilteredMarkersRef = useRef(filteredMarkers);
  useEffect(() => {
    latestFilteredMarkersRef.current = filteredMarkers;
    if (isMapFullyIdle) {
      setStableFilteredMarkers(filteredMarkers);
    }
  }, [filteredMarkers, isMapFullyIdle]);

  useEffect(() => {
    if (isMapFullyIdle) {
      setStableFilteredMarkers(latestFilteredMarkersRef.current);
    }
  }, [isMapFullyIdle]);

  const cameraCenter = renderCamera.center;
  const zoom = renderCamera.zoom;
  const liveEffectiveZoom = Math.max(0, Math.min(20, modeSourceZoom + IOS_ZOOM_OFFSET));
  const settledEffectiveZoom = Math.max(0, Math.min(20, completedZoom + IOS_ZOOM_OFFSET));
  const renderEffectiveZoom = Math.max(0, Math.min(20, zoom + IOS_ZOOM_OFFSET));
  const liveCameraCenter = mapCenter ?? cameraCenter;
  const liveRenderZoom =
    typeof mapZoom === "number" && Number.isFinite(mapZoom) ? mapZoom : renderEffectiveZoom;
  const viewportSize = useMemo(
    () => ({
      width: Number.isFinite(windowWidth) ? windowWidth : 0,
      height: Number.isFinite(windowHeight) ? windowHeight : 0,
    }),
    [windowHeight, windowWidth]
  );
  const datasetUserCoordinate = useMemo(
    () =>
      userCoord && isValidMapCoordinate(userCoord[1], userCoord[0])
        ? { latitude: userCoord[1], longitude: userCoord[0] }
        : undefined,
    [userCoord]
  );
  const currentZoomRef = useRef(fallbackZoom);
  currentZoomRef.current = zoom;

  const { visibleMode } = useIOSV3ZoneMode({
    initialZoom: renderEffectiveZoom,
    liveEffectiveZoom,
    settledEffectiveZoom,
    gesturePhase,
  });
  // Always use stableFilteredMarkers for grouping in both modes.
  // In cluster mode: required so Supercluster totals are correct.
  // In single mode: buildIOSV3Dataset sorts by distance from cameraCenter and
  // caps at poolSize (48), which naturally selects exactly the on-screen singles
  // without any explicit viewport filter that can go stale and cause disappearing.
  const markersForGrouping = stableFilteredMarkers;
  const groups = useMemo(
    () => groupIOSV3MarkersByLocation(markersForGrouping),
    [markersForGrouping]
  );
  const singleOnlyGroupCount = useMemo(
    () => groups.filter((group) => group.items.length === 1).length,
    [groups]
  );
  const textBudget = useMemo(
    () => resolveIOSV3TextBudget(AppConfig.mapIOSTextMode, singleOnlyGroupCount, isMapFullyIdle),
    [isMapFullyIdle, singleOnlyGroupCount]
  );
  const effectiveTextBudget = textBudget;
  const clusterSourceMarkers = useMemo(
    () => buildIOSV3ClusterSourceMarkers(groups),
    [groups]
  );

  const clusterRadiusPx = Math.max(28, Math.round(IOS_CLUSTER_CELL_PX * 0.58));
  const stableClusterZoom = Math.max(
    0,
    Math.min(IOS_FORCE_CLUSTER_ZOOM, Math.floor(liveEffectiveZoom))
  );

  const clusteredFeatures = useClusteredFeatures({
    showClusterLayer: visibleMode === "cluster",
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
        mode: visibleMode,
        groups,
        clusteredFeatures,
        hasActiveFilter: Boolean(hasActiveFilter),
        cameraCenter: liveCameraCenter,
        renderZoom: liveRenderZoom,
        viewportSize,
        poolSize,
        textBudget: effectiveTextBudget,
        userCoordinate: datasetUserCoordinate,
      }),
    [
      clusteredFeatures,
      datasetUserCoordinate,
      effectiveTextBudget,
      groups,
      hasActiveFilter,
      liveCameraCenter,
      liveRenderZoom,
      poolSize,
      viewportSize,
      visibleMode,
    ]
  );
  const [settledDatasetItems, setSettledDatasetItems] = useState<IOSV3RenderItem[]>(() => datasetItems);

  useEffect(() => {
    if (!isMapFullyIdle) {
      return;
    }
    setSettledDatasetItems((previous) =>
      shouldKeepFrozenItems(previous, datasetItems) ? previous : datasetItems
    );
  }, [datasetItems, isMapFullyIdle]);
  const displayedDatasetItems = isMapFullyIdle ? datasetItems : settledDatasetItems;

  const placeholderSprite = useMemo(() => resolveIOSV3PoolPlaceholderSprite(), []);
  const { pooledItems } = useIOSV3Pool({
    items: displayedDatasetItems,
    poolSize,
    placeholderImage: placeholderSprite.image,
    placeholderAnchor: placeholderSprite.anchor,
  });

  const [frozenPooledItems, setFrozenPooledItems] = useState<IOSV3RenderItem[]>(() => pooledItems);

  useEffect(() => {
    if (!isMapFullyIdle) {
      return;
    }
    setFrozenPooledItems((previous) =>
      shouldKeepFrozenItems(previous, pooledItems) ? previous : pooledItems
    );
  }, [isMapFullyIdle, pooledItems]);
  const displayedPooledItems = isMapFullyIdle ? pooledItems : frozenPooledItems;

  const handleMapReady = useCallback(() => {
    const mapView = cameraRef.current;
    if (!mapView) {
      return;
    }
    void mapView
      .getCamera()
      .then((nativeCamera) => {
        if (!mountedRef.current) return;
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
        !marker.focusCoordinate ||
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
            currentZoomRef.current + CLUSTER_PRESS_ZOOM_STEP,
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
    [cameraRef, onMarkerPress]
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

  const handleMapPanDrag = useCallback(() => {
    refreshGestureEndTimer();
  }, [refreshGestureEndTimer]);


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
        onPanDrag={handleMapPanDrag}
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
        <IOSV3MarkerLayer
          markers={displayedPooledItems}
          onPressMarker={handleMarkerPress}
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
    </View>
  );
}

export default memo(DiscoverMapIOS);

import React, { memo, useCallback, useMemo, useRef } from "react";
import { Image, StyleSheet, useWindowDimensions, View, Text, Platform } from "react-native";
import Mapbox, {
  Camera,
  MapView,
  LocationPuck,
  UserLocation,
  ShapeSource,
  SymbolLayer,
} from "@rnmapbox/maps";
import type { DiscoverMapProps, DiscoverMapMarker } from "../../lib/interfaces";
import { styles } from "./discoverStyles";
import { useNavigation } from "@react-navigation/native";

import {
  DUMMY_BRANCH,
  CLUSTER_MAX_ZOOM,
  CLUSTERING_MAX_ZOOM,
  DEFAULT_CAMERA_ZOOM,
  DEFAULT_CITY_CENTER,

  CLUSTER_DEFAULT_NAME,
  CLUSTER_FILTER_NAME,

  BADGE_BASE_OFFSET_X,
  BADGE_BASE_OFFSET_Y,
  STAR_BASE_OFFSET_X,
  STAR_BASE_OFFSET_Y,
  TEXT_BASE_OFFSET_X,
  TEXT_BASE_OFFSET_Y,
  BADGE_BASE_WIDTH,

  CLUSTER_FILTER,
  MARKER_FILTER,
  NOT_MULTI_FILTER,
  USER_PUCK_SCALE,
  USER_PUCK_PULSING,
  NAVIGATION_IMAGE_URI,

  BASE_IMAGES,
  clusterLayerBase,
  pointLayerStyle,
  badgeLayerBase,
  badgeStarLayerBase,
  badgeTextLayerBase,

  buildMarkersShapeAndImages,
} from "../../lib/constants/discover";
import { formatTitleFromId } from "../../lib/data/normalizers";

// Memoized popup item component
const PopupItem = memo(function PopupItem({
  item,
  categoryIcons,
  isLast,
}: {
  item: DiscoverMapMarker;
  categoryIcons: DiscoverMapProps["categoryIcons"];
  isLast: boolean;
}) {
  return (
    <View>
      <View style={popupStyles.itemRow}>
        <View style={popupStyles.itemLeft}>
          {item.category !== "Multi" && (
            <Image
              source={categoryIcons[item.category]}
              style={popupStyles.categoryIcon}
            />
          )}
          <Text style={popupStyles.itemTitle}>
            {item.title ?? formatTitleFromId(item.id)}
          </Text>
        </View>
        <View style={popupStyles.itemRight}>
          <Image
            source={require("../../images/star_black.png")}
            style={popupStyles.starIcon}
          />
          <Text style={popupStyles.ratingText}>{item.ratingFormatted ?? item.rating.toFixed(1)}</Text>
        </View>
      </View>
      {!isLast && <View style={popupStyles.divider} />}
    </View>
  );
});

function DiscoverMap({
  cameraRef,
  filteredMarkers,
  onUserLocationUpdate,
  onCameraChanged,
  mapZoom,
  cityCenter,
  isFilterActive,
  iconRegistry,
  onMarkerPress,
  selectedGroup,
  categoryIcons,
}: DiscoverMapProps) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const mapViewRef = useRef<MapView>(null);
  const badgeScale = width / BADGE_BASE_WIDTH;
  const badgeOffsetX = BADGE_BASE_OFFSET_X * badgeScale;
  const badgeOffsetY = BADGE_BASE_OFFSET_Y * badgeScale;
  const starOffsetX = STAR_BASE_OFFSET_X * badgeScale;
  const starOffsetY = STAR_BASE_OFFSET_Y * badgeScale;
  const textOffsetX = TEXT_BASE_OFFSET_X * badgeScale;
  const textOffsetY = TEXT_BASE_OFFSET_Y * badgeScale;
  const clusterIconName = isFilterActive ? CLUSTER_FILTER_NAME : CLUSTER_DEFAULT_NAME;

  const clusterLayerStyle = useMemo(
    () => ({ ...clusterLayerBase, iconImage: clusterIconName }),
    [clusterIconName]
  );
  const badgeLayerStyle = useMemo(
    () => ({
      ...badgeLayerBase,
      iconTranslate: [badgeOffsetX, badgeOffsetY],
    }),
    [badgeOffsetX, badgeOffsetY]
  );
  const badgeStarLayerStyle = useMemo(
    () => ({
      ...badgeStarLayerBase,
      iconTranslate: [starOffsetX, starOffsetY],
    }),
    [starOffsetX, starOffsetY]
  );
  const badgeTextLayerStyle = useMemo(
    () => ({
      ...badgeTextLayerBase,
      textTranslate: [textOffsetX, textOffsetY],
    }),
    [textOffsetX, textOffsetY]
  );
  const mergedImages = useMemo(
    () => (iconRegistry ? { ...BASE_IMAGES, ...iconRegistry } : BASE_IMAGES),
    [iconRegistry]
  );

  // Vždy používame natívne Mapbox clustering - jednoduchšie a spoľahlivejšie
  const { shape, images } = useMemo(() => {
    return buildMarkersShapeAndImages(filteredMarkers, mergedImages);
  }, [filteredMarkers, mergedImages]);

  const handleUserLocationUpdate = useCallback(
    (location: { coords: { longitude: number; latitude: number } }) => {
      onUserLocationUpdate([location.coords.longitude, location.coords.latitude]);
    },
    [onUserLocationUpdate]
  );

  const handleCameraChanged = useCallback(
    (state: any) => {
      const center =
        state?.properties?.center ??
        (state as { geometry?: { coordinates?: number[] } })?.geometry?.coordinates;
      const zoom = state?.properties?.zoom;
      if (!Array.isArray(center) || center.length < 2 || typeof zoom !== "number") {
        return;
      }
      const isUserGesture = Boolean(state?.gestures?.isGestureActive);
      onCameraChanged([center[0], center[1]], zoom, isUserGesture);
    },
    [onCameraChanged]
  );

  const handleMapPress = useCallback(() => {
    if (selectedGroup) {
      onMarkerPress?.("");
    }
  }, [selectedGroup, onMarkerPress]);

  const handleShapePress = useCallback(
    (e: any) => {
      const feature = e.features?.[0];
      if (!feature) {
        if (selectedGroup) {
          onMarkerPress?.("");
        }
        return;
      }
      const id = String(feature.id);
      onMarkerPress?.(id);
    },
    [selectedGroup, onMarkerPress]
  );

  const handleAnnotationSelected = useCallback(() => {
    onMarkerPress?.("");
    navigation.navigate("BusinessDetailScreen", {
      branch: DUMMY_BRANCH,
    });
  }, [onMarkerPress, navigation]);

  // Web fallback - Mapbox doesn't work on web
  if (Platform.OS === 'web') {
    return (
      <View style={styles.map}>
        <Text style={{ textAlign: 'center', marginTop: 50, color: '#666' }}>
          Map view is not available on web. Please use the mobile app.
        </Text>
      </View>
    );
  }

  return (
    <MapView
      ref={mapViewRef}
      style={styles.map}
      styleURL={Mapbox.StyleURL.Street}
      scaleBarEnabled={false}
      onCameraChanged={handleCameraChanged}
      onPress={handleMapPress}
    >
      <Mapbox.Images images={images} />
      <Camera
        ref={cameraRef}
        centerCoordinate={DEFAULT_CITY_CENTER}
        zoomLevel={DEFAULT_CAMERA_ZOOM}
      />

      <UserLocation visible onUpdate={handleUserLocationUpdate} />

      <LocationPuck
        topImage={NAVIGATION_IMAGE_URI}
        visible={true}
        scale={USER_PUCK_SCALE}
        pulsing={USER_PUCK_PULSING}
      />

      <ShapeSource
        id="discover-markers"
        shape={shape}
        cluster={true}
        clusterRadius={80}
        clusterMaxZoomLevel={CLUSTERING_MAX_ZOOM}
        onPress={handleShapePress}
      >
        <SymbolLayer
          id="discover-clusters"
          filter={CLUSTER_FILTER}
          style={clusterLayerStyle}
          maxZoomLevel={CLUSTERING_MAX_ZOOM}
        />

        {/* PIN (ikonka) – pre VŠETKY markery */}
        <SymbolLayer
          id="discover-markers-layer"
          filter={MARKER_FILTER}
          style={pointLayerStyle}
          minZoomLevel={CLUSTER_MAX_ZOOM}
        />

        {/* BADGE – iba pre NON-MULTI */}
        <SymbolLayer
          id="discover-badge-layer"
          filter={NOT_MULTI_FILTER}
          style={badgeLayerStyle}
          minZoomLevel={CLUSTER_MAX_ZOOM}
        />

        <SymbolLayer
          id="discover-badge-star"
          filter={NOT_MULTI_FILTER}
          style={badgeStarLayerStyle}
          minZoomLevel={CLUSTER_MAX_ZOOM}
        />

        <SymbolLayer
          id="discover-badge-text"
          filter={NOT_MULTI_FILTER}
          style={badgeTextLayerStyle}
          minZoomLevel={CLUSTER_MAX_ZOOM}
        />
      </ShapeSource>

      {selectedGroup && selectedGroup.items.length > 1 && (
        <Mapbox.PointAnnotation
          id="multi-pin-marker"
          coordinate={[selectedGroup.coord.lng, selectedGroup.coord.lat]}
          anchor={{ x: 0.5, y: 0 }}
          onSelected={handleAnnotationSelected}
          draggable={false}
        >
          <View style={popupStyles.container} pointerEvents="none">
            {selectedGroup.items.map((item, index) => (
              <PopupItem
                key={item.id}
                item={item}
                categoryIcons={categoryIcons}
                isLast={index === selectedGroup.items.length - 1}
              />
            ))}
          </View>
        </Mapbox.PointAnnotation>
      )}
    </MapView>
  );
}

export default memo(DiscoverMap);

// Popup styles extracted to StyleSheet
const popupStyles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 200,
    maxWidth: 300,
    marginTop: 40,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
      },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 6,
      },
    }),
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  starIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E6E6E6",
    marginVertical: 4,
  },
});

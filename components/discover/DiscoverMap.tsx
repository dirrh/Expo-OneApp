import React, { memo, useCallback, useMemo, useRef } from "react";
import { Image, useWindowDimensions, View, Text } from "react-native";
import Mapbox, {
  Camera,
  MapView,
  LocationPuck,
  UserLocation,
  ShapeSource,
  SymbolLayer,
} from "@rnmapbox/maps";
import type { DiscoverMapProps } from "../../lib/interfaces";
import { styles } from "./discoverStyles";
import { useNavigation } from "@react-navigation/native";

import {
  DUMMY_BRANCH,
  CITY_CLUSTER_ZOOM,
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

  buildCityClusterShape,
  buildMarkersShapeAndImages,
} from "../../lib/constants/discover";

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
  const clusterCenter = cityCenter ?? DEFAULT_CITY_CENTER;
  const isCityCluster =
    typeof mapZoom === "number" && mapZoom <= CITY_CLUSTER_ZOOM && filteredMarkers.length > 0;
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

  const { shape, images, clusterEnabled } = useMemo(() => {
    if (isCityCluster) {
      const shape = buildCityClusterShape(clusterCenter, filteredMarkers.length);
      return {
        clusterEnabled: false,
        images: mergedImages,
        shape,
      };
    }

    const { images, shape } = buildMarkersShapeAndImages(filteredMarkers, mergedImages);
    return {
      clusterEnabled: true,
      images,
      shape,
    };
  }, [clusterCenter, filteredMarkers, isCityCluster, mergedImages]);


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

  return (
    <MapView
      ref={mapViewRef}
      style={styles.map}
      styleURL={Mapbox.StyleURL.Street}
      scaleBarEnabled={false}
      onCameraChanged={handleCameraChanged}
      onPress={() => {
        if (selectedGroup) {
          onMarkerPress?.("");
        }
      }}
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
        cluster={clusterEnabled}
        clusterRadius={120}
        clusterMaxZoomLevel={CLUSTERING_MAX_ZOOM}
        onPress={(e) => {
          const feature = e.features?.[0];
          if (!feature) {
            // Clicked outside any marker, close the list if open
            if (selectedGroup) {
              onMarkerPress?.("");
            }
            return;
          }

          const id = String(feature.id);
          onMarkerPress?.(id);
        }}
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
          coordinate={[
            selectedGroup.coord.lng,
            selectedGroup.coord.lat,
          ]}
          anchor={{ x: 0.5, y: 0 }}
          onSelected={() => {
            onMarkerPress?.("");
            navigation.navigate("BusinessDetailScreen", {
              branch: DUMMY_BRANCH,
            });
          }}
          draggable={false}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              minWidth: 200,
              maxWidth: 300,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 6,
              marginTop: 40, // 40px pod pinom
            }}
            pointerEvents="none"
          >
            {selectedGroup.items.map((item, index) => (
              <View key={item.id}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {item.category !== "Multi" && (
                      <Image
                        source={categoryIcons[item.category]}
                        style={{ width: 16, height: 16, marginRight: 6 }}
                      />
                    )}
                    <Text style={{ fontSize: 14, fontWeight: "600" }}>
                      {item.id}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={require("../../images/star_black.png")}
                      style={{ width: 12, height: 12, marginRight: 4 }}
                    />
                    <Text style={{ fontSize: 12 }}>
                      {item.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
                {index < selectedGroup.items.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: "#E6E6E6",
                      marginVertical: 4,
                    }}
                  />
                )}
              </View>
            ))}
          </View>
        </Mapbox.PointAnnotation>
      )}
    </MapView>
  );
}

export default memo(DiscoverMap);

import React, { memo, useCallback, useMemo, useRef, useEffect } from "react";
import { Image, useWindowDimensions, View, Text, TouchableOpacity, Pressable } from "react-native";
import Mapbox, {
  Camera,
  MapView,
  LocationPuck,
  UserLocation,
  ShapeSource,
  SymbolLayer,
} from "@rnmapbox/maps";
import type { Feature, FeatureCollection, Point } from "geojson";
import type { DiscoverMapProps } from "../../lib/interfaces";
import { styles } from "./discoverStyles";
import { useNavigation } from "@react-navigation/native";


const DUMMY_BRANCH = {
  title: "365 GYM Nitra",
  image: require("../../assets/365.jpg"),
  rating: 4.6,
  category: "Fitness",
  distance: "1.7 km",
  hours: "9:00 - 21:00",
  discount: "20% discount on first entry",
  moreCount: 2,
  address: "Chrenovská 16, Nitra",
  phone: "+421903776925",
  email: "info@365gym.sk",
  website: "https://365gym.sk",
};

const CLUSTER_IMAGE = require("../../images/group_pin.png");
const FILTER_CLUSTER_IMAGE = require("../../images/filter_pin.png");
const BADGE_IMAGE = require("../../images/badge.png");
const STAR_IMAGE = require("../../images/star_white.png");
const NAVIGATION_IMAGE = require("../../images/navigation.png");
const NAVIGATION_IMAGE_URI = Image.resolveAssetSource(NAVIGATION_IMAGE).uri;
const CITY_CLUSTER_ZOOM = 12;
const CLUSTER_MAX_ZOOM = 14;
const CLUSTERING_MAX_ZOOM = CLUSTER_MAX_ZOOM - 0.01;
const CLUSTER_FADE_RANGE = 0.25;
const DEFAULT_CAMERA_ZOOM = 14;
const DEFAULT_CITY_CENTER: [number, number] = [18.091, 48.3069];
const CLUSTER_DEFAULT_NAME = "clusterDefault";
const CLUSTER_FILTER_NAME = "clusterFilter";
const BADGE_IMAGE_NAME = "badge";
const STAR_IMAGE_NAME = "star";
const BADGE_BASE_OFFSET_X = 14;
const BADGE_BASE_OFFSET_Y = -53;
const BADGE_BASE_CENTER_Y = BADGE_BASE_OFFSET_Y - 8;
const STAR_BASE_OFFSET_X = BADGE_BASE_OFFSET_X - 8;
const STAR_BASE_OFFSET_Y = BADGE_BASE_CENTER_Y + 3;
const TEXT_BASE_OFFSET_X = BADGE_BASE_OFFSET_X;
const TEXT_BASE_OFFSET_Y = BADGE_BASE_CENTER_Y;
const BADGE_BASE_WIDTH = 360;
const CLUSTER_FILTER = ["has", "point_count"] as const;
const MARKER_FILTER = ["!", CLUSTER_FILTER] as const;
const USER_PUCK_SCALE = ["interpolate", ["linear"], ["zoom"], 10, 1.0, 20, 4.0] as const;
const USER_PUCK_PULSING = {
  isEnabled: true,
  color: "teal",
  radius: 50.0,
} as const;
const NOT_MULTI_FILTER = [
  "all",
  MARKER_FILTER,
  ["!=", ["get", "isMulti"], true],
] as const;

type MarkerFeatureProps = { icon: string; rating: string, isMulti?: boolean; };
type IconRegistry = Record<string, any>;

const BASE_IMAGES: IconRegistry = {
  [CLUSTER_DEFAULT_NAME]: CLUSTER_IMAGE,
  [CLUSTER_FILTER_NAME]: FILTER_CLUSTER_IMAGE,
  [BADGE_IMAGE_NAME]: BADGE_IMAGE,
  [STAR_IMAGE_NAME]: STAR_IMAGE,
};

const clusterFadeOut = [
  "interpolate",
  ["linear"],
  ["zoom"],
  CLUSTER_MAX_ZOOM - CLUSTER_FADE_RANGE,
  1,
  CLUSTERING_MAX_ZOOM,
  0,
] as const;

const markerFadeIn = [
  "interpolate",
  ["linear"],
  ["zoom"],
  CLUSTER_MAX_ZOOM - CLUSTER_FADE_RANGE,
  0,
  CLUSTER_MAX_ZOOM,
  1,
] as const;

const clusterLayerBase = {
  iconSize: 1,
  iconAnchor: "bottom",
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  iconOpacity: clusterFadeOut,
  textField: ["to-string", ["get", "point_count"]],
  textSize: 13,
  textFont: ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
  textColor: "#fff",
  textAnchor: "center",
  textOffset: [0, -3.2],
  textOpacity: clusterFadeOut,
  textAllowOverlap: true,
  textIgnorePlacement: true,
} as const;

const pointLayerStyle = {
  iconImage: ["get", "icon"],
  iconSize: 1,
  iconAnchor: "bottom",
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  iconOpacity: markerFadeIn,
} as const;

const badgeLayerBase = {
  iconImage: BADGE_IMAGE_NAME,
  iconSize: 1,
  iconAnchor: "bottom",
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  iconOffset: [0, 0],
  iconTranslateAnchor: "viewport",
  iconOpacity: markerFadeIn,
} as const;

const badgeStarLayerBase = {
  iconImage: STAR_IMAGE_NAME,
  iconSize: 0.62,
  iconAnchor: "bottom",
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  iconOffset: [0, 0],
  iconTranslateAnchor: "viewport",
  iconOpacity: markerFadeIn,
} as const;

const badgeTextLayerBase = {
  textField: ["get", "rating"],
  textSize: 10,
  textFont: ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
  textColor: "#fff",
  textAnchor: "left",
  textOffset: [0, 0],
  textTranslateAnchor: "viewport",
  textOpacity: markerFadeIn,
  textAllowOverlap: true,
  textIgnorePlacement: true,
} as const;

const toFeatureCollection = <TProps,>(features: Feature<Point, TProps>[]) =>
  ({
    type: "FeatureCollection",
    features,
  }) as FeatureCollection<Point, TProps>;

const buildCityClusterShape = (center: [number, number], count: number) => {
  const cityFeature: Feature<Point, { point_count: number }> = {
    type: "Feature",
    id: "city-cluster",
    properties: { point_count: count },
    geometry: { type: "Point", coordinates: center },
  };
  return toFeatureCollection([cityFeature]);
};

const resolveMarkerIconName = (
  markerIcon: DiscoverMapProps["filteredMarkers"][number]["icon"],
  images: IconRegistry,
  iconNameByKey: Map<string, string>
) => {
  if (typeof markerIcon === "string" && images[markerIcon]) {
    return markerIcon;
  }

  const key = String(markerIcon);
  let iconName = iconNameByKey.get(key);
  if (!iconName) {
    iconName = `marker-${key}`;
    iconNameByKey.set(key, iconName);
    images[iconName] = markerIcon;
  }
  return iconName;
};

const buildMarkersShapeAndImages = (
  markers: DiscoverMapProps["filteredMarkers"],
  baseImages: IconRegistry
) => {
  const images: IconRegistry = { ...baseImages };
  const iconNameByKey = new Map<string, string>();
  const features: Feature<Point, MarkerFeatureProps>[] = [];

  markers.forEach((marker) => {
    const iconName = resolveMarkerIconName(marker.icon, images, iconNameByKey);
    const rating = marker.rating.toFixed(1);
    const isMulti = marker.category === "Multi";

    features.push({
      type: "Feature",
      id: marker.id,
      properties: {
        icon: iconName,
        rating,
        isMulti, // pridal som multi
      },
      geometry: {
        type: "Point",
        coordinates: [marker.coord.lng, marker.coord.lat],
      },
    });
  });

  return {
    images,
    shape: toFeatureCollection(features),
  };
};


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

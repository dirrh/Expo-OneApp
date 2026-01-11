import { Image} from "react-native";
import type { Feature, FeatureCollection, Point } from "geojson";
import type { DiscoverMapProps } from "../../lib/interfaces";

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

type MarkerFeatureProps = { icon: string; rating: string, isMulti?: boolean; };
type IconRegistry = Record<string, any>;


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

export {
  DUMMY_BRANCH,
  CITY_CLUSTER_ZOOM,
  CLUSTER_MAX_ZOOM,
  CLUSTERING_MAX_ZOOM,
  CLUSTER_FADE_RANGE,
  DEFAULT_CAMERA_ZOOM,
  DEFAULT_CITY_CENTER,

  CLUSTER_DEFAULT_NAME,
  CLUSTER_FILTER_NAME,
  BADGE_IMAGE_NAME,
  STAR_IMAGE_NAME,

  BADGE_BASE_OFFSET_X,
  BADGE_BASE_OFFSET_Y,
  BADGE_BASE_CENTER_Y,
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

  BASE_IMAGES,
  clusterFadeOut,
  markerFadeIn,
  clusterLayerBase,
  pointLayerStyle,
  badgeLayerBase,
  badgeStarLayerBase,
  badgeTextLayerBase,
  NAVIGATION_IMAGE_URI,

  buildCityClusterShape,
  buildMarkersShapeAndImages,
};
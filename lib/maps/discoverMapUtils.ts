// discoverMapUtils: zdielane helpery pre render map markerov.
// Zodpovednost: geometria, validacie a pomocne mapove utility.
// Vstup/Vystup: ciste funkcie pouzivane v DiscoverMap komponente.

import { Image } from "react-native";
import type { ImageURISource } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Region } from "react-native-maps";
import type { DiscoverMapMarker } from "../interfaces";

const CLUSTER_PIN_COLOR = "#111827";
const FILTER_CLUSTER_PIN_COLOR = "#EB8100";
const IOS_MARKER_SIZE_FACTOR = 0.375;

const CATEGORY_PIN_COLORS: Record<DiscoverMapMarker["category"], string> = {
  Fitness: "#2563EB",
  Gastro: "#16A34A",
  Relax: "#0891B2",
  Beauty: "#DB2777",
  Multi: CLUSTER_PIN_COLOR,
};

const IOS_SCALED_MARKER_SIZE_CACHE = new Map<number, { width: number; height: number }>();

export const getIOSScaledSizeFromDimensions = (width: number, height: number) => ({
  width: Math.max(1, Math.round(width * IOS_MARKER_SIZE_FACTOR)),
  height: Math.max(1, Math.round(height * IOS_MARKER_SIZE_FACTOR)),
});

export const projectToWorld = (
  longitude: number,
  latitude: number,
  worldSize: number
) => {
  const x = ((longitude + 180) / 360) * worldSize;
  const sinLat = Math.sin((latitude * Math.PI) / 180);
  const clampedSinLat = Math.min(0.9999, Math.max(-0.9999, sinLat));
  const y =
    (0.5 -
      Math.log((1 + clampedSinLat) / (1 - clampedSinLat)) / (4 * Math.PI)) *
    worldSize;

  return { x, y };
};

export const getPixelDistanceSq = (
  a: { x: number; y: number },
  b: { x: number; y: number }
) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const appendUniqueValue = (items: string[], value: string) =>
  items.includes(value) ? items : [...items, value];

export const wrapWorldDelta = (delta: number, worldSize: number) => {
  if (delta > worldSize / 2) {
    return delta - worldSize;
  }
  if (delta < -worldSize / 2) {
    return delta + worldSize;
  }
  return delta;
};

export const isFiniteCoordinate = (latitude: number, longitude: number) => {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
};

export const isValidMapCoordinate = (latitude: number, longitude: number) => {
  return (
    isFiniteCoordinate(latitude, longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

export const isValidMarkerImage = (
  image: number | ImageURISource | undefined
): image is number | ImageURISource => {
  if (typeof image === "number") {
    return Number.isFinite(image) && image > 0;
  }
  if (!image || typeof image !== "object") {
    return false;
  }
  return typeof image.uri === "string" && image.uri.length > 0;
};

export const getIOSScaledMarkerSize = (imageSource: number) => {
  const cached = IOS_SCALED_MARKER_SIZE_CACHE.get(imageSource);
  if (cached) {
    return cached;
  }

  const resolved = Image.resolveAssetSource(imageSource);
  const baseWidth =
    typeof resolved?.width === "number" && Number.isFinite(resolved.width)
      ? resolved.width
      : 48;
  const baseHeight =
    typeof resolved?.height === "number" && Number.isFinite(resolved.height)
      ? resolved.height
      : 48;
  const scaled = getIOSScaledSizeFromDimensions(baseWidth, baseHeight);
  IOS_SCALED_MARKER_SIZE_CACHE.set(imageSource, scaled);
  return scaled;
};

export const isValidRegion = (region: Region) => {
  return (
    Number.isFinite(region.latitude) &&
    Number.isFinite(region.longitude) &&
    Number.isFinite(region.latitudeDelta) &&
    Number.isFinite(region.longitudeDelta)
  );
};

export const getTooltipCategoryIcon = (
  category?: DiscoverMapMarker["category"]
): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case "Gastro":
      return "restaurant-outline";
    case "Beauty":
      return "sparkles-outline";
    case "Relax":
      return "leaf-outline";
    case "Fitness":
      return "barbell-outline";
    default:
      return "apps-outline";
  }
};

export const toMarkerTitle = (marker: DiscoverMapMarker) => {
  const fallback = marker.id
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());

  const explicit = marker.title?.trim();
  if (explicit && explicit.length > 3) {
    return explicit;
  }
  return fallback;
};

export const getMarkerNumericRating = (marker?: DiscoverMapMarker) => {
  if (!marker) {
    return null;
  }
  const parsed =
    typeof marker.rating === "number"
      ? marker.rating
      : typeof marker.ratingFormatted === "string"
        ? Number.parseFloat(marker.ratingFormatted)
        : NaN;
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(5, Math.max(0, parsed));
};

export interface MarkerColorTarget {
  isCluster: boolean;
  isStacked?: boolean;
  category?: DiscoverMapMarker["category"];
}

export const getDefaultPinColor = (
  marker: MarkerColorTarget,
  hasActiveFilter?: boolean
) => {
  if (marker.isCluster) {
    return hasActiveFilter ? FILTER_CLUSTER_PIN_COLOR : CLUSTER_PIN_COLOR;
  }
  if (marker.isStacked) {
    return CLUSTER_PIN_COLOR;
  }
  const category = marker.category ?? "Multi";
  return CATEGORY_PIN_COLORS[category] ?? CLUSTER_PIN_COLOR;
};

import { Dimensions } from "react-native";
import type { Region } from "react-native-maps";
import type { MapViewRef } from "../interfaces";

type MapCameraOptions = {
  center: [number, number];
  zoom: number;
  durationMs?: number;
  aspectRatio?: number;
};

const MIN_ZOOM = 0;
const MAX_ZOOM = 20;
const MIN_DELTA = 0.00001;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const getDefaultAspectRatio = () => {
  const { width, height } = Dimensions.get("window");
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0) {
    return 1;
  }
  return height / width;
};

export const zoomToRegion = (
  center: [number, number],
  zoom: number,
  aspectRatio: number = getDefaultAspectRatio()
): Region => {
  const normalizedZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const longitudeDelta = 360 / Math.pow(2, normalizedZoom);
  const safeAspectRatio =
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const latitudeDelta = longitudeDelta * safeAspectRatio;

  return {
    latitude: center[1],
    longitude: center[0],
    latitudeDelta: Math.max(MIN_DELTA, latitudeDelta),
    longitudeDelta: Math.max(MIN_DELTA, longitudeDelta),
  };
};

export const regionToZoom = (region: Partial<Region> | null | undefined) => {
  const delta =
    typeof region?.longitudeDelta === "number"
      ? Math.abs(region.longitudeDelta)
      : NaN;
  if (!Number.isFinite(delta) || delta <= 0) {
    return MIN_ZOOM;
  }
  return clamp(Math.log2(360 / delta), MIN_ZOOM, MAX_ZOOM);
};

export const setMapCamera = (ref: MapViewRef, options: MapCameraOptions) => {
  const view = ref.current;
  if (!view) return;

  const { center, zoom, durationMs = 500, aspectRatio } = options;
  const region = zoomToRegion(center, zoom, aspectRatio);
  const animationDuration = durationMs > 0 ? durationMs : 0;

  view.animateToRegion(region, animationDuration);
};

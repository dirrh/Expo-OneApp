import type { Region } from "react-native-maps";
import type { DiscoverMapMarker } from "../interfaces";

type ViewportFilterOptions = {
  marginRatio?: number;
  minimumZoom?: number;
};

type RegionFilterOptions = {
  marginRatio?: number;
};

/**
 * Approximates the visible map span in degrees for a given zoom level.
 *
 * Baseline: at zoom 14, the viewport is roughly 0.03 deg lat/lng.
 * Each zoom step doubles or halves the visible span.
 */
export const getViewportDelta = (zoom: number): number => {
  if (!Number.isFinite(zoom)) return 180;
  const clampedZoom = Math.max(0, Math.min(20, zoom));
  return 0.03 * Math.pow(2, 14 - clampedZoom);
};

/**
 * Filters markers to those inside the current viewport plus a configurable margin.
 */
export const filterMarkersByViewport = (
  markers: DiscoverMapMarker[],
  center: [number, number],
  zoom: number,
  options?: ViewportFilterOptions
): DiscoverMapMarker[] => {
  if (markers.length === 0) return markers;

  const minimumZoom =
    typeof options?.minimumZoom === "number" && Number.isFinite(options.minimumZoom)
      ? options.minimumZoom
      : 11;
  const marginRatio =
    typeof options?.marginRatio === "number" && Number.isFinite(options.marginRatio)
      ? Math.max(0, options.marginRatio)
      : 0.5;

  if (zoom < minimumZoom) return markers;

  const [centerLng, centerLat] = center;
  if (!Number.isFinite(centerLng) || !Number.isFinite(centerLat)) {
    return markers;
  }

  const delta = getViewportDelta(zoom);
  const margin = delta * marginRatio;
  const deltaWithMargin = delta + margin;

  const minLat = centerLat - deltaWithMargin;
  const maxLat = centerLat + deltaWithMargin;
  const minLng = centerLng - deltaWithMargin;
  const maxLng = centerLng + deltaWithMargin;

  if (maxLng > 180) {
    return markers.filter((marker) => {
      const lat = marker.coord?.lat;
      const lng = marker.coord?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      const latOk = (lat as number) >= minLat && (lat as number) <= maxLat;
      return latOk && ((lng as number) >= minLng || (lng as number) <= maxLng - 360);
    });
  }

  if (minLng < -180) {
    return markers.filter((marker) => {
      const lat = marker.coord?.lat;
      const lng = marker.coord?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      const latOk = (lat as number) >= minLat && (lat as number) <= maxLat;
      return latOk && ((lng as number) <= maxLng || (lng as number) >= minLng + 360);
    });
  }

  return markers.filter((marker) => {
    const lat = marker.coord?.lat;
    const lng = marker.coord?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return (
      (lat as number) >= minLat &&
      (lat as number) <= maxLat &&
      (lng as number) >= minLng &&
      (lng as number) <= maxLng
    );
  });
};

export const filterMarkersByRegion = (
  markers: DiscoverMapMarker[],
  region: Region,
  options?: RegionFilterOptions
): DiscoverMapMarker[] => {
  if (markers.length === 0) return markers;

  const centerLat = region.latitude;
  const centerLng = region.longitude;
  const latitudeDelta = Math.abs(region.latitudeDelta);
  const longitudeDelta = Math.abs(region.longitudeDelta);
  const marginRatio =
    typeof options?.marginRatio === "number" && Number.isFinite(options.marginRatio)
      ? Math.max(0, options.marginRatio)
      : 0;

  if (
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLng) ||
    !Number.isFinite(latitudeDelta) ||
    !Number.isFinite(longitudeDelta) ||
    latitudeDelta <= 0 ||
    longitudeDelta <= 0
  ) {
    return markers;
  }

  const latHalfSpan = latitudeDelta / 2;
  const lngHalfSpan = longitudeDelta / 2;
  const latMargin = latHalfSpan * marginRatio;
  const lngMargin = lngHalfSpan * marginRatio;

  const minLat = centerLat - latHalfSpan - latMargin;
  const maxLat = centerLat + latHalfSpan + latMargin;
  const minLng = centerLng - lngHalfSpan - lngMargin;
  const maxLng = centerLng + lngHalfSpan + lngMargin;

  if (maxLng > 180) {
    return markers.filter((marker) => {
      const lat = marker.coord?.lat;
      const lng = marker.coord?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      const latOk = (lat as number) >= minLat && (lat as number) <= maxLat;
      return latOk && ((lng as number) >= minLng || (lng as number) <= maxLng - 360);
    });
  }

  if (minLng < -180) {
    return markers.filter((marker) => {
      const lat = marker.coord?.lat;
      const lng = marker.coord?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      const latOk = (lat as number) >= minLat && (lat as number) <= maxLat;
      return latOk && ((lng as number) <= maxLng || (lng as number) >= minLng + 360);
    });
  }

  return markers.filter((marker) => {
    const lat = marker.coord?.lat;
    const lng = marker.coord?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return (
      (lat as number) >= minLat &&
      (lat as number) <= maxLat &&
      (lng as number) >= minLng &&
      (lng as number) <= maxLng
    );
  });
};

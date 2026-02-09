import { useMemo } from "react";
import Supercluster from "supercluster";
import type { DiscoverMapMarker } from "../interfaces";

type ClusterPointProps = {
  id?: string;
  markerId?: string;
  weight?: number;
  isCluster?: boolean;
  cluster?: boolean;
  cluster_id?: number;
  point_count?: number;
};

export type ClusterFeature = {
  type: "Feature";
  id?: string | number;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: ClusterPointProps;
};

type ClusterPointInputFeature = {
  type: "Feature";
  id?: string | number;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    markerId: string;
    weight: number;
    isCluster: boolean;
  };
};

const WORLD_BOUNDS: [number, number, number, number] = [-180, -85, 180, 85];

const toGeoJsonPoint = (marker: DiscoverMapMarker): ClusterPointInputFeature => ({
  type: "Feature",
  id: marker.id,
  properties: {
    id: marker.id,
    markerId: marker.id,
    weight: 1,
    isCluster: false,
  },
  geometry: {
    type: "Point",
    coordinates: [marker.coord.lng, marker.coord.lat] as [number, number],
  },
});

const normalizeZoom = (zoom: number) =>
  Math.max(0, Math.min(20, Math.round(zoom)));

export const getClusterRadiusForZoom = (zoom: number) => {
  const normalizedZoom = normalizeZoom(zoom);
  if (normalizedZoom <= 10) return 140;
  if (normalizedZoom <= 12) return 100;
  if (normalizedZoom <= 14) return 65;
  return 45;
};

export const useDiscoverClusters = (
  markers: DiscoverMapMarker[],
  zoom: number,
  clusterRadius?: number
) => {
  return useMemo(() => {
    const normalizedZoom = normalizeZoom(zoom);
    const dynamicRadius = clusterRadius ?? getClusterRadiusForZoom(normalizedZoom);

    const index = new Supercluster({
      radius: dynamicRadius,
      maxZoom: 20,
      minPoints: 2,
    });

    const points = markers
      .filter((marker) =>
        Number.isFinite(marker.coord?.lng) && Number.isFinite(marker.coord?.lat)
      )
      .map(toGeoJsonPoint);
    index.load(points);

    const clusters = index.getClusters(WORLD_BOUNDS, normalizedZoom) as unknown as ClusterFeature[];

    return { clusters, index };
  }, [markers, zoom, clusterRadius]);
};

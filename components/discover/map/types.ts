import type { ImageURISource } from "react-native";
import type { DiscoverMapMarker } from "../../../lib/interfaces";

export type RenderFeature = {
  id: string;
  isCluster: boolean;
  count: number;
  coordinates: { latitude: number; longitude: number };
  focusCoordinates?: { latitude: number; longitude: number };
  marker?: DiscoverMapMarker;
};

export type RenderMarker = {
  key: string;
  id: string;
  coordinate: { latitude: number; longitude: number };
  image?: number | ImageURISource;
  anchor?: { x: number; y: number };
  category?: DiscoverMapMarker["category"];
  markerData?: DiscoverMapMarker;
  zIndex: number;
  isCluster: boolean;
  isStacked?: boolean;
  stackedItems?: DiscoverMapMarker[];
  focusCoordinate: { latitude: number; longitude: number };
};

export type ClusterPointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { markerId: string; weight: number };
};

export type ClusterViewportBounds = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

export type ClusterBucket = {
  display: { latitude: number; longitude: number };
  focus: { latitude: number; longitude: number };
  countRaw: number;
  px: { x: number; y: number };
  memberIds: string[];
};

export type OrphanPoint = {
  id: string;
  coordinate: { latitude: number; longitude: number };
  weight: number;
  px: { x: number; y: number };
};

export type ClusteredFeaturesBuildParams = {
  rawClusters: Array<{
    geometry?: { coordinates?: [number, number] };
    properties?: {
      cluster?: boolean;
      cluster_id?: number;
      point_count?: number;
      weight?: number;
      markerId?: string;
    };
  }>;
  worldSize: number;
  clusterRadiusPx: number;
  isIOS: boolean;
  shouldCullClustersByViewport: boolean;
  paddedViewport: ClusterViewportBounds | null;
};

export type SingleLayerMarkerGroup = {
  id: string;
  coordinate: { latitude: number; longitude: number };
  items: DiscoverMapMarker[];
};

export type ResolvedMarkerVisual = {
  compactImage?: number | ImageURISource;
  compactAnchor?: { x: number; y: number };
  iosStableCompactImage?: number;
  iosStableCompactAnchor?: { x: number; y: number };
  iosStableFullImage?: number;
  iosStableFullAnchor?: { x: number; y: number };
  fullOverlayImage?: number | ImageURISource;
  fullOverlayAnchor?: { x: number; y: number };
  hasRenderableFullOverlay: boolean;
};

export type BuildResolvedMarkerVisualsParams = {
  markers: RenderMarker[];
  failedRemoteSpriteKeySet: Set<string>;
  fullSpriteTextLayersEnabled: boolean;
  isIOSStableMarkersMode: boolean;
  useOverlayFullSprites: boolean;
};

export type MapLayoutSize = {
  width: number;
  height: number;
};

export type InlineLabelRecomputeSource =
  | "dataset"
  | "layout"
  | "map-ready"
  | "region-change"
  | "region-complete"
  | "marker-press";

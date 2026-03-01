import type { DiscoverMapMarker } from "../../../../lib/interfaces";
import type { RenderFeature } from "../types";

export type IOSV3Mode = "cluster" | "single";

export type IOSV3RenderItemKind = "cluster" | "single" | "grouped" | "placeholder";

export type IOSV3Coordinate = {
  latitude: number;
  longitude: number;
};

export type IOSV3ViewportSize = {
  width: number;
  height: number;
};

export type IOSV3CollisionRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type IOSV3TextVariant = "compact" | "labeled" | "full";

export type IOSV3RenderItem = {
  key: string;
  id: string;
  kind: IOSV3RenderItemKind;
  coordinate: IOSV3Coordinate;
  focusCoordinate: IOSV3Coordinate;
  image: number | { uri: string };
  anchor?: { x: number; y: number };
  zIndex: number;
  markerData?: DiscoverMapMarker;
  groupedItems?: DiscoverMapMarker[];
  isPoolPlaceholder?: boolean;
  poolSlot?: number;
};

export type IOSV3MarkerGroup = {
  id: string;
  coordinate: IOSV3Coordinate;
  items: DiscoverMapMarker[];
};

export type IOSV3TextBudget = {
  maxTextMarkers: number;
  maxFullMarkers: number;
};

export type IOSV3TextCollisionCandidate = {
  id: string;
  kind: "single" | "grouped";
  coordinate: IOSV3Coordinate;
  hasFullText?: boolean;
  hasLabeledText?: boolean;
  fullTextWidth?: number;
  labeledTextWidth?: number;
};

export type IOSV3TextCollisionParams = {
  candidates: IOSV3TextCollisionCandidate[];
  cameraCenter: [number, number];
  renderZoom: number;
  viewportSize: IOSV3ViewportSize;
  textBudget: IOSV3TextBudget;
  userCoordinate?: IOSV3Coordinate | null;
};

export type IOSV3TextCollisionResult = {
  variantByMarkerId: Map<string, IOSV3TextVariant>;
};

export type IOSV3ViewportBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type BuildIOSV3DatasetParams = {
  mode: IOSV3Mode;
  groups: IOSV3MarkerGroup[];
  clusteredFeatures: RenderFeature[];
  hasActiveFilter: boolean;
  cameraCenter: [number, number];
  renderZoom: number;
  viewportSize: IOSV3ViewportSize;
  poolSize: number;
  textBudget?: IOSV3TextBudget;
  userCoordinate?: IOSV3Coordinate | null;
  viewportBounds?: IOSV3ViewportBounds;
};

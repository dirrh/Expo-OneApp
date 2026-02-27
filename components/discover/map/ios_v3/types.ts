import type { DiscoverMapMarker } from "../../../../lib/interfaces";
import type { RenderFeature } from "../types";

export type IOSV3Mode = "cluster" | "single";

export type IOSV3RenderItemKind = "cluster" | "single" | "grouped" | "placeholder";

export type IOSV3Coordinate = {
  latitude: number;
  longitude: number;
};

export type IOSV3RenderItem = {
  key: string;
  id: string;
  kind: IOSV3RenderItemKind;
  coordinate: IOSV3Coordinate;
  focusCoordinate: IOSV3Coordinate;
  image: number;
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

export type BuildIOSV3DatasetParams = {
  mode: IOSV3Mode;
  groups: IOSV3MarkerGroup[];
  clusteredFeatures: RenderFeature[];
  hasActiveFilter: boolean;
  cameraCenter: [number, number];
  poolSize: number;
};


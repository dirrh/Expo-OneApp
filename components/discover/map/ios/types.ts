import type { DiscoverMapMarker } from "../../../../lib/interfaces";
import type { IOSDisplayMode as ModeAlias } from "../pipelines/iosDisplayMode";

export type IOSDisplayMode = ModeAlias;

export type IOSRenderItemKind = "cluster" | "stacked" | "single" | "placeholder";

export type IOSRenderItem = {
  key: string;
  id: string;
  kind: IOSRenderItemKind;
  coordinate: { latitude: number; longitude: number };
  focusCoordinate: { latitude: number; longitude: number };
  image: number;
  anchor?: { x: number; y: number };
  zIndex: number;
  isCluster: boolean;
  isStacked?: boolean;
  markerData?: DiscoverMapMarker;
  stackedItems?: DiscoverMapMarker[];
  isPoolPlaceholder?: boolean;
  poolSlot?: number;
};

export type IOSPoolSlot = {
  slot: number;
  markerId: string | null;
};

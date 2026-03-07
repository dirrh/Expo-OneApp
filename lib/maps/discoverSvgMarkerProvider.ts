import type { DiscoverMapMarker } from "../interfaces";

export type DiscoverSvgMarkerSpec = {
  asset: number;
  width: number;
  height: number;
  anchor: { x: number; y: number };
};

export type DiscoverSvgBadgeSpec = {
  asset: number;
  width: number;
  height: number;
};

const SVG_MARKER_DISPLAY_WIDTH = 47;
const SVG_MARKER_DISPLAY_HEIGHT = 54;
const SVG_MARKER_ANCHOR = { x: 0.5, y: 0.91 } as const;
const SVG_RATING_BADGE_WIDTH = 32;
const SVG_RATING_BADGE_HEIGHT = 14;

const SVG_MARKER_BY_CATEGORY: Partial<
  Record<DiscoverMapMarker["category"], DiscoverSvgMarkerSpec>
> = {
  Beauty: {
    asset: require("../../assets/svg_markers/beauty.svg"),
    width: SVG_MARKER_DISPLAY_WIDTH,
    height: SVG_MARKER_DISPLAY_HEIGHT,
    anchor: SVG_MARKER_ANCHOR,
  },
  Fitness: {
    asset: require("../../assets/svg_markers/fitness.svg"),
    width: SVG_MARKER_DISPLAY_WIDTH,
    height: SVG_MARKER_DISPLAY_HEIGHT,
    anchor: SVG_MARKER_ANCHOR,
  },
  Gastro: {
    asset: require("../../assets/svg_markers/gastro.svg"),
    width: SVG_MARKER_DISPLAY_WIDTH,
    height: SVG_MARKER_DISPLAY_HEIGHT,
    anchor: SVG_MARKER_ANCHOR,
  },
  Relax: {
    asset: require("../../assets/svg_markers/relax.svg"),
    width: SVG_MARKER_DISPLAY_WIDTH,
    height: SVG_MARKER_DISPLAY_HEIGHT,
    anchor: SVG_MARKER_ANCHOR,
  },
};

const SVG_CLUSTER_MARKER: DiscoverSvgMarkerSpec = {
  asset: require("../../assets/svg_markers/cluster.svg"),
  width: SVG_MARKER_DISPLAY_WIDTH,
  height: SVG_MARKER_DISPLAY_HEIGHT,
  anchor: SVG_MARKER_ANCHOR,
};

const SVG_ACTIVE_CLUSTER_MARKER: DiscoverSvgMarkerSpec = {
  asset: require("../../assets/svg_markers/cluster_active.svg"),
  width: SVG_MARKER_DISPLAY_WIDTH,
  height: SVG_MARKER_DISPLAY_HEIGHT,
  anchor: SVG_MARKER_ANCHOR,
};

const SVG_RATING_BADGE: DiscoverSvgBadgeSpec = {
  asset: require("../../assets/svg_markers/badge_rating_pill.svg"),
  width: SVG_RATING_BADGE_WIDTH,
  height: SVG_RATING_BADGE_HEIGHT,
};

export const resolveDiscoverSvgMarker = (
  category?: DiscoverMapMarker["category"]
): DiscoverSvgMarkerSpec | null => {
  if (!category) {
    return null;
  }
  return SVG_MARKER_BY_CATEGORY[category] ?? null;
};

export const resolveDiscoverSvgClusterMarker = (isActiveFilter = false) =>
  isActiveFilter ? SVG_ACTIVE_CLUSTER_MARKER : SVG_CLUSTER_MARKER;

export const resolveDiscoverSvgRatingBadge = () => SVG_RATING_BADGE;

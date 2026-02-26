import type { DiscoverMapMarker } from "../../../../../lib/interfaces";
import type { ClusterCountKey } from "../../../../../lib/maps/clusterIcons";
import { CLUSTER_ICON_SOURCES } from "../../../../../lib/maps/clusterIcons";
import { FILTER_CLUSTER_ICON_SOURCES } from "../../../../../lib/maps/clusterFilterIcons";
import {
  getMarkerCompactFallbackImage,
  resolveMarkerImage,
} from "../../../../../lib/maps/markerImageProvider";
import { IOS_SCALED_FULL_MARKER_BY_KEY } from "../../../../../lib/maps/generatedIOSScaledFullMarkerByKey";
import { IOS_SCALED_STACKED_BY_COUNT } from "../../../../../lib/maps/generatedIOSScaledStackedByCount";
import {
  IOS_SCALED_CLUSTER_BY_COUNT,
  IOS_SCALED_FILTER_CLUSTER_BY_COUNT,
} from "../../../../../lib/maps/generatedIOSScaledClusterByCount";
import {
  IOS_COMPACT_PIN_BY_CATEGORY,
  IOS_COMPACT_PIN_ANCHOR,
} from "../../../../../lib/maps/generatedIOSCompactPins";
import { FULL_MARKER_SPRITES } from "../../../../../lib/maps/generatedFullMarkerSprites";
import { normalizeId } from "../../../../../lib/data/utils/id";
import { STACKED_ICON_SOURCES } from "../../../../../lib/maps/stackedIcons";
import { BASE_ANCHOR_X, BASE_ANCHOR_Y } from "../../constants";

type IOSSpriteResult = {
  image: number;
  anchor: { x: number; y: number };
};

const BASE_ANCHOR = { x: BASE_ANCHOR_X, y: BASE_ANCHOR_Y } as const;
const IOS_SCALED_FULL_MARKER_CANVAS_WIDTH = 402; // 322 × 1.25
const IOS_SCALED_FULL_MARKER_PIN_CENTER_OFFSET_PX = 4; // 3 × 1.25 ≈ 4
const IOS_SCALED_FULL_MARKER_ANCHOR = {
  x:
    (IOS_SCALED_FULL_MARKER_CANVAS_WIDTH / 2 -
      IOS_SCALED_FULL_MARKER_PIN_CENTER_OFFSET_PX) /
    IOS_SCALED_FULL_MARKER_CANVAS_WIDTH,
  y: 0.7862318840579711,
} as const;
// Anchor for cluster icons drawn at 104×141 on the 402×172 normalized canvas.
// Ratios unchanged from 322×138 canvas: pin tip x≈0.492, y≈0.779
const IOS_SCALED_CLUSTER_ANCHOR = {
  x: 0.492,
  y: 0.779,
} as const;
const IOS_FULL_FALLBACK_BY_CATEGORY = {
  Fitness: require("../../../../../images/icons/ios-scaled/full-markers-fallback/fitness.png"),
  Gastro: require("../../../../../images/icons/ios-scaled/full-markers-fallback/gastro.png"),
  Relax: require("../../../../../images/icons/ios-scaled/full-markers-fallback/relax.png"),
  Beauty: require("../../../../../images/icons/ios-scaled/full-markers-fallback/beauty.png"),
  Multi: require("../../../../../images/icons/ios-scaled/full-markers-fallback/gastro.png"),
} as const;

const toSafeClusterCountKey = (count: number): ClusterCountKey =>
  String(Math.max(0, Math.min(99, Math.floor(count)))) as ClusterCountKey;

export const resolveIOSClusterSprite = (
  count: number,
  hasActiveFilter: boolean
): IOSSpriteResult => {
  const key = toSafeClusterCountKey(count);
  // Prefer normalized 322×138 assets so the pool annotation frame never needs to resize.
  const normalizedSet = hasActiveFilter
    ? IOS_SCALED_FILTER_CLUSTER_BY_COUNT
    : IOS_SCALED_CLUSTER_BY_COUNT;
  const normalizedImage = normalizedSet[key];
  if (typeof normalizedImage === "number") {
    return {
      image: normalizedImage,
      anchor: IOS_SCALED_CLUSTER_ANCHOR,
    };
  }
  // Fallback to original cluster sources (165×186) if normalized asset is missing.
  const sourceSet = hasActiveFilter ? FILTER_CLUSTER_ICON_SOURCES : CLUSTER_ICON_SOURCES;
  const source = sourceSet[key] ?? IOS_FULL_FALLBACK_BY_CATEGORY.Multi;
  return {
    image: source,
    anchor: BASE_ANCHOR,
  };
};

export const resolveIOSStackedSprite = (count: number): IOSSpriteResult => {
  const clampedCount = Math.max(2, Math.min(6, Math.floor(count)));
  const scaledImage = IOS_SCALED_STACKED_BY_COUNT[clampedCount];
  if (typeof scaledImage === "number") {
    return {
      image: scaledImage,
      anchor: IOS_SCALED_FULL_MARKER_ANCHOR,
    };
  }
  // Fallback to original stacked icons if normalized asset is missing.
  const key = String(clampedCount) as ClusterCountKey;
  const source =
    STACKED_ICON_SOURCES[key] ??
    STACKED_ICON_SOURCES["6"] ??
    STACKED_ICON_SOURCES["2"] ??
    IOS_FULL_FALLBACK_BY_CATEGORY.Multi;
  return {
    image: source,
    anchor: BASE_ANCHOR,
  };
};

type ResolveIOSSingleSpriteOptions = {
  localOnlySprites: boolean;
};

const resolveScaledFullMarkerImage = (
  marker: DiscoverMapMarker,
  spriteKey: string
): { image: number; anchor: { x: number; y: number } } | null => {
  const markerSpriteKey = marker.markerSpriteKey?.trim();
  const spriteKeyCandidates = [
    markerSpriteKey,
    marker.id,
    spriteKey,
    markerSpriteKey ? normalizeId(markerSpriteKey) : "",
    normalizeId(marker.id),
    normalizeId(spriteKey),
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()));

  for (const candidate of spriteKeyCandidates) {
    const scaledImage = IOS_SCALED_FULL_MARKER_BY_KEY[candidate];
    const localSprite = FULL_MARKER_SPRITES[candidate];
    if (typeof scaledImage === "number" && localSprite) {
      return {
        image: scaledImage,
        // Normalized iOS full-marker assets share one canvas, so anchor must be fixed.
        anchor: IOS_SCALED_FULL_MARKER_ANCHOR,
      };
    }
  }

  return null;
};

export const resolveIOSSingleSprite = (
  marker: DiscoverMapMarker,
  { localOnlySprites }: ResolveIOSSingleSpriteOptions
): IOSSpriteResult => {
  // iOS rewrite path keeps text + rating inside the marker sprite (no floating JS labels).
  const spriteKey = normalizeId(marker.markerSpriteKey?.trim() || marker.id);
  const scaledLocalSprite = resolveScaledFullMarkerImage(marker, spriteKey);
  if (scaledLocalSprite) {
    return scaledLocalSprite;
  }

  if (!localOnlySprites) {
    const fullSprite = resolveMarkerImage(marker, {
      preferFullSprite: true,
      preferLocalFullSprite: false,
    });
    if (typeof fullSprite.image === "number") {
      return {
        image: fullSprite.image,
        anchor: fullSprite.anchor,
      };
    }
  }

  const fallback = getMarkerCompactFallbackImage(marker.category);
  const fallbackFull =
    IOS_FULL_FALLBACK_BY_CATEGORY[marker.category as keyof typeof IOS_FULL_FALLBACK_BY_CATEGORY] ??
    IOS_FULL_FALLBACK_BY_CATEGORY.Multi;
  return {
    image: fallbackFull ?? fallback,
    anchor: fallbackFull ? IOS_SCALED_FULL_MARKER_ANCHOR : BASE_ANCHOR,
  };
};

// Placeholder uses a 322×138 fallback image so that all pool annotation view frames are
// initialized at the canonical canvas size. This prevents MapKit from locking the frame at
// a wrong size when tracksViewChanges=false and the image later changes to a 322×138 sprite.
export const resolveIOSPoolPlaceholderSprite = (): IOSSpriteResult => ({
  image: IOS_FULL_FALLBACK_BY_CATEGORY.Multi,
  anchor: IOS_SCALED_FULL_MARKER_ANCHOR,
});

// Returns the compact (pin-only, no text) version of a single marker sprite.
// Uses badged pin images (no category label) normalized to the 322×138 canvas.
export const resolveIOSCompactSprite = (category: string): IOSSpriteResult => {
  const image = IOS_COMPACT_PIN_BY_CATEGORY[category] ?? IOS_COMPACT_PIN_BY_CATEGORY.Multi;
  return {
    image: image ?? IOS_FULL_FALLBACK_BY_CATEGORY.Multi,
    anchor: IOS_COMPACT_PIN_ANCHOR,
  };
};

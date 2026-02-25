/**
 * markerImageProvider: Mapový modul marker Image Provider rieši špecifickú časť renderu alebo správania mapy.
 *
 * Prečo: Izolované mapové utility v markerImageProvider znižujú riziko regresií pri úpravách markerov a kamery.
 */

import type { ImageSourcePropType, ImageURISource } from "react-native";
import type { DiscoverMapMarker } from "../interfaces";
import { resolveBadgedIconSource } from "./badgedIcons";
import {
  FULL_MARKER_DEFAULT_ANCHOR,
  getLocalFullMarkerSprite,
  hasLocalFullMarkerSpriteKey,
} from "./generatedFullMarkerSprites";
import { normalizeId } from "../data/utils/id";

const FITNESS_ICON = require("../../images/icons/fitness/fitness_without_review.png");
const GASTRO_ICON = require("../../images/icons/gastro/gastro_without_rating.png");
const RELAX_ICON = require("../../images/icons/relax/relax_without_rating.png");
const BEAUTY_ICON = require("../../images/icons/beauty/beauty_without_rating.png");
const MULTI_ICON = require("../../images/icons/multi/multi.png");

const PIN_CANVAS_WIDTH = 165;
const PIN_CANVAS_HEIGHT = 186;
const PIN_TRIM_WIDTH = 153;
const PIN_TRIM_HEIGHT = 177;
const PIN_TRIM_X = 0;
const PIN_TRIM_Y = 0;
const BADGED_CANVAS_HEIGHT = 226;
const BADGED_PIN_OFFSET_Y = 40;

const BASE_ANCHOR_X =
  (PIN_TRIM_X + PIN_TRIM_WIDTH / 2) / PIN_CANVAS_WIDTH;
const BASE_ANCHOR_Y =
  (PIN_TRIM_Y + PIN_TRIM_HEIGHT) / PIN_CANVAS_HEIGHT;
const BADGED_ANCHOR_X = BASE_ANCHOR_X;
const BADGED_ANCHOR_Y =
  (BADGED_PIN_OFFSET_Y + PIN_TRIM_HEIGHT) / BADGED_CANVAS_HEIGHT;

type FullSpriteCollisionZone = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

type FullSpriteCollisionRowSegment = {
  left: number;
  right: number;
};

type FullSpriteCollisionRow = {
  offsetY: number;
  height: number;
  segments: FullSpriteCollisionRowSegment[];
};

type FullSpriteMetrics = {
  width: number;
  height: number;
  anchor: { x: number; y: number };
  collisionRows: FullSpriteCollisionRow[];
  collisionZones: FullSpriteCollisionZone[];
};

const fullSpriteMetricsCache = new Map<string, FullSpriteMetrics>();

const resolveLocalFullAnchor = (width: number, height: number) => {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return FULL_MARKER_DEFAULT_ANCHOR;
  }

  // Align local full sprite pin tip to the same visual anchor used by compact icons.
  const compactTipX = PIN_TRIM_X + PIN_TRIM_WIDTH / 2;
  const fullPinOffsetX = (width - PIN_CANVAS_WIDTH) / 2;
  const anchorX = clampRating((fullPinOffsetX + compactTipX) / width);
  const anchorY = (BADGED_PIN_OFFSET_Y + PIN_TRIM_HEIGHT) / height;

  return {
    x: anchorX,
    y: clampRating(anchorY),
  };
};

const isUriSource = (value: unknown): value is ImageURISource => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const uri = (value as ImageURISource).uri;
  return typeof uri === "string" && uri.length > 0;
};

const toIconSource = (source?: ImageSourcePropType | null) => {
  if (!source) {
    return undefined;
  }
  if (typeof source === "number") {
    return Number.isFinite(source) && source > 0 ? source : undefined;
  }
  if (Array.isArray(source)) {
    const first = source[0];
    if (!first) {
      return undefined;
    }
    if (typeof first === "number") {
      return Number.isFinite(first) && first > 0 ? first : undefined;
    }
    return isUriSource(first) ? first : undefined;
  }
  return isUriSource(source) ? source : undefined;
};

const clampRating = (value: number) => Math.min(5, Math.max(0, value));

const getNumericRating = (marker?: DiscoverMapMarker) => {
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
  return clampRating(parsed);
};

const getFallbackCategoryIcon = (category?: DiscoverMapMarker["category"]) => {
  switch (category) {
    case "Fitness":
      return FITNESS_ICON;
    case "Gastro":
      return GASTRO_ICON;
    case "Relax":
      return RELAX_ICON;
    case "Beauty":
      return BEAUTY_ICON;
    default:
      return MULTI_ICON;
  }
};

export const getMarkerCompactFallbackImage = (
  category?: DiscoverMapMarker["category"]
) => getFallbackCategoryIcon(category);

const normalizeRemoteSpriteUrl = (url?: string | null) => {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return null;
};

export const getMarkerSpriteKey = (marker?: DiscoverMapMarker | null) => {
  if (!marker) {
    return "";
  }
  const explicit = marker.markerSpriteKey?.trim();
  const raw = explicit || marker.id;
  const canonical = normalizeId(raw);
  return canonical || raw;
};

const getMarkerSpriteKeyCandidates = (marker?: DiscoverMapMarker | null) => {
  if (!marker) {
    return [] as string[];
  }

  const explicit = marker.markerSpriteKey?.trim();
  const raw = explicit || marker.id;
  const canonical = normalizeId(raw);
  const candidates = [canonical, raw, marker.id].filter(
    (value): value is string => Boolean(value && value.trim())
  );

  return Array.from(new Set(candidates));
};

export const hasLocalFullMarkerSprite = (marker?: DiscoverMapMarker | null) =>
  getMarkerSpriteKeyCandidates(marker).some((key) =>
    hasLocalFullMarkerSpriteKey(key)
  );

export const getMarkerFullSpriteMetrics = (marker?: DiscoverMapMarker | null) => {
  const spriteKeyCandidates = getMarkerSpriteKeyCandidates(marker);
  let resolvedSpriteKey: string | null = null;
  let sprite: ReturnType<typeof getLocalFullMarkerSprite> | undefined;

  for (const key of spriteKeyCandidates) {
    const candidate = getLocalFullMarkerSprite(key);
    if (!candidate) {
      continue;
    }
    resolvedSpriteKey = key;
    sprite = candidate;
    break;
  }

  if (!sprite || !resolvedSpriteKey) {
    return null;
  }

  const cached = fullSpriteMetricsCache.get(resolvedSpriteKey);
  if (cached) {
    return cached;
  }

  const anchor = resolveLocalFullAnchor(sprite.width, sprite.height);
  const anchorPxX = anchor.x * sprite.width;
  const anchorPxY = anchor.y * sprite.height;
  const collisionRows = sprite.collisionRows
    .filter(
      (row) =>
        Number.isFinite(row.y) &&
        Array.isArray(row.segments) &&
        row.segments.length > 0
    )
    .map((row) => {
      const segments = row.segments
        .filter(
          (segment) =>
            Number.isFinite(segment.left) &&
            Number.isFinite(segment.width) &&
            segment.width > 0
        )
        .map((segment) => ({
          left: segment.left - anchorPxX,
          right: segment.left + segment.width - anchorPxX,
        }))
        .filter((segment) => segment.right > segment.left);
      return {
        offsetY: row.y - anchorPxY,
        height: 1,
        segments,
      };
    })
    .filter((row) => row.segments.length > 0);
  const collisionZones = sprite.collisionZones
    .filter(
      (zone) =>
        Number.isFinite(zone.width) &&
        zone.width > 0 &&
        Number.isFinite(zone.height) &&
        zone.height > 0 &&
        Number.isFinite(zone.left) &&
        Number.isFinite(zone.top)
    )
    .map((zone) => ({
      width: zone.width,
      height: zone.height,
      offsetX: zone.left + zone.width / 2 - anchorPxX,
      offsetY: zone.top + zone.height / 2 - anchorPxY,
    }));

  const metrics: FullSpriteMetrics = {
    width: sprite.width,
    height: sprite.height,
    anchor,
    collisionRows,
    collisionZones,
  };
  fullSpriteMetricsCache.set(resolvedSpriteKey, metrics);
  return metrics;
};

export const getMarkerRemoteSpriteUrl = (marker?: DiscoverMapMarker | null) =>
  normalizeRemoteSpriteUrl(marker?.markerSpriteUrl);

export type ResolvedMarkerImageVariant =
  | "remote-full"
  | "local-full"
  | "compact";

export type ResolvedMarkerImage = {
  image: number | ImageURISource;
  anchor: { x: number; y: number };
  variant: ResolvedMarkerImageVariant;
  spriteKey: string;
};

export type ResolveMarkerImageContext = {
  preferFullSprite?: boolean;
  preferLocalFullSprite?: boolean;
  remoteSpriteFailureKeys?: Set<string>;
};

export const resolveMarkerImage = (
  marker: DiscoverMapMarker,
  context?: ResolveMarkerImageContext
): ResolvedMarkerImage => {
  const spriteKey = getMarkerSpriteKey(marker);
  const spriteKeyCandidates = getMarkerSpriteKeyCandidates(marker);
  const preferFull = Boolean(context?.preferFullSprite);
  const preferLocalFull = Boolean(context?.preferLocalFullSprite);
  const failedRemoteKeys = context?.remoteSpriteFailureKeys;

  if (preferFull) {
    const localFull =
      getLocalFullMarkerSprite(spriteKey) ??
      spriteKeyCandidates
        .map((candidate) => getLocalFullMarkerSprite(candidate))
        .find((candidate) => Boolean(candidate));
    if (preferLocalFull && localFull) {
      return {
        image: localFull.image,
        anchor: resolveLocalFullAnchor(localFull.width, localFull.height),
        variant: "local-full",
        spriteKey,
      };
    }

    const remoteUrl = getMarkerRemoteSpriteUrl(marker);
    if (remoteUrl && !failedRemoteKeys?.has(spriteKey)) {
      return {
        image: { uri: remoteUrl },
        anchor: FULL_MARKER_DEFAULT_ANCHOR,
        variant: "remote-full",
        spriteKey,
      };
    }

    if (localFull) {
      return {
        image: localFull.image,
        anchor: resolveLocalFullAnchor(localFull.width, localFull.height),
        variant: "local-full",
        spriteKey,
      };
    }
  }

  const compactIcon = toIconSource(marker.icon) ?? getFallbackCategoryIcon(marker.category);
  const rating = getNumericRating(marker);
  const ratingIcon =
    marker.category !== "Multi" && rating !== null
      ? resolveBadgedIconSource(marker.category, rating)
      : undefined;
  const finalImage = ratingIcon ?? compactIcon ?? MULTI_ICON;

  return {
    image: finalImage,
    anchor: ratingIcon
      ? { x: BADGED_ANCHOR_X, y: BADGED_ANCHOR_Y }
      : { x: BASE_ANCHOR_X, y: BASE_ANCHOR_Y },
    variant: "compact",
    spriteKey,
  };
};

import type { ImageSourcePropType, ImageURISource } from "react-native";
import type { DiscoverMapMarker } from "../interfaces";
import { resolveBadgedIconSource } from "./badgedIcons";
import {
  FULL_MARKER_DEFAULT_ANCHOR,
  getLocalFullMarkerSprite,
  hasLocalFullMarkerSpriteKey,
} from "./generatedFullMarkerSprites";

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
  if (explicit) {
    return explicit;
  }
  return marker.id;
};

export const hasLocalFullMarkerSprite = (marker?: DiscoverMapMarker | null) =>
  hasLocalFullMarkerSpriteKey(getMarkerSpriteKey(marker));

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
  remoteSpriteFailureKeys?: Set<string>;
};

export const resolveMarkerImage = (
  marker: DiscoverMapMarker,
  context?: ResolveMarkerImageContext
): ResolvedMarkerImage => {
  const spriteKey = getMarkerSpriteKey(marker);
  const preferFull = Boolean(context?.preferFullSprite);
  const failedRemoteKeys = context?.remoteSpriteFailureKeys;

  if (preferFull) {
    const remoteUrl = getMarkerRemoteSpriteUrl(marker);
    if (remoteUrl && !failedRemoteKeys?.has(spriteKey)) {
      return {
        image: { uri: remoteUrl },
        anchor: FULL_MARKER_DEFAULT_ANCHOR,
        variant: "remote-full",
        spriteKey,
      };
    }

    const localFull = getLocalFullMarkerSprite(spriteKey);
    if (localFull) {
      return {
        image: localFull.image,
        anchor: localFull.anchor,
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

  return {
    image: ratingIcon ?? compactIcon,
    anchor: ratingIcon
      ? { x: BADGED_ANCHOR_X, y: BADGED_ANCHOR_Y }
      : { x: BASE_ANCHOR_X, y: BASE_ANCHOR_Y },
    variant: "compact",
    spriteKey,
  };
};

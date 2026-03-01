import type { DiscoverMapMarker } from "../interfaces";
import { normalizeId } from "../data/utils/id";
import { IOS_COMPACT_PIN_BY_CATEGORY } from "./generatedIOSCompactPins";
import { IOS_LABELED_PIN_BY_KEY } from "./generatedIOSLabeledPins";
import { IOS_SCALED_FULL_MARKER_BY_KEY } from "./generatedIOSScaledFullMarkerByKey";
import { isSpriteCached } from "./remoteSpriteCache";

const IOS_MULTI_COMPACT_FALLBACK =
  IOS_COMPACT_PIN_BY_CATEGORY.Multi ??
  require("../../images/icons/ios-scaled/compact-pins/multi.png");

const resolveCompactFallback = (category?: DiscoverMapMarker["category"]) => {
  if (!category) {
    return IOS_MULTI_COMPACT_FALLBACK;
  }
  return IOS_COMPACT_PIN_BY_CATEGORY[category] ?? IOS_MULTI_COMPACT_FALLBACK;
};

const buildMarkerKeyCandidates = (marker: DiscoverMapMarker) => {
  const rawCandidates = [marker.markerSpriteKey, marker.id]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0);
  const normalizedCandidates = rawCandidates
    .map((value) => normalizeId(value))
    .filter((value) => value.length > 0);
  return Array.from(new Set([...rawCandidates, ...normalizedCandidates]));
};

export type IOSMarkerTextAssets = {
  full?: number;
  labeled?: number;
};

export const getIOSMarkerTextAssets = (
  marker: DiscoverMapMarker
): IOSMarkerTextAssets | null => {
  const keyCandidates = buildMarkerKeyCandidates(marker);
  const assets: IOSMarkerTextAssets = {};
  for (let index = 0; index < keyCandidates.length; index += 1) {
    const candidate = keyCandidates[index];
    if (assets.full == null) {
      const fullMarker = IOS_SCALED_FULL_MARKER_BY_KEY[candidate];
      if (fullMarker != null) {
        assets.full = fullMarker as number;
      }
    }

    if (assets.labeled == null) {
      const labeled = IOS_LABELED_PIN_BY_KEY[candidate];
      if (labeled != null) {
        assets.labeled = labeled as number;
      }
    }

    if (assets.full != null && assets.labeled != null) {
      break;
    }
  }

  return assets.full != null || assets.labeled != null ? assets : null;
};

export const hasAnyIOSTextPin = (marker: DiscoverMapMarker) =>
  Boolean(getIOSMarkerTextAssets(marker)) ||
  Boolean(marker.markerSpriteUrl && isSpriteCached(marker.markerSpriteUrl));

export const resolveIOSCompactPin = (category?: DiscoverMapMarker["category"]) =>
  resolveCompactFallback(category);

export const resolveIOSLabeledPin = (marker: DiscoverMapMarker): number | { uri: string } => {
  const assets = getIOSMarkerTextAssets(marker);
  if (assets?.full != null) return assets.full;
  if (assets?.labeled != null) return assets.labeled;

  // Remote sprite fallback: use cached remote sprite if available.
  // Important: only use if already cached — tracksViewChanges=false means
  // the image must be ready before the Marker mounts.
  if (marker.markerSpriteUrl && isSpriteCached(marker.markerSpriteUrl)) {
    return { uri: marker.markerSpriteUrl };
  }

  return resolveCompactFallback(marker.category);
};

import {
  hasLocalFullMarkerSprite,
  resolveMarkerImage,
} from "../../../../lib/maps/markerImageProvider";
import { isValidMarkerImage } from "../../../../lib/maps/discoverMapUtils";
import type { BuildResolvedMarkerVisualsParams, ResolvedMarkerVisual } from "../types";

export const buildResolvedMarkerVisuals = ({
  markers,
  failedRemoteSpriteKeySet,
  fullSpriteTextLayersEnabled,
  isIOSStableMarkersMode,
  useOverlayFullSprites,
}: BuildResolvedMarkerVisualsParams) => {
  const byId = new Map<string, ResolvedMarkerVisual>();

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    if (marker.isCluster || marker.isStacked || !marker.markerData) {
      continue;
    }

    const markerData = marker.markerData;
    const hasLocalInlineFullSprite = hasLocalFullMarkerSprite(markerData);
    const canUseIOSStableInlineSprite =
      isIOSStableMarkersMode &&
      fullSpriteTextLayersEnabled &&
      hasLocalInlineFullSprite;

    const compactResolved = resolveMarkerImage(markerData, {
      preferFullSprite: false,
      remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
    });

    const visual: ResolvedMarkerVisual = {
      compactImage: compactResolved.image,
      compactAnchor: compactResolved.anchor,
      iosStableCompactImage:
        typeof compactResolved.image === "number" ? compactResolved.image : undefined,
      iosStableCompactAnchor:
        typeof compactResolved.image === "number" ? compactResolved.anchor : undefined,
      hasRenderableFullOverlay: false,
    };

    if (canUseIOSStableInlineSprite || useOverlayFullSprites) {
      const fullResolved = resolveMarkerImage(markerData, {
        preferFullSprite: true,
        preferLocalFullSprite: true,
        remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
      });
      if (
        fullResolved.variant !== "compact" &&
        isValidMarkerImage(fullResolved.image)
      ) {
        visual.fullOverlayImage = fullResolved.image;
        visual.fullOverlayAnchor = fullResolved.anchor;
        visual.hasRenderableFullOverlay = true;
        if (canUseIOSStableInlineSprite && typeof fullResolved.image === "number") {
          visual.iosStableFullImage = fullResolved.image;
          visual.iosStableFullAnchor = fullResolved.anchor;
        }
      }
    }

    byId.set(marker.id, visual);
  }

  return byId;
};

export const areOpacityMapsEqual = (
  left: Record<string, number>,
  right: Record<string, number>
) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const key of leftKeys) {
    if (Math.abs((left[key] ?? 0) - (right[key] ?? 0)) > 0.0001) {
      return false;
    }
  }
  return true;
};

import React, { useMemo } from "react";
import { Marker } from "react-native-maps";
import type { ImageURISource } from "react-native";
import { clampNumber, isValidMapCoordinate, isValidMarkerImage } from "../../../../lib/maps/discoverMapUtils";
import { resolveMarkerImage } from "../../../../lib/maps/markerImageProvider";
import { FULL_SPRITE_FADE_EPSILON } from "../constants";
import type { RenderMarker, ResolvedMarkerVisual } from "../types";

type FullSpriteOverlayLayerProps = {
  useOverlayFullSprites: boolean;
  renderMarkers: RenderMarker[];
  effectiveFullSpriteOpacityById: Record<string, number>;
  mapMarkerPipelineOptV1: boolean;
  resolvedMarkerVisualById: Map<string, ResolvedMarkerVisual>;
  failedRemoteSpriteKeySet: Set<string>;
  handleMarkerPress: (marker: RenderMarker) => void;
};

export function FullSpriteOverlayLayer({
  useOverlayFullSprites,
  renderMarkers,
  effectiveFullSpriteOpacityById,
  mapMarkerPipelineOptV1,
  resolvedMarkerVisualById,
  failedRemoteSpriteKeySet,
  handleMarkerPress,
}: FullSpriteOverlayLayerProps) {
  const fullSpriteOverlayElements = useMemo(() => {
    if (!useOverlayFullSprites) {
      return [] as React.ReactNode[];
    }

    const elements: React.ReactNode[] = [];
    for (let index = 0; index < renderMarkers.length; index += 1) {
      const marker = renderMarkers[index];
      if (!isValidMapCoordinate(marker.coordinate.latitude, marker.coordinate.longitude)) {
        continue;
      }
      if (marker.isCluster || marker.isStacked || !marker.markerData) {
        continue;
      }

      const opacity = clampNumber(effectiveFullSpriteOpacityById[marker.id] ?? 0, 0, 1);
      if (opacity <= FULL_SPRITE_FADE_EPSILON) {
        continue;
      }

      let imageProp: number | ImageURISource | undefined;
      let anchorProp: { x: number; y: number } | undefined;

      if (mapMarkerPipelineOptV1) {
        const markerVisual = resolvedMarkerVisualById.get(marker.id);
        if (!markerVisual?.hasRenderableFullOverlay) {
          continue;
        }
        imageProp = markerVisual.fullOverlayImage;
        anchorProp = markerVisual.fullOverlayAnchor;
        if (!isValidMarkerImage(imageProp)) {
          continue;
        }
      } else {
        const resolved = resolveMarkerImage(marker.markerData, {
          preferFullSprite: true,
          preferLocalFullSprite: true,
          remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
        });
        if (resolved.variant === "compact" || !isValidMarkerImage(resolved.image)) {
          continue;
        }
        imageProp = resolved.image;
        anchorProp = resolved.anchor;
      }

      elements.push(
        <Marker
          key={`full-overlay:${marker.key}`}
          coordinate={marker.coordinate}
          zIndex={marker.zIndex + 1000}
          opacity={opacity}
          onPress={() => handleMarkerPress(marker)}
          {...(imageProp ? { image: imageProp, tracksViewChanges: false } : {})}
          {...(anchorProp ? { anchor: anchorProp } : {})}
        />
      );
    }
    return elements;
  }, [
    effectiveFullSpriteOpacityById,
    failedRemoteSpriteKeySet,
    handleMarkerPress,
    mapMarkerPipelineOptV1,
    renderMarkers,
    resolvedMarkerVisualById,
    useOverlayFullSprites,
  ]);

  return <>{fullSpriteOverlayElements}</>;
}

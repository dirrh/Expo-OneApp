import { useMemo } from "react";
import type { DiscoverMapMarker } from "../../../../lib/interfaces";
import type { MarkerLabelCandidate } from "../../../../lib/maps/labelSelection";
import {
  getMarkerNumericRating,
  toMarkerTitle,
} from "../../../../lib/maps/discoverMapUtils";
import {
  getMarkerFullSpriteMetrics,
  hasLocalFullMarkerSprite,
} from "../../../../lib/maps/markerImageProvider";
import { MARKER_COLLISION_ZONES } from "../constants";
import { estimateInlineTitleWidth, resolveFullSpriteLabelGeometry } from "../pipelines/fullSpriteGeometry";
import type { SingleLayerMarkerGroup } from "../types";

export type SingleLayerDerived = {
  labelCandidates: MarkerLabelCandidate[];
  localFullSpriteIdSet: Set<string>;
  singleMarkerById: Map<string, DiscoverMapMarker>;
  sortedStackedItemsByGroupId: Map<string, DiscoverMapMarker[]>;
};

type UseSingleLayerDerivedParams = {
  singleLayerMarkers: SingleLayerMarkerGroup[];
  fullSpriteTextLayersEnabled: boolean;
  mapMarkerPipelineOptV1: boolean;
};

export const useSingleLayerDerived = ({
  singleLayerMarkers,
  fullSpriteTextLayersEnabled,
  mapMarkerPipelineOptV1,
}: UseSingleLayerDerivedParams): SingleLayerDerived =>
  useMemo(() => {
    const labelCandidatesNext: MarkerLabelCandidate[] = [];
    const localFullSpriteIdSetNext = new Set<string>();
    const singleMarkerByIdNext = new Map<string, DiscoverMapMarker>();
    const sortedStackedItemsByGroupId = new Map<string, DiscoverMapMarker[]>();
    const useFullSpriteGeometry = fullSpriteTextLayersEnabled;

    for (let index = 0; index < singleLayerMarkers.length; index += 1) {
      const group = singleLayerMarkers[index];
      if (group.items.length !== 1) {
        if (mapMarkerPipelineOptV1) {
          sortedStackedItemsByGroupId.set(
            group.id,
            [...group.items].sort((a, b) =>
              (a.title ?? a.id).localeCompare(b.title ?? b.id)
            )
          );
        }
        continue;
      }

      const marker = group.items[0];
      if (!marker) {
        continue;
      }

      singleMarkerByIdNext.set(marker.id, marker);

      if (marker.category === "Multi") {
        continue;
      }

      if (hasLocalFullMarkerSprite(marker)) {
        localFullSpriteIdSetNext.add(marker.id);
      }

      const title = toMarkerTitle(marker).trim();
      if (!title) {
        continue;
      }
      const rating = getMarkerNumericRating(marker) ?? 0;
      const fullSpriteMetrics = getMarkerFullSpriteMetrics(marker);
      const fullSpriteGeometry = useFullSpriteGeometry
        ? resolveFullSpriteLabelGeometry(title, fullSpriteMetrics)
        : null;
      labelCandidatesNext.push({
        id: marker.id,
        title,
        coordinate: group.coordinate,
        rating,
        estimatedWidth: fullSpriteGeometry?.width ?? estimateInlineTitleWidth(title),
        labelOffsetX: fullSpriteGeometry?.offsetX,
        labelOffsetY: fullSpriteGeometry?.offsetY,
        labelHeight: fullSpriteGeometry?.height,
        collisionWidth: fullSpriteGeometry?.collisionWidth,
        collisionHeight: fullSpriteGeometry?.collisionHeight,
        markerCollisionZones:
          useFullSpriteGeometry &&
          Array.isArray(fullSpriteMetrics?.collisionZones) &&
          fullSpriteMetrics.collisionZones.length > 0
            ? fullSpriteMetrics.collisionZones
            : MARKER_COLLISION_ZONES,
        markerCollisionRows:
          useFullSpriteGeometry &&
          Array.isArray(fullSpriteMetrics?.collisionRows) &&
          fullSpriteMetrics.collisionRows.length > 0
            ? fullSpriteMetrics.collisionRows
            : undefined,
        labelPriority: Number.isFinite(marker.labelPriority)
          ? Number(marker.labelPriority)
          : 0,
      });
    }

    return {
      labelCandidates: labelCandidatesNext,
      localFullSpriteIdSet: localFullSpriteIdSetNext,
      singleMarkerById: singleMarkerByIdNext,
      sortedStackedItemsByGroupId,
    };
  }, [fullSpriteTextLayersEnabled, mapMarkerPipelineOptV1, singleLayerMarkers]);

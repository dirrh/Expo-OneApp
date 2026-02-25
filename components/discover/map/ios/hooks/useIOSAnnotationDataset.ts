import { useMemo } from "react";
import type { DiscoverMapMarker } from "../../../../../lib/interfaces";
import type { RenderFeature, SingleLayerMarkerGroup } from "../../types";
import type { IOSRenderItem } from "../types";
import {
  resolveIOSClusterSprite,
  resolveIOSSingleSprite,
  resolveIOSStackedSprite,
} from "../pipelines/iosSpriteRegistry";

type UseIOSAnnotationDatasetParams = {
  showClusterLayer: boolean;
  showSingleLayer: boolean;
  clusteredFeatures: RenderFeature[];
  singleLayerMarkers: SingleLayerMarkerGroup[];
  sortedStackedItemsByGroupId: Map<string, DiscoverMapMarker[]>;
  hasActiveFilter: boolean;
  cameraCenter: [number, number];
  itemCap: number;
  localOnlySprites: boolean;
};

const clampItemCap = (value: number) =>
  Number.isFinite(value) ? Math.max(16, Math.min(96, Math.floor(value))) : 48;

const distanceSq = (
  marker: { latitude: number; longitude: number },
  center: [number, number]
) => {
  const latDelta = marker.latitude - center[1];
  const lngDelta = marker.longitude - center[0];
  return latDelta * latDelta + lngDelta * lngDelta;
};

export const useIOSAnnotationDataset = ({
  showClusterLayer,
  showSingleLayer,
  clusteredFeatures,
  singleLayerMarkers,
  sortedStackedItemsByGroupId,
  hasActiveFilter,
  cameraCenter,
  itemCap,
  localOnlySprites,
}: UseIOSAnnotationDatasetParams): IOSRenderItem[] =>
  useMemo(() => {
    const next: IOSRenderItem[] = [];

    if (showClusterLayer) {
      clusteredFeatures.forEach((feature) => {
        const sprite = resolveIOSClusterSprite(Number(feature.count ?? 0), hasActiveFilter);
        next.push({
          key: `ios-raw:cluster:${feature.id}`,
          id: feature.id,
          kind: "cluster",
          coordinate: feature.coordinates,
          focusCoordinate: feature.focusCoordinates ?? feature.coordinates,
          image: sprite.image,
          anchor: sprite.anchor,
          zIndex: 2,
          isCluster: true,
          isStacked: false,
        });
      });
    }

    if (showSingleLayer) {
      singleLayerMarkers.forEach((group) => {
        if (group.items.length > 1) {
          const sortedItems =
            sortedStackedItemsByGroupId.get(group.id) ??
            [...group.items].sort((a, b) =>
              (a.title ?? a.id).localeCompare(b.title ?? b.id)
            );
          const sprite = resolveIOSStackedSprite(sortedItems.length);
          next.push({
            key: `ios-raw:stacked:${group.id}`,
            id: `stacked:${group.id}`,
            kind: "stacked",
            coordinate: group.coordinate,
            focusCoordinate: group.coordinate,
            image: sprite.image,
            anchor: sprite.anchor,
            zIndex: 3,
            isCluster: false,
            isStacked: true,
            stackedItems: sortedItems,
          });
          return;
        }

        const marker = group.items[0];
        if (!marker) {
          return;
        }
        const sprite = resolveIOSSingleSprite(marker, {
          localOnlySprites,
        });
        next.push({
          key: `ios-raw:single:${marker.id}`,
          id: marker.id,
          kind: "single",
          coordinate: group.coordinate,
          focusCoordinate: group.coordinate,
          image: sprite.image,
          anchor: sprite.anchor,
          zIndex: 1,
          isCluster: false,
          isStacked: false,
          markerData: marker,
        });
      });
    }

    next.sort(
      (left, right) =>
        distanceSq(left.coordinate, cameraCenter) - distanceSq(right.coordinate, cameraCenter)
    );

    const maxItems = clampItemCap(itemCap);
    if (next.length > maxItems) {
      next.length = maxItems;
    }

    const seenIds = new Set<string>();
    return next.filter((item) => {
      if (seenIds.has(item.id)) {
        return false;
      }
      seenIds.add(item.id);
      return true;
    });
  }, [
    cameraCenter,
    clusteredFeatures,
    hasActiveFilter,
    itemCap,
    localOnlySprites,
    showClusterLayer,
    showSingleLayer,
    singleLayerMarkers,
    sortedStackedItemsByGroupId,
  ]);

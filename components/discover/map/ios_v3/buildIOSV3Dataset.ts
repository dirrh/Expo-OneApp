import type { DiscoverMapMarker } from "../../../../lib/interfaces";
import type { ClusterCountKey } from "../../../../lib/maps/clusterIcons";
import {
  IOS_SCALED_CLUSTER_BY_COUNT,
  IOS_SCALED_FILTER_CLUSTER_BY_COUNT,
} from "../../../../lib/maps/generatedIOSScaledClusterByCount";
import {
  IOS_COMPACT_PIN_ANCHOR,
  IOS_COMPACT_PIN_BY_CATEGORY,
} from "../../../../lib/maps/generatedIOSCompactPins";
import { IOS_SCALED_STACKED_BY_COUNT } from "../../../../lib/maps/generatedIOSScaledStackedByCount";
import type { BuildIOSV3DatasetParams, IOSV3MarkerGroup, IOSV3RenderItem } from "./types";

const IOS_V3_DEFAULT_ANCHOR = { x: 0.492, y: 0.779 } as const;
const IOS_V3_MULTI_COMPACT_FALLBACK = require("../../../../images/icons/ios-scaled/compact-pins/multi.png");

const toSafeClusterCountKey = (count: number): ClusterCountKey =>
  String(Math.max(0, Math.min(99, Math.floor(count)))) as ClusterCountKey;

const resolveCompactPin = (category: string): number =>
  IOS_COMPACT_PIN_BY_CATEGORY[category] ??
  IOS_COMPACT_PIN_BY_CATEGORY.Multi ??
  IOS_V3_MULTI_COMPACT_FALLBACK;

const resolveClusterImage = (count: number, hasActiveFilter: boolean): number => {
  const key = toSafeClusterCountKey(count);
  const sourceSet = hasActiveFilter
    ? IOS_SCALED_FILTER_CLUSTER_BY_COUNT
    : IOS_SCALED_CLUSTER_BY_COUNT;
  return sourceSet[key] ?? IOS_V3_MULTI_COMPACT_FALLBACK;
};

const resolveGroupedImage = (count: number): number => {
  const clampedCount = Math.max(2, Math.min(6, Math.floor(count)));
  return IOS_SCALED_STACKED_BY_COUNT[clampedCount] ?? IOS_V3_MULTI_COMPACT_FALLBACK;
};

const distanceSq = (
  coordinate: { latitude: number; longitude: number },
  cameraCenter: [number, number]
) => {
  const latDelta = coordinate.latitude - cameraCenter[1];
  const lngDelta = coordinate.longitude - cameraCenter[0];
  return latDelta * latDelta + lngDelta * lngDelta;
};

export const groupIOSV3MarkersByLocation = (
  markers: DiscoverMapMarker[]
): IOSV3MarkerGroup[] => {
  const grouped = new Map<string, IOSV3MarkerGroup>();
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const lat = marker.coord?.lat;
    const lng = marker.coord?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    const fallbackKey = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
    const key = marker.groupId ?? fallbackKey;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        id: key,
        coordinate: { latitude: lat, longitude: lng },
        items: [marker],
      });
      continue;
    }
    current.items.push(marker);
  }
  return Array.from(grouped.values());
};

export const buildIOSV3ClusterSourceMarkers = (
  groups: IOSV3MarkerGroup[]
): DiscoverMapMarker[] => {
  const next: DiscoverMapMarker[] = [];
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const primary = group.items[0];
    if (!primary) {
      continue;
    }

    next.push({
      ...primary,
      id: `group:${group.id}`,
      groupId: group.id,
      groupCount: group.items.length,
      category: group.items.length > 1 ? "Multi" : primary.category,
      coord: {
        lat: group.coordinate.latitude,
        lng: group.coordinate.longitude,
      },
    });
  }

  return next;
};

export const resolveIOSV3PoolPlaceholderSprite = () => ({
  image: resolveCompactPin("Multi"),
  anchor: IOS_COMPACT_PIN_ANCHOR,
});

export const buildIOSV3Dataset = ({
  mode,
  groups,
  clusteredFeatures,
  hasActiveFilter,
  cameraCenter,
  poolSize,
}: BuildIOSV3DatasetParams): IOSV3RenderItem[] => {
  const next: IOSV3RenderItem[] = [];

  if (mode === "cluster") {
    for (let index = 0; index < clusteredFeatures.length; index += 1) {
      const feature = clusteredFeatures[index];
      const count = Math.max(0, Math.floor(Number(feature.count ?? 0)));
      next.push({
        key: `ios-v3:cluster:${feature.id}`,
        id: feature.id,
        kind: "cluster",
        coordinate: feature.coordinates,
        focusCoordinate: feature.focusCoordinates ?? feature.coordinates,
        image: resolveClusterImage(count, hasActiveFilter),
        anchor: IOS_V3_DEFAULT_ANCHOR,
        zIndex: 2,
      });
    }
  } else {
    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index];
      if (group.items.length > 1) {
        const sortedItems = [...group.items].sort((left, right) =>
          (left.title ?? left.id).localeCompare(right.title ?? right.id)
        );
        next.push({
          key: `ios-v3:grouped:${group.id}`,
          id: group.id,
          kind: "grouped",
          coordinate: group.coordinate,
          focusCoordinate: group.coordinate,
          image: resolveGroupedImage(sortedItems.length),
          anchor: IOS_V3_DEFAULT_ANCHOR,
          zIndex: 3,
          groupedItems: sortedItems,
        });
        continue;
      }

      const marker = group.items[0];
      if (!marker) {
        continue;
      }
      next.push({
        key: `ios-v3:single:${marker.id}`,
        id: marker.id,
        kind: "single",
        coordinate: group.coordinate,
        focusCoordinate: group.coordinate,
        image: resolveCompactPin(marker.category),
        anchor: IOS_COMPACT_PIN_ANCHOR,
        zIndex: 1,
        markerData: marker,
      });
    }
  }

  const safePoolSize = Number.isFinite(poolSize)
    ? Math.max(16, Math.min(96, Math.floor(poolSize)))
    : 48;
  if (next.length > safePoolSize) {
    next.sort(
      (left, right) =>
        distanceSq(left.coordinate, cameraCenter) - distanceSq(right.coordinate, cameraCenter)
    );
    next.length = safePoolSize;
  }

  const seenIds = new Set<string>();
  return next.filter((item) => {
    if (seenIds.has(item.id)) {
      return false;
    }
    seenIds.add(item.id);
    return true;
  });
};

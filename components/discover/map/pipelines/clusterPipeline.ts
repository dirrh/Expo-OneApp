import type { DiscoverMapMarker } from "../../../../lib/interfaces";
import { getPixelDistanceSq, projectToWorld } from "../../../../lib/maps/discoverMapUtils";
import { CLUSTER_ID_PREFIX } from "../constants";
import type {
  ClusterBucket,
  ClusterPointFeature,
  ClusteredFeaturesBuildParams,
  OrphanPoint,
  RenderFeature,
} from "../types";

const toClusterWeight = (marker: DiscoverMapMarker) =>
  marker.category === "Multi" ? Math.max(1, marker.groupCount ?? 1) : 1;
const ORPHAN_ATTACH_DISTANCE_FACTOR = 1.35;
const ORPHAN_PAIR_DISTANCE_FACTOR = 2.1;
const MIN_SYNTHETIC_CLUSTER_WEIGHT = 2;

export const buildClusterPointFeatures = (markers: DiscoverMapMarker[]): ClusterPointFeature[] => {
  const pointFeatures: ClusterPointFeature[] = [];
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const lat = marker.coord?.lat;
    const lng = marker.coord?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    pointFeatures.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
      properties: {
        markerId: marker.id,
        weight: toClusterWeight(marker),
      },
    });
  }
  return pointFeatures;
};

export const buildClusteredFeaturesFromRaw = ({
  rawClusters,
  worldSize,
  clusterRadiusPx,
  isIOS,
  shouldCullClustersByViewport,
  paddedViewport,
}: ClusteredFeaturesBuildParams): RenderFeature[] => {
  const buckets: ClusterBucket[] = [];
  const orphanPoints: OrphanPoint[] = [];

  for (let indexInArray = 0; indexInArray < rawClusters.length; indexInArray += 1) {
    const feature = rawClusters[indexInArray];
    const coordinates = feature.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      continue;
    }

    const [lng, lat] = coordinates;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      continue;
    }

    const props = feature.properties ?? {};
    const rawWeight =
      typeof props.weight === "number" && Number.isFinite(props.weight)
        ? props.weight
        : typeof props.point_count === "number" && Number.isFinite(props.point_count)
          ? props.point_count
          : 1;
    const weight = Math.max(1, rawWeight);
    const px = projectToWorld(lng, lat, worldSize);

    if (props.cluster) {
      const clusterId =
        typeof props.cluster_id === "number" ? props.cluster_id : indexInArray;
      buckets.push({
        display: { latitude: lat, longitude: lng },
        focus: { latitude: lat, longitude: lng },
        countRaw: weight,
        px,
        memberIds: [`cluster:${clusterId}`],
      });
      continue;
    }

    orphanPoints.push({
      id:
        typeof props.markerId === "string" && props.markerId.length > 0
          ? props.markerId
          : `point:${indexInArray}`,
      coordinate: { latitude: lat, longitude: lng },
      weight,
      px,
    });
  }

  const findNearestBucket = (point: OrphanPoint) => {
    if (buckets.length === 0) {
      return null;
    }

    let nearestIndex = 0;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;
    for (let index = 0; index < buckets.length; index += 1) {
      const bucket = buckets[index];
      const distSq = getPixelDistanceSq(point.px, bucket.px);
      if (distSq < nearestDistanceSq) {
        nearestDistanceSq = distSq;
        nearestIndex = index;
      }
    }

    return { nearestIndex, nearestDistanceSq };
  };

  const attachToBucket = (point: OrphanPoint, bucketIndex: number) => {
    const bucket = buckets[bucketIndex];
    const nextCount = bucket.countRaw + point.weight;
    bucket.focus = {
      latitude:
        (bucket.focus.latitude * bucket.countRaw +
          point.coordinate.latitude * point.weight) /
        nextCount,
      longitude:
        (bucket.focus.longitude * bucket.countRaw +
          point.coordinate.longitude * point.weight) /
        nextCount,
    };
    bucket.display = bucket.focus;
    bucket.countRaw = nextCount;
    bucket.memberIds.push(point.id);
    bucket.px = projectToWorld(
      bucket.display.longitude,
      bucket.display.latitude,
      worldSize
    );
  };

  const pushPairBucket = (first: OrphanPoint, second: OrphanPoint) => {
    const countRaw = first.weight + second.weight;
    const focus = {
      latitude:
        (first.coordinate.latitude * first.weight +
          second.coordinate.latitude * second.weight) /
        countRaw,
      longitude:
        (first.coordinate.longitude * first.weight +
          second.coordinate.longitude * second.weight) /
        countRaw,
    };
    buckets.push({
      display: focus,
      focus,
      countRaw,
      px: projectToWorld(focus.longitude, focus.latitude, worldSize),
      memberIds: [first.id, second.id],
    });
  };

  const pushSyntheticSingleBucket = (point: OrphanPoint) => {
    const focus = point.coordinate;
    buckets.push({
      display: focus,
      focus,
      countRaw: Math.max(MIN_SYNTHETIC_CLUSTER_WEIGHT, point.weight),
      px: projectToWorld(focus.longitude, focus.latitude, worldSize),
      memberIds: [point.id],
    });
  };

  const orphanAttachThresholdPx = Math.max(
    isIOS ? 72 : 68,
    Math.round(clusterRadiusPx * ORPHAN_ATTACH_DISTANCE_FACTOR)
  );
  const orphanAttachThresholdSq = orphanAttachThresholdPx * orphanAttachThresholdPx;
  const orphanPairThresholdPx = Math.max(
    orphanAttachThresholdPx + 12,
    Math.round(clusterRadiusPx * ORPHAN_PAIR_DISTANCE_FACTOR)
  );
  const orphanPairThresholdSq = orphanPairThresholdPx * orphanPairThresholdPx;

  const pairIsolatedOrphans = (isolated: OrphanPoint[]) => {
    const pending = [...isolated];
    while (pending.length >= 2) {
      const first = pending.shift()!;
      let nearestIndex = -1;
      let nearestDistanceSq = Number.POSITIVE_INFINITY;

      for (let index = 0; index < pending.length; index += 1) {
        const candidate = pending[index];
        const distSq = getPixelDistanceSq(first.px, candidate.px);
        if (distSq < nearestDistanceSq) {
          nearestDistanceSq = distSq;
          nearestIndex = index;
        }
      }

      if (nearestIndex >= 0 && nearestDistanceSq <= orphanPairThresholdSq) {
        const second = pending.splice(nearestIndex, 1)[0];
        pushPairBucket(first, second);
        continue;
      }

      const nearestBucket = findNearestBucket(first);
      if (nearestBucket && nearestBucket.nearestDistanceSq <= orphanPairThresholdSq) {
        attachToBucket(first, nearestBucket.nearestIndex);
      } else {
        pushSyntheticSingleBucket(first);
      }
    }

    if (pending.length === 1) {
      const leftover = pending[0];
      const nearestBucket = findNearestBucket(leftover);
      if (nearestBucket && nearestBucket.nearestDistanceSq <= orphanPairThresholdSq) {
        attachToBucket(leftover, nearestBucket.nearestIndex);
      } else {
        pushSyntheticSingleBucket(leftover);
      }
    }
  };

  if (orphanPoints.length > 0) {
    if (buckets.length > 0) {
      const isolatedOrphans: OrphanPoint[] = [];
      for (let index = 0; index < orphanPoints.length; index += 1) {
        const orphan = orphanPoints[index];
        const nearestBucket = findNearestBucket(orphan);
        if (!nearestBucket) {
          isolatedOrphans.push(orphan);
          continue;
        }
        if (nearestBucket.nearestDistanceSq <= orphanAttachThresholdSq) {
          attachToBucket(orphan, nearestBucket.nearestIndex);
        } else {
          isolatedOrphans.push(orphan);
        }
      }
      if (isolatedOrphans.length > 0) {
        pairIsolatedOrphans(isolatedOrphans);
      }
    } else {
      pairIsolatedOrphans(orphanPoints);
    }
  }

  const overlapMergeThresholdPx = Math.max(
    isIOS ? 64 : 60,
    Math.round(clusterRadiusPx * 0.92)
  );
  const overlapMergeThresholdSq = overlapMergeThresholdPx * overlapMergeThresholdPx;

  let mergedAny = true;
  while (mergedAny && buckets.length > 1) {
    mergedAny = false;

    for (let i = 0; i < buckets.length; i += 1) {
      for (let j = i + 1; j < buckets.length; j += 1) {
        const first = buckets[i];
        const second = buckets[j];
        const distSq = getPixelDistanceSq(first.px, second.px);
        if (distSq > overlapMergeThresholdSq) {
          continue;
        }

        const totalCount = first.countRaw + second.countRaw;
        const mergedFocus = {
          latitude:
            (first.focus.latitude * first.countRaw +
              second.focus.latitude * second.countRaw) /
            totalCount,
          longitude:
            (first.focus.longitude * first.countRaw +
              second.focus.longitude * second.countRaw) /
            totalCount,
        };
        const mergedDisplay = {
          latitude:
            (first.display.latitude * first.countRaw +
              second.display.latitude * second.countRaw) /
            totalCount,
          longitude:
            (first.display.longitude * first.countRaw +
              second.display.longitude * second.countRaw) /
            totalCount,
        };

        first.focus = mergedFocus;
        first.display = mergedDisplay;
        first.countRaw = totalCount;
        first.memberIds.push(...second.memberIds);
        first.px = projectToWorld(
          mergedDisplay.longitude,
          mergedDisplay.latitude,
          worldSize
        );

        buckets.splice(j, 1);
        mergedAny = true;
        break;
      }
      if (mergedAny) {
        break;
      }
    }
  }

  const visibleBuckets =
    shouldCullClustersByViewport && paddedViewport
      ? buckets.filter((bucket) => {
          const lng = bucket.focus.longitude;
          const lat = bucket.focus.latitude;
          return !(
            lng < paddedViewport.minLng ||
            lng > paddedViewport.maxLng ||
            lat < paddedViewport.minLat ||
            lat > paddedViewport.maxLat
          );
        })
      : buckets;

  const features: RenderFeature[] = [];
  for (let index = 0; index < visibleBuckets.length; index += 1) {
    const bucket = visibleBuckets[index];
    features.push({
      id: buildClusterId(bucket.memberIds),
      isCluster: true,
      count: Math.min(99, Math.max(2, Math.round(bucket.countRaw))),
      coordinates: {
        latitude: bucket.focus.latitude,
        longitude: bucket.focus.longitude,
      },
      focusCoordinates: {
        latitude: bucket.focus.latitude,
        longitude: bucket.focus.longitude,
      },
      marker: undefined,
    });
  }
  return features;
};

export const buildClusterId = (memberIds: string[]) => {
  const sorted = [...memberIds].sort();
  let hash = 2166136261;
  sorted.forEach((id) => {
    for (let i = 0; i < id.length; i += 1) {
      hash ^= id.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  });
  const stableHash = (hash >>> 0).toString(36);
  return `${CLUSTER_ID_PREFIX}${stableHash}:${sorted.length}`;
};

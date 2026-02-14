import {
  MAP_LABEL_CANDIDATE_MULTIPLIER,
  MAP_LABEL_COLLISION_GAP_X,
  MAP_LABEL_COLLISION_GAP_Y,
  MAP_LABEL_ENTER_ZOOM,
  MAP_LABEL_EXIT_ZOOM,
  MAP_LABEL_HIGH_ZOOM_MAX,
  MAP_LABEL_LOW_ZOOM_MAX,
  MAP_LABEL_MAX_MARKERS,
  MAP_LABEL_MID_ZOOM_MAX,
} from "../constants/discover";
import type { DiscoverMapLabelPolicy } from "../interfaces";

export type MarkerLabelCandidate = {
  id: string;
  title: string;
  coordinate: { latitude: number; longitude: number };
  rating: number;
  estimatedWidth?: number;
  labelPriority: number;
};

export type ResolvedDiscoverMapLabelPolicy = {
  minZoom: number;
  enterZoom: number;
  exitZoom: number;
  lowZoomMax: number;
  midZoomMax: number;
  highZoomMax: number;
  maxMarkersForLabels: number;
};

type LabelRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type SelectInlineLabelIdsParams = {
  candidates: MarkerLabelCandidate[];
  center: [number, number];
  zoom: number;
  singleModeZoom: number;
  mapSize: { width: number; height: number };
  labelSize: { width: number; height: number; offsetY: number };
  policy: ResolvedDiscoverMapLabelPolicy;
  wasEnabled: boolean;
  candidateMultiplier?: number;
  collisionGapX?: number;
  collisionGapY?: number;
};

type ProjectedCandidate = {
  id: string;
  screenX: number;
  screenY: number;
  rating: number;
  labelWidth: number;
  labelPriority: number;
  distanceToCenterPx: number;
};

const TILE_SIZE = 256;
const MAX_ZOOM = 20;
const MIN_ZOOM = 0;

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const projectToWorld = (longitude: number, latitude: number, worldSize: number) => {
  const x = ((longitude + 180) / 360) * worldSize;
  const sinLat = Math.sin((latitude * Math.PI) / 180);
  const clampedSinLat = Math.min(0.9999, Math.max(-0.9999, sinLat));
  const y =
    (0.5 -
      Math.log((1 + clampedSinLat) / (1 - clampedSinLat)) / (4 * Math.PI)) *
    worldSize;
  return { x, y };
};

const wrapWorldDelta = (delta: number, worldSize: number) => {
  if (delta > worldSize / 2) {
    return delta - worldSize;
  }
  if (delta < -worldSize / 2) {
    return delta + worldSize;
  }
  return delta;
};

const rectsOverlap = (a: LabelRect, b: LabelRect) =>
  !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );

export const normalizeDiscoverMapLabelPolicy = (
  policy?: Partial<DiscoverMapLabelPolicy>
): ResolvedDiscoverMapLabelPolicy => {
  const minZoomInput = normalizeNumber(policy?.minZoom);
  const enterZoomInput = normalizeNumber(policy?.enterZoom);
  const exitZoomInput = normalizeNumber(policy?.exitZoom);
  const lowZoomMaxInput = normalizeNumber(policy?.lowZoomMax);
  const midZoomMaxInput = normalizeNumber(policy?.midZoomMax);
  const highZoomMaxInput = normalizeNumber(policy?.highZoomMax);
  const maxMarkersInput = normalizeNumber(policy?.maxMarkersForLabels);

  const minZoom = clampNumber(
    minZoomInput ?? Math.min(MAP_LABEL_ENTER_ZOOM, MAP_LABEL_EXIT_ZOOM),
    MIN_ZOOM,
    MAX_ZOOM
  );
  const enterZoom = clampNumber(
    Math.max(minZoom, enterZoomInput ?? MAP_LABEL_ENTER_ZOOM),
    minZoom,
    MAX_ZOOM
  );
  const exitZoom = clampNumber(
    exitZoomInput ?? MAP_LABEL_EXIT_ZOOM,
    minZoom,
    enterZoom
  );

  const lowZoomMax = Math.max(1, Math.round(lowZoomMaxInput ?? MAP_LABEL_LOW_ZOOM_MAX));
  const midZoomMax = Math.max(
    lowZoomMax,
    Math.round(midZoomMaxInput ?? MAP_LABEL_MID_ZOOM_MAX)
  );
  const highZoomMax = Math.max(
    midZoomMax,
    Math.round(highZoomMaxInput ?? MAP_LABEL_HIGH_ZOOM_MAX)
  );
  const maxMarkersForLabels = Math.max(
    1,
    Math.round(maxMarkersInput ?? MAP_LABEL_MAX_MARKERS)
  );

  return {
    minZoom,
    enterZoom,
    exitZoom,
    lowZoomMax,
    midZoomMax,
    highZoomMax,
    maxMarkersForLabels,
  };
};

export const getLabelBudgetByZoom = (
  zoom: number,
  singleModeZoom: number,
  policy: ResolvedDiscoverMapLabelPolicy
) => {
  if (!Number.isFinite(zoom) || zoom < policy.minZoom) {
    return 0;
  }
  if (zoom < singleModeZoom) {
    return policy.lowZoomMax;
  }
  if (zoom < singleModeZoom + 1.2) {
    return policy.midZoomMax;
  }
  return policy.highZoomMax;
};

const shouldEnableLabels = (
  zoom: number,
  markerCount: number,
  wasEnabled: boolean,
  singleModeZoom: number,
  policy: ResolvedDiscoverMapLabelPolicy
) => {
  if (!Number.isFinite(zoom) || markerCount === 0) {
    return false;
  }
  if (markerCount > policy.maxMarkersForLabels && zoom < singleModeZoom) {
    return false;
  }
  if (wasEnabled) {
    return zoom >= policy.exitZoom;
  }
  return zoom >= policy.enterZoom;
};

const toRankingScore = (
  candidate: ProjectedCandidate,
  maxDistance: number,
  minPriority: number,
  maxPriority: number
) => {
  const ratingNorm = clampNumber(candidate.rating / 5, 0, 1);
  const distanceNorm =
    maxDistance > 0
      ? clampNumber(1 - candidate.distanceToCenterPx / maxDistance, 0, 1)
      : 1;
  const priorityNorm =
    maxPriority > minPriority
      ? clampNumber(
          (candidate.labelPriority - minPriority) / (maxPriority - minPriority),
          0,
          1
        )
      : candidate.labelPriority > 0
        ? 1
        : 0;
  return ratingNorm * 0.55 + distanceNorm * 0.35 + priorityNorm * 0.1;
};

export const selectInlineLabelIds = ({
  candidates,
  center,
  zoom,
  singleModeZoom,
  mapSize,
  labelSize,
  policy,
  wasEnabled,
  candidateMultiplier,
  collisionGapX,
  collisionGapY,
}: SelectInlineLabelIdsParams) => {
  const enabled = shouldEnableLabels(
    zoom,
    candidates.length,
    wasEnabled,
    singleModeZoom,
    policy
  );
  if (!enabled) {
    return { ids: [] as string[], hash: "", enabled: false, budget: 0 };
  }

  if (mapSize.width <= 0 || mapSize.height <= 0) {
    return { ids: [] as string[], hash: "", enabled: true, budget: 0 };
  }

  const budget = getLabelBudgetByZoom(zoom, singleModeZoom, policy);
  if (budget <= 0) {
    return { ids: [] as string[], hash: "", enabled: true, budget: 0 };
  }

  const worldSize = TILE_SIZE * Math.pow(2, clampNumber(zoom, MIN_ZOOM, MAX_ZOOM));
  const centerPoint = projectToWorld(center[0], center[1], worldSize);
  const diagonal = Math.hypot(mapSize.width, mapSize.height) || 1;
  const visibleMarginY = labelSize.height + labelSize.offsetY + 12;
  const candidateLimit = Math.max(
    budget,
    Math.round(budget * (candidateMultiplier ?? MAP_LABEL_CANDIDATE_MULTIPLIER))
  );

  const projected: ProjectedCandidate[] = [];

  candidates.forEach((candidate) => {
    const coordinate = candidate.coordinate;
    if (
      !Number.isFinite(coordinate.latitude) ||
      !Number.isFinite(coordinate.longitude)
    ) {
      return;
    }

    const candidatePoint = projectToWorld(
      coordinate.longitude,
      coordinate.latitude,
      worldSize
    );
    const dx = wrapWorldDelta(candidatePoint.x - centerPoint.x, worldSize);
    const dy = candidatePoint.y - centerPoint.y;
    const screenX = mapSize.width / 2 + dx;
    const screenY = mapSize.height / 2 + dy;
    const labelWidth = clampNumber(
      typeof candidate.estimatedWidth === "number" && Number.isFinite(candidate.estimatedWidth)
        ? candidate.estimatedWidth
        : labelSize.width,
      labelSize.width,
      Math.max(labelSize.width, labelSize.width * 2)
    );
    const visibleMarginX = labelWidth / 2 + 12;

    if (
      screenX < -visibleMarginX ||
      screenX > mapSize.width + visibleMarginX ||
      screenY < -visibleMarginY ||
      screenY > mapSize.height + visibleMarginY
    ) {
      return;
    }

    projected.push({
      id: candidate.id,
      screenX,
      screenY,
      rating: candidate.rating,
      labelWidth,
      labelPriority: candidate.labelPriority,
      distanceToCenterPx: Math.hypot(dx, dy),
    });
  });

  if (projected.length === 0) {
    return { ids: [] as string[], hash: "", enabled: true, budget };
  }

  let minPriority = Number.POSITIVE_INFINITY;
  let maxPriority = Number.NEGATIVE_INFINITY;
  projected.forEach((candidate) => {
    minPriority = Math.min(minPriority, candidate.labelPriority);
    maxPriority = Math.max(maxPriority, candidate.labelPriority);
  });

  const ranked = projected
    .map((candidate) => ({
      candidate,
      score: toRankingScore(candidate, diagonal, minPriority, maxPriority),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.candidate.labelPriority !== a.candidate.labelPriority) {
        return b.candidate.labelPriority - a.candidate.labelPriority;
      }
      if (b.candidate.rating !== a.candidate.rating) {
        return b.candidate.rating - a.candidate.rating;
      }
      return a.candidate.id.localeCompare(b.candidate.id);
    })
    .slice(0, candidateLimit)
    .map((entry) => entry.candidate);

  const ids: string[] = [];
  const occupiedRects: LabelRect[] = [];
  const gapX = collisionGapX ?? MAP_LABEL_COLLISION_GAP_X;
  const gapY = collisionGapY ?? MAP_LABEL_COLLISION_GAP_Y;

  ranked.forEach((candidate) => {
    if (ids.length >= budget) {
      return;
    }

    const left = candidate.screenX - candidate.labelWidth / 2;
    const top = candidate.screenY + labelSize.offsetY;
    const rect: LabelRect = {
      left: left - gapX,
      right: left + candidate.labelWidth + gapX,
      top: top - gapY,
      bottom: top + labelSize.height + gapY,
    };

    if (occupiedRects.some((occupied) => rectsOverlap(occupied, rect))) {
      return;
    }

    occupiedRects.push(rect);
    ids.push(candidate.id);
  });

  return {
    ids,
    hash: ids.join("|"),
    enabled: true,
    budget,
  };
};

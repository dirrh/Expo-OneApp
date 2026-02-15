// labelSelection: vyber markerov pre zobrazenie labelov.
// Zodpovednost: ranking, collision filter a stabilny vyber Top N.
// Vstup/Vystup: vracia set marker ID pre label render politiku.

import {
  MAP_LABEL_CANDIDATE_MULTIPLIER,
  MAP_LABEL_COLLISION_GAP_X,
  MAP_LABEL_COLLISION_GAP_Y,
  MAP_LABEL_ENTER_ZOOM,
  MAP_LABEL_EXIT_ZOOM,
  MAP_LABEL_HIGH_ZOOM_MAX,
  MAP_LABEL_LAYER_DENSE_ZOOM_OFFSET,
  MAP_LABEL_LAYER_PAIR_ZOOM_OFFSET,
  MAP_LABEL_LAYER_PROXIMITY_PX,
  MAP_LABEL_LOW_ZOOM_MAX,
  MAP_LABEL_MAX_WIDTH_PX,
  MAP_LABEL_MAX_MARKERS,
  MAP_LABEL_MID_ZOOM_MAX,
  MAP_LABEL_STICKY_SCORE_BONUS,
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
  stickyIds?: Set<string>;
  forceIncludeIds?: Set<string>;
  stickyScoreBonus?: number;
  maxLabelWidth?: number;
};

type ProjectedCandidate = {
  id: string;
  screenX: number;
  screenY: number;
  rating: number;
  labelWidth: number;
  labelPriority: number;
  distanceToCenterPx: number;
  neighborCount: number;
};

type RankedCandidateEntry = {
  candidate: ProjectedCandidate;
  score: number;
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
  maxPriority: number,
  isSticky: boolean,
  stickyScoreBonus: number
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
  const baseScore = ratingNorm * 0.55 + distanceNorm * 0.35 + priorityNorm * 0.1;
  const orphanBonus = candidate.neighborCount === 0 ? 0.08 : 0;
  return baseScore + (isSticky ? stickyScoreBonus : 0) + orphanBonus;
};

const compareRankedEntries = (a: RankedCandidateEntry, b: RankedCandidateEntry) => {
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
  stickyIds,
  forceIncludeIds,
  stickyScoreBonus,
  maxLabelWidth,
}: SelectInlineLabelIdsParams) => {
  const enabled = shouldEnableLabels(
    zoom,
    candidates.length,
    wasEnabled,
    singleModeZoom,
    policy
  );
  if (!enabled) {
    return {
      ids: [] as string[],
      hash: "",
      enabled: false,
      budget: 0,
      candidateCount: candidates.length,
      projectedCount: 0,
      rejectedByCollision: 0,
    };
  }

  if (mapSize.width <= 0 || mapSize.height <= 0) {
    return {
      ids: [] as string[],
      hash: "",
      enabled: true,
      budget: 0,
      candidateCount: candidates.length,
      projectedCount: 0,
      rejectedByCollision: 0,
    };
  }

  const budget = getLabelBudgetByZoom(zoom, singleModeZoom, policy);
  if (budget <= 0) {
    return {
      ids: [] as string[],
      hash: "",
      enabled: true,
      budget: 0,
      candidateCount: candidates.length,
      projectedCount: 0,
      rejectedByCollision: 0,
    };
  }

  const worldSize = TILE_SIZE * Math.pow(2, clampNumber(zoom, MIN_ZOOM, MAX_ZOOM));
  const centerPoint = projectToWorld(center[0], center[1], worldSize);
  const diagonal = Math.hypot(mapSize.width, mapSize.height) || 1;
  const visibleMarginY = labelSize.height + labelSize.offsetY + 12;
  const candidateLimit = Math.max(
    budget,
    Math.round(budget * (candidateMultiplier ?? MAP_LABEL_CANDIDATE_MULTIPLIER))
  );
  const resolvedStickyBonus =
    typeof stickyScoreBonus === "number" && Number.isFinite(stickyScoreBonus)
      ? stickyScoreBonus
      : MAP_LABEL_STICKY_SCORE_BONUS;
  const maxAllowedLabelWidth = clampNumber(
    typeof maxLabelWidth === "number" && Number.isFinite(maxLabelWidth)
      ? maxLabelWidth
      : MAP_LABEL_MAX_WIDTH_PX,
    labelSize.width,
    Math.max(labelSize.width, MAP_LABEL_MAX_WIDTH_PX)
  );
  const maxViewportLabelWidth = Math.max(
    labelSize.width,
    Math.min(maxAllowedLabelWidth, mapSize.width - 24)
  );

  const projected: ProjectedCandidate[] = [];
  const forcedIdSet = forceIncludeIds ?? new Set<string>();

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
      maxViewportLabelWidth
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
      neighborCount: 0,
    });
  });

  if (projected.length === 0) {
    return {
      ids: [] as string[],
      hash: "",
      enabled: true,
      budget,
      candidateCount: candidates.length,
      projectedCount: 0,
      rejectedByCollision: 0,
    };
  }

  const proximityBase = Math.max(12, MAP_LABEL_LAYER_PROXIMITY_PX);
  for (let i = 0; i < projected.length; i += 1) {
    const a = projected[i];
    for (let j = i + 1; j < projected.length; j += 1) {
      const b = projected[j];
      const dx = a.screenX - b.screenX;
      const dy = a.screenY - b.screenY;
      const dynamicProximity = Math.max(
        proximityBase,
        Math.min(140, Math.round((a.labelWidth + b.labelWidth) * 0.24))
      );
      if (dx * dx + dy * dy > dynamicProximity * dynamicProximity) {
        continue;
      }
      a.neighborCount += 1;
      b.neighborCount += 1;
    }
  }

  const pairLayerEnterZoom = singleModeZoom + MAP_LABEL_LAYER_PAIR_ZOOM_OFFSET;
  const denseLayerEnterZoom = singleModeZoom + MAP_LABEL_LAYER_DENSE_ZOOM_OFFSET;
  const layerFiltered = projected.filter((candidate) => {
    if (forcedIdSet.has(candidate.id)) {
      return true;
    }
    if (candidate.neighborCount >= 2) {
      return zoom >= denseLayerEnterZoom;
    }
    if (candidate.neighborCount === 1) {
      return zoom >= pairLayerEnterZoom;
    }
    return true;
  });

  let minPriority = Number.POSITIVE_INFINITY;
  let maxPriority = Number.NEGATIVE_INFINITY;
  projected.forEach((candidate) => {
    minPriority = Math.min(minPriority, candidate.labelPriority);
    maxPriority = Math.max(maxPriority, candidate.labelPriority);
  });

  const scoredEntries = projected
    .map((candidate) => ({
      candidate,
      score: toRankingScore(
        candidate,
        diagonal,
        minPriority,
        maxPriority,
        stickyIds?.has(candidate.id) ?? false,
        resolvedStickyBonus
      ),
    }));
  const enabledIdSet = new Set(layerFiltered.map((candidate) => candidate.id));
  const rankedEntries = scoredEntries
    .filter((entry) => enabledIdSet.has(entry.candidate.id))
    .sort(compareRankedEntries);
  const suppressedEntries = scoredEntries
    .filter((entry) => !enabledIdSet.has(entry.candidate.id))
    .sort(compareRankedEntries);
  const primaryRanked = rankedEntries
    .slice(0, candidateLimit)
    .map((entry) => entry.candidate);
  const overflowRanked = rankedEntries
    .slice(candidateLimit)
    .map((entry) => entry.candidate);

  const ids: string[] = [];
  const scoreById = new Map(
    [...rankedEntries, ...suppressedEntries].map((entry) => [entry.candidate.id, entry.score])
  );
  const occupiedRects: LabelRect[] = [];
  const gapX = collisionGapX ?? MAP_LABEL_COLLISION_GAP_X;
  const gapY = collisionGapY ?? MAP_LABEL_COLLISION_GAP_Y;
  let rejectedByCollision = 0;

  const tryAppendCandidate = (candidate: ProjectedCandidate) => {
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
      rejectedByCollision += 1;
      return;
    }

    occupiedRects.push(rect);
    ids.push(candidate.id);
  };

  primaryRanked.forEach((candidate) => {
    tryAppendCandidate(candidate);
  });

  if (ids.length < budget && overflowRanked.length > 0) {
    overflowRanked.forEach((candidate) => {
      tryAppendCandidate(candidate);
    });
  }

  if (ids.length < budget && suppressedEntries.length > 0) {
    suppressedEntries.forEach((entry) => {
      tryAppendCandidate(entry.candidate);
    });
  }

  if (forceIncludeIds && forceIncludeIds.size > 0) {
    const selectedSet = new Set(ids);
    const projectedById = new Map(projected.map((candidate) => [candidate.id, candidate]));

    forceIncludeIds.forEach((forcedId) => {
      if (selectedSet.has(forcedId) || !projectedById.has(forcedId)) {
        return;
      }

      if (ids.length < budget) {
        ids.push(forcedId);
        selectedSet.add(forcedId);
        return;
      }

      let replaceIndex = -1;
      let replaceScore = Number.POSITIVE_INFINITY;
      for (let index = 0; index < ids.length; index += 1) {
        const selectedId = ids[index];
        if (forceIncludeIds.has(selectedId)) {
          continue;
        }
        const score = scoreById.get(selectedId) ?? Number.NEGATIVE_INFINITY;
        if (score < replaceScore) {
          replaceScore = score;
          replaceIndex = index;
        }
      }

      if (replaceIndex < 0) {
        replaceIndex = ids.length - 1;
      }

      const removedId = ids[replaceIndex];
      if (removedId) {
        selectedSet.delete(removedId);
      }
      ids[replaceIndex] = forcedId;
      selectedSet.add(forcedId);
    });
  }

  const finalIds = Array.from(new Set(ids)).sort((a, b) => {
    const scoreA = scoreById.get(a) ?? Number.NEGATIVE_INFINITY;
    const scoreB = scoreById.get(b) ?? Number.NEGATIVE_INFINITY;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return a.localeCompare(b);
  });

  return {
    ids: finalIds,
    hash: finalIds.join("|"),
    enabled: true,
    budget,
    candidateCount: candidates.length,
    projectedCount: projected.length,
    rejectedByCollision,
  };
};

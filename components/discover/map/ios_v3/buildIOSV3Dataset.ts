import type { DiscoverMapMarker } from "../../../../lib/interfaces";
import type { ClusterCountKey } from "../../../../lib/maps/clusterIcons";
import {
  IOS_SCALED_CLUSTER_BY_COUNT,
  IOS_SCALED_FILTER_CLUSTER_BY_COUNT,
} from "../../../../lib/maps/generatedIOSScaledClusterByCount";
import {
  IOS_COMPACT_PIN_ANCHOR,
} from "../../../../lib/maps/generatedIOSCompactPins";
import { IOS_SCALED_STACKED_BY_COUNT } from "../../../../lib/maps/generatedIOSScaledStackedByCount";
import {
  getIOSMarkerTextAssets,
  resolveIOSCompactPin,
} from "../../../../lib/maps/iosLabeledPinProvider";
import type {
  BuildIOSV3DatasetParams,
  IOSV3MarkerGroup,
  IOSV3RenderItem,
  IOSV3TextCollisionCandidate,
  IOSV3TextBudget,
  IOSV3ViewportBounds,
} from "./types";
import { resolveIOSV3TextCollision } from "./resolveIOSV3TextCollision";

const IOS_V3_DEFAULT_ANCHOR = { x: 0.492, y: 0.779 } as const;
const IOS_V3_MULTI_COMPACT_FALLBACK = require("../../../../images/icons/ios-scaled/compact-pins/multi.png");

const toSafeClusterCountKey = (count: number): ClusterCountKey =>
  String(Math.max(0, Math.min(99, Math.floor(count)))) as ClusterCountKey;

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
  const result = latDelta * latDelta + lngDelta * lngDelta;
  return Number.isFinite(result) ? result : Number.MAX_SAFE_INTEGER;
};

const IOS_V3_DEFAULT_TEXT_BUDGET: IOSV3TextBudget = {
  maxTextMarkers: 12,
  maxFullMarkers: 4,
};

type IOSLocalTextAssets = NonNullable<ReturnType<typeof getIOSMarkerTextAssets>>;
type IOSLocalTextMeta = {
  assets: IOSLocalTextAssets;
  fullTextWidth?: number;
  labeledTextWidth?: number;
};
type TextWidthVariant = "full" | "labeled";

const FULL_TEXT_MAX_CONTENT_WIDTH = 210;
const FULL_TEXT_STROKE_PADDING = 12;
const FULL_TEXT_MIN_WIDTH = 36;
const LABELED_TEXT_MAX_CONTENT_WIDTH = 180;
const LABELED_TEXT_HORIZONTAL_PADDING = 20;
const LABELED_TEXT_MIN_WIDTH = 22;

const normalizeMarkerTitle = (marker: DiscoverMapMarker) => {
  const explicit = marker.title?.trim();
  if (explicit && explicit.length > 0) {
    return explicit;
  }
  const fallback = marker.id
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!fallback) {
    return marker.id;
  }
  return fallback
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getApproxCharWidth = (char: string, variant: TextWidthVariant) => {
  if (char === " ") {
    return variant === "full" ? 4 : 4.5;
  }
  if (/[.,'`:;!|]/.test(char)) {
    return variant === "full" ? 4.5 : 5;
  }
  if (/[iljI]/.test(char)) {
    return variant === "full" ? 5.5 : 6;
  }
  if (/[ft]/.test(char)) {
    return variant === "full" ? 6.5 : 7;
  }
  if (/[mwMW@#%&]/.test(char)) {
    return variant === "full" ? 12.5 : 13;
  }
  if (/[0-9]/.test(char)) {
    return variant === "full" ? 9 : 9;
  }
  if (/[A-Z]/.test(char)) {
    return variant === "full" ? 9.75 : 10;
  }
  return variant === "full" ? 8 : 8.5;
};

const estimateApproxTextWidth = (text: string, variant: TextWidthVariant) => {
  let width = 0;
  for (let index = 0; index < text.length; index += 1) {
    width += getApproxCharWidth(text[index], variant);
  }
  return width;
};

const fitApproximateTextWidth = (
  text: string,
  variant: TextWidthVariant,
  maxContentWidth: number
) => {
  const normalizedSource =
    variant === "full" ? text.trim().toUpperCase() : text.trim();
  if (!normalizedSource) {
    return 0;
  }

  const directWidth = estimateApproxTextWidth(normalizedSource, variant);
  if (directWidth <= maxContentWidth) {
    return directWidth;
  }

  const ellipsis = "...";
  const ellipsisWidth = estimateApproxTextWidth(ellipsis, variant);
  if (ellipsisWidth >= maxContentWidth) {
    return ellipsisWidth;
  }

  let truncated = normalizedSource;
  while (truncated.length > 1) {
    truncated = truncated.slice(0, -1).trimEnd();
    const candidate = `${truncated}${ellipsis}`;
    const candidateWidth = estimateApproxTextWidth(candidate, variant);
    if (candidateWidth <= maxContentWidth) {
      return candidateWidth;
    }
  }

  return ellipsisWidth;
};

const estimateCollisionTextWidths = (marker: DiscoverMapMarker) => {
  const title = normalizeMarkerTitle(marker);
  const fullContentWidth = fitApproximateTextWidth(
    title,
    "full",
    FULL_TEXT_MAX_CONTENT_WIDTH
  );
  const labeledContentWidth = fitApproximateTextWidth(
    title,
    "labeled",
    LABELED_TEXT_MAX_CONTENT_WIDTH
  );
  return {
    fullTextWidth:
      fullContentWidth > 0
        ? Math.max(FULL_TEXT_MIN_WIDTH, fullContentWidth + FULL_TEXT_STROKE_PADDING)
        : undefined,
    labeledTextWidth:
      labeledContentWidth > 0
        ? Math.max(
            LABELED_TEXT_MIN_WIDTH,
            labeledContentWidth + LABELED_TEXT_HORIZONTAL_PADDING
          )
        : undefined,
  };
};

const isGroupInViewport = (
  group: IOSV3MarkerGroup,
  bounds: IOSV3ViewportBounds
): boolean => {
  const { latitude, longitude } = group.coordinate;
  return (
    latitude >= bounds.minLat &&
    latitude <= bounds.maxLat &&
    longitude >= bounds.minLng &&
    longitude <= bounds.maxLng
  );
};

const compareGroupsForRenderPriority = (
  left: IOSV3MarkerGroup,
  right: IOSV3MarkerGroup,
  cameraCenter: [number, number]
) => {
  const distanceDelta =
    distanceSq(left.coordinate, cameraCenter) - distanceSq(right.coordinate, cameraCenter);
  if (distanceDelta !== 0) {
    return distanceDelta;
  }
  return left.id.localeCompare(right.id);
};

const buildLocalTextMetaByMarkerId = (groups: IOSV3MarkerGroup[]) => {
  const metaByMarkerId = new Map<string, IOSLocalTextMeta>();
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    if (group.items.length !== 1) {
      continue;
    }
    const marker = group.items[0];
    if (!marker) {
      continue;
    }
    const assets = getIOSMarkerTextAssets(marker);
    if (!assets) {
      continue;
    }
    const widths = estimateCollisionTextWidths(marker);
    metaByMarkerId.set(marker.id, {
      assets,
      fullTextWidth: widths.fullTextWidth,
      labeledTextWidth: widths.labeledTextWidth,
    });
  }
  return metaByMarkerId;
};

const selectTextVariantByMarkerId = ({
  groups,
  cameraCenter,
  renderZoom,
  viewportSize,
  textBudget,
  userCoordinate,
  textMetaByMarkerId,
}: {
  groups: IOSV3MarkerGroup[];
  cameraCenter: [number, number];
  renderZoom: number;
  viewportSize: { width: number; height: number };
  textBudget: IOSV3TextBudget;
  userCoordinate?: { latitude: number; longitude: number } | null;
  textMetaByMarkerId: Map<string, IOSLocalTextMeta>;
}) => {
  const candidates: IOSV3TextCollisionCandidate[] = groups.map((group) => {
    if (group.items.length > 1) {
      return {
        id: group.id,
        kind: "grouped",
        coordinate: group.coordinate,
      };
    }

    const marker = group.items[0];
    const textMeta = marker ? textMetaByMarkerId.get(marker.id) : undefined;
    return {
      id: marker?.id ?? group.id,
      kind: "single",
      coordinate: group.coordinate,
      hasFullText: textMeta?.assets.full != null,
      hasLabeledText: textMeta?.assets.labeled != null,
      fullTextWidth: textMeta?.fullTextWidth,
      labeledTextWidth: textMeta?.labeledTextWidth,
    };
  });

  return resolveIOSV3TextCollision({
    candidates,
    cameraCenter,
    renderZoom,
    viewportSize,
    textBudget,
    userCoordinate,
  }).variantByMarkerId;
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
  image: resolveIOSCompactPin("Multi"),
  anchor: IOS_COMPACT_PIN_ANCHOR,
});

export const buildIOSV3Dataset = ({
  mode,
  groups,
  clusteredFeatures,
  hasActiveFilter,
  cameraCenter,
  renderZoom,
  viewportSize,
  poolSize,
  textBudget = IOS_V3_DEFAULT_TEXT_BUDGET,
  userCoordinate,
  viewportBounds,
}: BuildIOSV3DatasetParams): IOSV3RenderItem[] => {
  const safePoolSize = Number.isFinite(poolSize)
    ? Math.max(1, Math.min(96, Math.floor(poolSize)))
    : 48;
  const next: IOSV3RenderItem[] = [];

  if (mode === "cluster") {
    for (let index = 0; index < clusteredFeatures.length; index += 1) {
      const feature = clusteredFeatures[index];
      const coord = feature.coordinates;
      if (
        !coord ||
        !Number.isFinite(coord.latitude) ||
        !Number.isFinite(coord.longitude) ||
        Math.abs(coord.latitude) > 90 ||
        Math.abs(coord.longitude) > 180
      ) {
        continue;
      }
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
    const baseVisibleGroups =
      viewportBounds != null
        ? groups.filter((group) => isGroupInViewport(group, viewportBounds))
        : groups;

    const cappedGroupIds = new Set(
      [...baseVisibleGroups]
        .sort((left, right) => compareGroupsForRenderPriority(left, right, cameraCenter))
        .slice(0, safePoolSize)
        .map((group) => group.id)
    );
    const visibleGroups = baseVisibleGroups.filter((group) => cappedGroupIds.has(group.id));
    const textMetaByMarkerId = buildLocalTextMetaByMarkerId(visibleGroups);
    const textVariantByMarkerId = selectTextVariantByMarkerId({
      groups: visibleGroups,
      cameraCenter,
      renderZoom,
      viewportSize,
      textBudget,
      userCoordinate,
      textMetaByMarkerId,
    });

    for (let index = 0; index < visibleGroups.length; index += 1) {
      const group = visibleGroups[index];
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
      const assets = textMetaByMarkerId.get(marker.id)?.assets;
      const textVariant = textVariantByMarkerId.get(marker.id) ?? "compact";
      const image =
        textVariant === "full" && assets?.full != null
          ? assets.full
          : textVariant === "labeled" && assets?.labeled != null
            ? assets.labeled
            : resolveIOSCompactPin(marker.category);
      next.push({
        key: `ios-v3:single:${marker.id}`,
        id: marker.id,
        kind: "single",
        coordinate: group.coordinate,
        focusCoordinate: group.coordinate,
        image,
        anchor: IOS_COMPACT_PIN_ANCHOR,
        zIndex: 1,
        markerData: marker,
      });
    }
  }

  const seenIds = new Set<string>();
  const deduped = next.filter((item) => {
    if (seenIds.has(item.id)) {
      return false;
    }
    seenIds.add(item.id);
    return true;
  });

  if (mode === "cluster" && deduped.length > safePoolSize) {
    deduped.sort(
      (left, right) =>
        distanceSq(left.coordinate, cameraCenter) - distanceSq(right.coordinate, cameraCenter)
    );
    deduped.length = safePoolSize;
  }

  return deduped;
};

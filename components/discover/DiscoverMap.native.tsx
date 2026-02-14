import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  type LayoutChangeEvent,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, type Region } from "react-native-maps";
import Supercluster from "supercluster";
import type { ImageURISource } from "react-native";
import type {
  DiscoverMapProps,
  DiscoverMapMarker,
} from "../../lib/interfaces";
import { styles } from "./discoverStyles";
import {
  normalizeCenter,
  regionToZoom,
  setMapCamera,
  zoomToRegion,
} from "../../lib/maps/camera";
import {
  type MarkerLabelCandidate,
} from "../../lib/maps/labelSelection";
import {
  getMarkerRemoteSpriteUrl,
  getMarkerSpriteKey,
  hasLocalFullMarkerSprite,
  resolveMarkerImage,
} from "../../lib/maps/markerImageProvider";
import {
  CLUSTER_ICON_SOURCES,
  ClusterCountKey,
} from "../../lib/maps/clusterIcons";
import { FILTER_CLUSTER_ICON_SOURCES } from "../../lib/maps/clusterFilterIcons";
import { STACKED_ICON_SOURCES } from "../../lib/maps/stackedIcons";

import {
  DEFAULT_CAMERA_ZOOM,
  DEFAULT_CITY_CENTER,
  FORCE_CLUSTER_ZOOM,
  SINGLE_MODE_ZOOM,
  IOS_ZOOM_OFFSET,
  IOS_FORCE_CLUSTER_ZOOM,
  IOS_SINGLE_MODE_ZOOM,
  ANDROID_CLUSTER_CELL_PX,
  IOS_CLUSTER_CELL_PX,
  MAP_FULL_SPRITES_LOGS_ENABLED,
  MAP_FULL_SPRITES_V1,
} from "../../lib/constants/discover";

const MULTI_ICON = require("../../images/icons/multi/multi.png");
const CLUSTER_ID_PREFIX = "cluster:";
const USER_MARKER_ID = "user-location";
const USER_MARKER_COLOR = "#2563EB";
const CLUSTER_PIN_COLOR = "#111827";
const FILTER_CLUSTER_PIN_COLOR = "#EB8100";
const CLUSTER_ZOOM_BUCKET_SIZE = 2;
const VIEWPORT_PADDING_RATIO = 0.35;
const TOOLTIP_WIDTH = 183;
const TOOLTIP_ROW_HEIGHT = 33;
const STACKED_CENTER_DURATION_MS = 280;
const STACKED_OPEN_FALLBACK_MS = 360;

const PIN_CANVAS_WIDTH = 165;
const PIN_CANVAS_HEIGHT = 186;
const PIN_TRIM_WIDTH = 153;
const PIN_TRIM_HEIGHT = 177;
const PIN_TRIM_X = 0;
const PIN_TRIM_Y = 0;
const BADGED_CANVAS_HEIGHT = 226;
const BADGED_PIN_OFFSET_Y = 40;
const BADGED_TITLE_WIDTH = 120;
const BADGED_TITLE_HEIGHT = 18;
const MARKER_TITLE_OFFSET_Y = 8;
const BADGED_TITLE_MAX_WIDTH = 560;
const BADGED_TITLE_HORIZONTAL_PADDING = 10;
const BADGED_TITLE_CHAR_PX = 9.2;
const FULL_SPRITE_VIEWPORT_MARGIN_X = 96;
const FULL_SPRITE_VIEWPORT_MARGIN_Y = 72;

const BASE_ANCHOR_X =
  (PIN_TRIM_X + PIN_TRIM_WIDTH / 2) / PIN_CANVAS_WIDTH;
const BASE_ANCHOR_Y =
  (PIN_TRIM_Y + PIN_TRIM_HEIGHT) / PIN_CANVAS_HEIGHT;
const BADGED_ANCHOR_X = BASE_ANCHOR_X;
const BADGED_ANCHOR_Y =
  (BADGED_PIN_OFFSET_Y + PIN_TRIM_HEIGHT) / BADGED_CANVAS_HEIGHT;

const GOOGLE_MAP_STYLE = [
  { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

type RenderFeature = {
  id: string;
  isCluster: boolean;
  count: number;
  coordinates: { latitude: number; longitude: number };
  focusCoordinates?: { latitude: number; longitude: number };
  marker?: DiscoverMapMarker;
};

type RenderMarker = {
  key: string;
  id: string;
  coordinate: { latitude: number; longitude: number };
  image?: number | ImageURISource;
  anchor?: { x: number; y: number };
  category?: DiscoverMapMarker["category"];
  markerData?: DiscoverMapMarker;
  zIndex: number;
  isCluster: boolean;
  isStacked?: boolean;
  stackedItems?: DiscoverMapMarker[];
  focusCoordinate: { latitude: number; longitude: number };
};

type ClusterPointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { markerId: string; weight: number };
};

const projectToWorld = (
  longitude: number,
  latitude: number,
  worldSize: number
) => {
  const x = ((longitude + 180) / 360) * worldSize;
  const sinLat = Math.sin((latitude * Math.PI) / 180);
  const clampedSinLat = Math.min(0.9999, Math.max(-0.9999, sinLat));
  const y =
    (0.5 -
      Math.log((1 + clampedSinLat) / (1 - clampedSinLat)) / (4 * Math.PI)) *
    worldSize;

  return { x, y };
};

const getPixelDistanceSq = (
  a: { x: number; y: number },
  b: { x: number; y: number }
) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const appendUniqueValue = (items: string[], value: string) =>
  items.includes(value) ? items : [...items, value];

const estimateInlineTitleWidth = (title: string) => {
  const normalized = title.trim();
  if (!normalized) {
    return BADGED_TITLE_WIDTH;
  }
  const estimated =
    normalized.length * BADGED_TITLE_CHAR_PX + BADGED_TITLE_HORIZONTAL_PADDING * 2;
  return Math.round(clampNumber(estimated, BADGED_TITLE_WIDTH, BADGED_TITLE_MAX_WIDTH));
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

const isFiniteCoordinate = (latitude: number, longitude: number) => {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
};

const isValidMapCoordinate = (latitude: number, longitude: number) => {
  return (
    isFiniteCoordinate(latitude, longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

const isValidMarkerImage = (
  image: number | ImageURISource | undefined
): image is number | ImageURISource => {
  if (typeof image === "number") {
    return Number.isFinite(image) && image > 0;
  }
  if (!image || typeof image !== "object") {
    return false;
  }
  return typeof image.uri === "string" && image.uri.length > 0;
};

const isValidRegion = (region: Region) => {
  return (
    Number.isFinite(region.latitude) &&
    Number.isFinite(region.longitude) &&
    Number.isFinite(region.latitudeDelta) &&
    Number.isFinite(region.longitudeDelta)
  );
};

const getTooltipCategoryIcon = (
  category?: DiscoverMapMarker["category"]
): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case "Gastro":
      return "restaurant-outline";
    case "Beauty":
      return "sparkles-outline";
    case "Relax":
      return "leaf-outline";
    case "Fitness":
      return "barbell-outline";
    default:
      return "apps-outline";
  }
};

const toMarkerTitle = (marker: DiscoverMapMarker) => {
  const fallback = marker.id
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());

  const explicit = marker.title?.trim();
  if (explicit && explicit.length > 3) {
    return explicit;
  }
  return fallback;
};

const getMarkerNumericRating = (marker?: DiscoverMapMarker) => {
  if (!marker) {
    return null;
  }
  const parsed =
    typeof marker.rating === "number"
      ? marker.rating
      : typeof marker.ratingFormatted === "string"
        ? Number.parseFloat(marker.ratingFormatted)
        : NaN;
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(5, Math.max(0, parsed));
};

const CATEGORY_PIN_COLORS: Record<DiscoverMapMarker["category"], string> = {
  Fitness: "#2563EB",
  Gastro: "#16A34A",
  Relax: "#0891B2",
  Beauty: "#DB2777",
  Multi: CLUSTER_PIN_COLOR,
};

const getDefaultPinColor = (
  marker: RenderMarker,
  hasActiveFilter?: boolean
) => {
  if (marker.isCluster) {
    return hasActiveFilter ? FILTER_CLUSTER_PIN_COLOR : CLUSTER_PIN_COLOR;
  }
  if (marker.isStacked) {
    return CLUSTER_PIN_COLOR;
  }
  const category = marker.category ?? "Multi";
  return CATEGORY_PIN_COLORS[category] ?? CLUSTER_PIN_COLOR;
};

const buildClusterId = (memberIds: string[]) => {
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

function DiscoverMap({
  cameraRef,
  filteredMarkers,
  userCoord,
  hasActiveFilter,
  onCameraChanged,
  mapCenter,
  mapZoom,
  cityCenter,
  onMarkerPress,
  initialCamera,
  labelPolicy,
  markerRenderPolicy,
}: DiscoverMapProps) {
  const fallbackCenter = mapCenter ?? cityCenter ?? DEFAULT_CITY_CENTER;
  const fallbackZoom = mapZoom ?? DEFAULT_CAMERA_ZOOM;

  const initialRegionRef = useRef<Region | null>(null);
  if (!initialRegionRef.current) {
    initialRegionRef.current = zoomToRegion(fallbackCenter, fallbackZoom);
  }

  const initialRegion = useMemo(() => {
    if (initialCamera) {
      return zoomToRegion(initialCamera.center, initialCamera.zoom);
    }
    return initialRegionRef.current!;
  }, [initialCamera]);

  const [renderCamera, setRenderCamera] = useState<{
    center: [number, number];
    zoom: number;
  }>(() => ({
    center: [initialRegion.longitude, initialRegion.latitude],
    zoom: regionToZoom(initialRegion),
  }));

  const applyRenderCamera = useCallback((center: [number, number], zoom: number) => {
    const normalizedCenter = normalizeCenter(center);
    setRenderCamera((prev) => {
      const delta = Math.hypot(
        normalizedCenter[0] - prev.center[0],
        normalizedCenter[1] - prev.center[1]
      );
      if (delta < 0.000001 && Math.abs(zoom - prev.zoom) < 0.0001) {
        return prev;
      }
      return { center: normalizedCenter, zoom };
    });
  }, []);

  const cameraCenter = renderCamera.center;
  const zoom = renderCamera.zoom;
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const singleLayerMarkers = useMemo<
    Array<{
      id: string;
      coordinate: { latitude: number; longitude: number };
      items: DiscoverMapMarker[];
    }>
  >(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        coordinate: { latitude: number; longitude: number };
        items: DiscoverMapMarker[];
      }
    >();

    filteredMarkers.forEach((marker) => {
      const lat = marker.coord?.lat;
      const lng = marker.coord?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const fallbackKey = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
      const key = marker.groupId ?? fallbackKey;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          id: key,
          coordinate: { latitude: lat, longitude: lng },
          items: [marker],
        });
        return;
      }

      existing.items.push(marker);
    });

    return Array.from(grouped.values());
  }, [filteredMarkers]);

  const effectiveZoomRaw = Platform.OS === "ios" ? zoom + IOS_ZOOM_OFFSET : zoom;
  const effectiveZoom = Math.max(0, Math.min(20, effectiveZoomRaw));
  const superclusterZoom = Math.max(0, Math.min(20, Math.floor(effectiveZoom)));
  const forceClusterZoom =
    Platform.OS === "ios" ? IOS_FORCE_CLUSTER_ZOOM : FORCE_CLUSTER_ZOOM;
  const singleModeZoom =
    Platform.OS === "ios" ? IOS_SINGLE_MODE_ZOOM : SINGLE_MODE_ZOOM;
  const fullSpritesEnabled =
    markerRenderPolicy?.fullSpritesEnabled ?? MAP_FULL_SPRITES_V1;
  const stableClusterZoom = Math.max(
    0,
    Math.min(
      forceClusterZoom,
      Math.floor(superclusterZoom / CLUSTER_ZOOM_BUCKET_SIZE) *
        CLUSTER_ZOOM_BUCKET_SIZE
    )
  );

  const showSingleLayer = effectiveZoom >= singleModeZoom;
  const showClusterLayer = !showSingleLayer;
  const shouldCullClustersByViewport = Platform.OS !== "ios";

  const clusteredFeatures = useMemo<RenderFeature[]>(() => {
    if (!showClusterLayer || filteredMarkers.length === 0) {
      return [];
    }

    type ClusterBucket = {
      display: { latitude: number; longitude: number };
      focus: { latitude: number; longitude: number };
      countRaw: number;
      px: { x: number; y: number };
      memberIds: string[];
    };

    type OrphanPoint = {
      id: string;
      coordinate: { latitude: number; longitude: number };
      weight: number;
      px: { x: number; y: number };
    };

    const pointFeatures: ClusterPointFeature[] = filteredMarkers
      .map((marker) => {
        const lat = marker.coord?.lat;
        const lng = marker.coord?.lng;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }
        const weight =
          marker.category === "Multi" ? Math.max(1, marker.groupCount ?? 1) : 1;
        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat] as [number, number],
          },
          properties: {
            markerId: marker.id,
            weight,
          },
        };
      })
      .filter((feature): feature is ClusterPointFeature => feature !== null);

    if (pointFeatures.length === 0) {
      return [];
    }

    const clusterRadiusPx =
      Platform.OS === "ios"
        ? Math.max(36, Math.round(IOS_CLUSTER_CELL_PX * 0.58))
        : Math.max(40, Math.round(ANDROID_CLUSTER_CELL_PX * 0.58));

    const index = new Supercluster({
      radius: clusterRadiusPx,
      minPoints: 2,
      minZoom: 0,
      maxZoom: forceClusterZoom,
      map: (properties) => ({
        weight:
          typeof properties.weight === "number" && Number.isFinite(properties.weight)
            ? properties.weight
            : 1,
      }),
      reduce: (accumulated, properties) => {
        accumulated.weight +=
          typeof properties.weight === "number" && Number.isFinite(properties.weight)
            ? properties.weight
            : 1;
      },
    });

    index.load(pointFeatures);

    const paddedViewport = shouldCullClustersByViewport
      ? (() => {
          const viewportRegion = zoomToRegion(cameraCenter, zoom);
          const halfLng = Math.min(
            179.999,
            Math.max(0.0001, Math.abs(viewportRegion.longitudeDelta) / 2)
          );
          const halfLat = Math.min(
            85,
            Math.max(0.0001, Math.abs(viewportRegion.latitudeDelta) / 2)
          );
          const paddedHalfLng = Math.min(
            179.999,
            Math.max(0.0001, halfLng * (1 + VIEWPORT_PADDING_RATIO))
          );
          const paddedHalfLat = Math.min(
            85,
            Math.max(0.0001, halfLat * (1 + VIEWPORT_PADDING_RATIO))
          );
          return {
            minLng: Math.max(-180, viewportRegion.longitude - paddedHalfLng),
            maxLng: Math.min(180, viewportRegion.longitude + paddedHalfLng),
            minLat: Math.max(-85, viewportRegion.latitude - paddedHalfLat),
            maxLat: Math.min(85, viewportRegion.latitude + paddedHalfLat),
          };
        })()
      : null;

    const worldBbox: [number, number, number, number] = [-180, -85, 180, 85];
    const rawClusters = index.getClusters(worldBbox, stableClusterZoom);
    const worldSize = 256 * Math.pow(2, stableClusterZoom);

    const buckets: ClusterBucket[] = [];
    const orphanPoints: OrphanPoint[] = [];

    rawClusters.forEach((feature, indexInArray) => {
      const coordinates = feature.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return;
      }

      const [lng, lat] = coordinates;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return;
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
          typeof props.cluster_id === "number"
            ? props.cluster_id
            : indexInArray;
        buckets.push({
          display: { latitude: lat, longitude: lng },
          focus: { latitude: lat, longitude: lng },
          countRaw: weight,
          px,
          memberIds: [`cluster:${clusterId}`],
        });
        return;
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
    });

    const assignToNearestBucket = (point: OrphanPoint) => {
      if (buckets.length === 0) {
        return;
      }

      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      buckets.forEach((bucket, index) => {
        const distSq = getPixelDistanceSq(point.px, bucket.px);
        if (distSq < nearestDistance) {
          nearestDistance = distSq;
          nearestIndex = index;
        }
      });

      const bucket = buckets[nearestIndex];
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

    if (buckets.length > 0) {
      orphanPoints.forEach(assignToNearestBucket);
    } else if (orphanPoints.length > 0) {
      const pending = [...orphanPoints];

      while (pending.length >= 2) {
        const first = pending.shift()!;
        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;

        pending.forEach((candidate, index) => {
          const distSq = getPixelDistanceSq(first.px, candidate.px);
          if (distSq < nearestDistance) {
            nearestDistance = distSq;
            nearestIndex = index;
          }
        });

        const second = pending.splice(nearestIndex, 1)[0];
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
      }

      if (pending.length === 1) {
        const leftover = pending[0];
        if (buckets.length === 0) {
          const focus = leftover.coordinate;
          buckets.push({
            display: focus,
            focus,
            countRaw: Math.max(2, leftover.weight),
            px: projectToWorld(focus.longitude, focus.latitude, worldSize),
            memberIds: [leftover.id],
          });
        } else {
          assignToNearestBucket(leftover);
        }
      }
    }

    const overlapMergeThresholdPx = Math.max(
      Platform.OS === "ios" ? 64 : 60,
      Math.round(clusterRadiusPx * 0.92)
    );
    const overlapMergeThresholdSq =
      overlapMergeThresholdPx * overlapMergeThresholdPx;

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

    return visibleBuckets.map((bucket) => ({
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
      }));
  }, [
    showClusterLayer,
    shouldCullClustersByViewport,
    filteredMarkers,
    stableClusterZoom,
    effectiveZoom,
    forceClusterZoom,
    ...(shouldCullClustersByViewport ? [cameraCenter, zoom] : []),
  ]);

  const renderMarkers = useMemo<RenderMarker[]>(() => {
    const markers: RenderMarker[] = [];

    if (showClusterLayer) {
      clusteredFeatures.forEach((feature) => {
        const clusterCount = Math.min(
          99,
          Math.max(0, Math.floor(Number(feature.count ?? 0)))
        );
        const clusterIconSet = hasActiveFilter
          ? FILTER_CLUSTER_ICON_SOURCES
          : CLUSTER_ICON_SOURCES;
        const clusterIcon =
          clusterIconSet[String(clusterCount) as ClusterCountKey] ?? MULTI_ICON;

        markers.push({
          key: `cluster-layer:${feature.id}`,
          id: feature.id,
          coordinate: feature.coordinates,
          image: clusterIcon,
          category: "Multi",
          anchor: {
            x: BASE_ANCHOR_X,
            y: BASE_ANCHOR_Y,
          },
          zIndex: 2,
          isCluster: true,
          focusCoordinate: feature.focusCoordinates ?? feature.coordinates,
        });
      });
    }

    if (showSingleLayer) {
      singleLayerMarkers.forEach((group) => {
        if (group.items.length > 1) {
          const stackedItems = [...group.items].sort((a, b) =>
            (a.title ?? a.id).localeCompare(b.title ?? b.id)
          );
          const stackedCount = Math.min(6, Math.max(2, stackedItems.length));
          const stackedIcon =
            STACKED_ICON_SOURCES[String(stackedCount) as ClusterCountKey] ??
            STACKED_ICON_SOURCES["6"] ??
            STACKED_ICON_SOURCES["2"];

          markers.push({
            key: `stacked-layer:${group.id}`,
            id: `stacked:${group.id}`,
            coordinate: group.coordinate,
            image: stackedIcon,
            category: "Multi",
            anchor: {
              x: BASE_ANCHOR_X,
              y: BASE_ANCHOR_Y,
            },
            zIndex: 3,
            isCluster: false,
            isStacked: true,
            stackedItems,
            focusCoordinate: group.coordinate,
          });
          return;
        }

        const marker = group.items[0];
        markers.push({
          key: `single-layer:${marker.id}`,
          id: marker.id,
          coordinate: group.coordinate,
          category: marker.category,
          markerData: marker,
          zIndex: 1,
          isCluster: false,
          isStacked: false,
          focusCoordinate: group.coordinate,
        });
      });
    }

    const seenKeys = new Set<string>();
    return markers.filter((marker) => {
      if (!marker.key) {
        return false;
      }
      if (seenKeys.has(marker.key)) {
        return false;
      }
      seenKeys.add(marker.key);
      return true;
    });
  }, [
    showClusterLayer,
    clusteredFeatures,
    hasActiveFilter,
    showSingleLayer,
    singleLayerMarkers,
  ]);

  const labelCandidates = useMemo<MarkerLabelCandidate[]>(() => {
    const candidates: MarkerLabelCandidate[] = [];
    singleLayerMarkers.forEach((group) => {
      if (group.items.length !== 1) {
        return;
      }
      const marker = group.items[0];
      if (!marker || marker.category === "Multi") {
        return;
      }
      const title = toMarkerTitle(marker).trim();
      if (!title) {
        return;
      }
      const rating = getMarkerNumericRating(marker);
      if (rating === null) {
        return;
      }
      candidates.push({
        id: marker.id,
        title,
        coordinate: group.coordinate,
        rating,
        estimatedWidth: estimateInlineTitleWidth(title),
        labelPriority: Number.isFinite(marker.labelPriority)
          ? Number(marker.labelPriority)
          : 0,
      });
    });
    return candidates;
  }, [singleLayerMarkers]);

  const [selectedStackedMarkerId, setSelectedStackedMarkerId] = useState<string | null>(
    null
  );
  const [stackedTooltipPoint, setStackedTooltipPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [mapLayoutSize, setMapLayoutSize] = useState({ width: 0, height: 0 });
  const [inlineLabelIds, setInlineLabelIds] = useState<string[]>([]);
  const [readyFullSpriteIds, setReadyFullSpriteIds] = useState<string[]>([]);
  const [failedRemoteSpriteKeys, setFailedRemoteSpriteKeys] = useState<string[]>([]);
  const inlineLabelHashRef = useRef("");
  const inlineLabelsEnabledRef = useRef(false);
  const pendingRemoteSpritePrefetchRef = useRef(new Set<string>());
  const suppressNextMapPressRef = useRef(false);
  const pendingStackedOpenRef = useRef<{
    id: string;
    timeout: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const clearPendingStackedOpen = useCallback(() => {
    const pending = pendingStackedOpenRef.current;
    if (pending?.timeout) {
      clearTimeout(pending.timeout);
    }
    pendingStackedOpenRef.current = null;
  }, []);

  const selectedStackedMarker = useMemo(() => {
    if (!selectedStackedMarkerId) {
      return null;
    }
    return (
      renderMarkers.find(
        (marker) => marker.isStacked && marker.id === selectedStackedMarkerId
      ) ?? null
    );
  }, [renderMarkers, selectedStackedMarkerId]);

  const closeStackedTooltip = useCallback(() => {
    clearPendingStackedOpen();
    setSelectedStackedMarkerId(null);
    setStackedTooltipPoint(null);
  }, [clearPendingStackedOpen]);

  const commitInlineLabelIds = useCallback((nextIds: string[], enabled: boolean) => {
    const nextHash = nextIds.join("|");
    const hasSameState =
      inlineLabelHashRef.current === nextHash &&
      inlineLabelsEnabledRef.current === enabled;
    if (hasSameState) {
      return;
    }
    inlineLabelHashRef.current = nextHash;
    inlineLabelsEnabledRef.current = enabled;
    setInlineLabelIds(nextIds);
  }, []);

  const recomputeInlineLabels = useCallback(
    (nextCenter: [number, number], nextZoom: number) => {
      if (
        !fullSpritesEnabled ||
        mapLayoutSize.width <= 0 ||
        mapLayoutSize.height <= 0 ||
        labelCandidates.length === 0
      ) {
        commitInlineLabelIds([], false);
        return;
      }

      const effectiveNextZoomRaw =
        Platform.OS === "ios" ? nextZoom + IOS_ZOOM_OFFSET : nextZoom;
      const effectiveNextZoom = clampNumber(effectiveNextZoomRaw, 0, 20);

      if (effectiveNextZoom < singleModeZoom) {
        commitInlineLabelIds([], false);
        return;
      }

      const worldSize = 256 * Math.pow(2, effectiveNextZoom);
      const centerPoint = projectToWorld(nextCenter[0], nextCenter[1], worldSize);
      const visibleIds: string[] = [];

      labelCandidates.forEach((candidate) => {
        const candidatePoint = projectToWorld(
          candidate.coordinate.longitude,
          candidate.coordinate.latitude,
          worldSize
        );

        const dx = wrapWorldDelta(candidatePoint.x - centerPoint.x, worldSize);
        const dy = candidatePoint.y - centerPoint.y;
        const screenX = mapLayoutSize.width / 2 + dx;
        const screenY = mapLayoutSize.height / 2 + dy;

        if (
          screenX < -FULL_SPRITE_VIEWPORT_MARGIN_X ||
          screenX > mapLayoutSize.width + FULL_SPRITE_VIEWPORT_MARGIN_X ||
          screenY < -FULL_SPRITE_VIEWPORT_MARGIN_Y ||
          screenY > mapLayoutSize.height + FULL_SPRITE_VIEWPORT_MARGIN_Y
        ) {
          return;
        }

        visibleIds.push(candidate.id);
      });

      commitInlineLabelIds(visibleIds, true);
    },
    [
      commitInlineLabelIds,
      labelCandidates,
      mapLayoutSize.height,
      mapLayoutSize.width,
      singleModeZoom,
      fullSpritesEnabled,
    ]
  );

  const fullSpriteCandidateIdSet = useMemo(() => {
    return new Set(inlineLabelIds);
  }, [inlineLabelIds]);

  const readyFullSpriteIdSet = useMemo(
    () => new Set(readyFullSpriteIds),
    [readyFullSpriteIds]
  );

  const failedRemoteSpriteKeySet = useMemo(
    () => new Set(failedRemoteSpriteKeys),
    [failedRemoteSpriteKeys]
  );

  const singleMarkerById = useMemo(() => {
    const markerMap = new Map<string, DiscoverMapMarker>();
    singleLayerMarkers.forEach((group) => {
      if (group.items.length !== 1) {
        return;
      }
      const marker = group.items[0];
      markerMap.set(marker.id, marker);
    });
    return markerMap;
  }, [singleLayerMarkers]);

  const updateStackedTooltipPosition = useCallback(
    async (marker: RenderMarker | null) => {
      if (!marker?.isStacked) {
        setStackedTooltipPoint(null);
        return;
      }
      const mapView = cameraRef.current;
      if (!mapView) {
        return;
      }
      try {
        const point = await mapView.pointForCoordinate(marker.coordinate);
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
          return;
        }
        setStackedTooltipPoint({ x: point.x, y: point.y });
      } catch {
        // Ignore map projection errors and keep tooltip hidden.
      }
    },
    [cameraRef]
  );

  useEffect(() => {
    if (!selectedStackedMarker) {
      setStackedTooltipPoint(null);
      return;
    }
    void updateStackedTooltipPosition(selectedStackedMarker);
  }, [selectedStackedMarker, updateStackedTooltipPosition]);

  useEffect(() => {
    if (!selectedStackedMarkerId) {
      return;
    }
    const stillVisible = renderMarkers.some(
      (marker) => marker.isStacked && marker.id === selectedStackedMarkerId
    );
    if (!stillVisible) {
      closeStackedTooltip();
    }
  }, [selectedStackedMarkerId, renderMarkers, closeStackedTooltip]);

  useEffect(() => {
    recomputeInlineLabels(cameraCenter, zoom);
  }, [cameraCenter, labelCandidates, mapLayoutSize.height, mapLayoutSize.width, recomputeInlineLabels, zoom]);

  useEffect(() => {
    if (!fullSpritesEnabled || !showSingleLayer) {
      setReadyFullSpriteIds((previous) => (previous.length > 0 ? [] : previous));
      return;
    }

    const targetIdSet = new Set(inlineLabelIds);
    setReadyFullSpriteIds((previous) => {
      const next = previous.filter((id) => targetIdSet.has(id));
      return next.length === previous.length ? previous : next;
    });

    const immediateReadyMarkerIds: string[] = [];

    inlineLabelIds.forEach((markerId) => {
      const marker = singleMarkerById.get(markerId);
      if (!marker || marker.category === "Multi") {
        return;
      }

      const spriteKey = getMarkerSpriteKey(marker);
      const remoteSpriteUrl = getMarkerRemoteSpriteUrl(marker);
      const hasLocalSprite = hasLocalFullMarkerSprite(marker);

      if (!remoteSpriteUrl || failedRemoteSpriteKeySet.has(spriteKey)) {
        if (hasLocalSprite && !readyFullSpriteIdSet.has(markerId)) {
          immediateReadyMarkerIds.push(markerId);
        }
        return;
      }

      if (pendingRemoteSpritePrefetchRef.current.has(spriteKey)) {
        return;
      }

      pendingRemoteSpritePrefetchRef.current.add(spriteKey);
      void Image.prefetch(remoteSpriteUrl)
        .then((prefetchOk) => {
          if (prefetchOk) {
            setReadyFullSpriteIds((previous) => appendUniqueValue(previous, markerId));
            return;
          }
          setFailedRemoteSpriteKeys((previous) => appendUniqueValue(previous, spriteKey));
          if (hasLocalSprite) {
            requestAnimationFrame(() => {
              setReadyFullSpriteIds((previous) => appendUniqueValue(previous, markerId));
            });
          }
        })
        .catch(() => {
          setFailedRemoteSpriteKeys((previous) => appendUniqueValue(previous, spriteKey));
          if (hasLocalSprite) {
            requestAnimationFrame(() => {
              setReadyFullSpriteIds((previous) => appendUniqueValue(previous, markerId));
            });
          }
        })
        .finally(() => {
          pendingRemoteSpritePrefetchRef.current.delete(spriteKey);
        });
    });

    if (immediateReadyMarkerIds.length > 0) {
      setReadyFullSpriteIds((previous) => {
        let changed = false;
        const nextSet = new Set(previous);
        immediateReadyMarkerIds.forEach((markerId) => {
          if (!nextSet.has(markerId)) {
            nextSet.add(markerId);
            changed = true;
          }
        });
        return changed ? Array.from(nextSet) : previous;
      });
    }
  }, [
    failedRemoteSpriteKeySet,
    fullSpritesEnabled,
    inlineLabelIds,
    readyFullSpriteIdSet,
    showSingleLayer,
    singleMarkerById,
  ]);

  useEffect(() => {
    if (!MAP_FULL_SPRITES_LOGS_ENABLED) {
      return;
    }
    console.debug(
      `[map_full_sprites_v1] markers=${filteredMarkers.length} selected=${inlineLabelIds.length} ready=${readyFullSpriteIds.length} remoteFailures=${failedRemoteSpriteKeys.length}`
    );
  }, [
    failedRemoteSpriteKeys.length,
    filteredMarkers.length,
    inlineLabelIds.length,
    readyFullSpriteIds.length,
  ]);

  const tooltipItems = selectedStackedMarker?.stackedItems ?? [];
  const stackedTooltipLayout = useMemo(() => {
    if (!stackedTooltipPoint) {
      return null;
    }
    const tooltipWidth = Math.min(
      TOOLTIP_WIDTH,
      Math.max(156, mapLayoutSize.width - 16)
    );
    const estimatedHeight = Math.max(
      TOOLTIP_ROW_HEIGHT,
      tooltipItems.length * TOOLTIP_ROW_HEIGHT
    );
    const left = clampNumber(
      stackedTooltipPoint.x - tooltipWidth / 2,
      8,
      Math.max(8, mapLayoutSize.width - tooltipWidth - 8)
    );
    const top = clampNumber(
      stackedTooltipPoint.y + 10,
      8,
      Math.max(8, mapLayoutSize.height - estimatedHeight - 8)
    );

    return { left, top, width: tooltipWidth, height: estimatedHeight };
  }, [mapLayoutSize.height, mapLayoutSize.width, stackedTooltipPoint, tooltipItems.length]);

  useEffect(() => {
    applyRenderCamera(
      [initialRegion.longitude, initialRegion.latitude],
      regionToZoom(initialRegion)
    );
  }, [initialRegion, applyRenderCamera]);

  const syncRenderCameraFromNative = useCallback(async () => {
    const mapView = cameraRef.current;
    if (!mapView) {
      return;
    }

    try {
      const nativeCamera = await mapView.getCamera();
      const latFromCamera = nativeCamera?.center?.latitude;
      const lngFromCamera = nativeCamera?.center?.longitude;
      const zoomFromCamera =
        typeof nativeCamera?.zoom === "number" && Number.isFinite(nativeCamera.zoom)
          ? nativeCamera.zoom
          : NaN;

      let nextCenter: [number, number] | null =
        Number.isFinite(latFromCamera) && Number.isFinite(lngFromCamera)
          ? [lngFromCamera, latFromCamera]
          : null;
      let nextZoom = zoomFromCamera;

      if (!nextCenter || !Number.isFinite(nextZoom)) {
        try {
          const bounds = await mapView.getMapBoundaries();
          const northEast = bounds?.northEast;
          const southWest = bounds?.southWest;
          const neLat = northEast?.latitude;
          const neLng = northEast?.longitude;
          const swLat = southWest?.latitude;
          const swLng = southWest?.longitude;

          if (
            Number.isFinite(neLat) &&
            Number.isFinite(neLng) &&
            Number.isFinite(swLat) &&
            Number.isFinite(swLng)
          ) {
            const rawLngDelta = neLng - swLng;
            let longitudeDelta = Math.abs(rawLngDelta);
            if (longitudeDelta > 180) {
              longitudeDelta = 360 - longitudeDelta;
            }

            let centerLng = (neLng + swLng) / 2;
            if (Math.abs(rawLngDelta) > 180) {
              const wrappedNeLng = neLng < 0 ? neLng + 360 : neLng;
              const wrappedSwLng = swLng < 0 ? swLng + 360 : swLng;
              const wrappedCenter = (wrappedNeLng + wrappedSwLng) / 2;
              centerLng = wrappedCenter > 180 ? wrappedCenter - 360 : wrappedCenter;
            }

            const centerLat = (neLat + swLat) / 2;
            nextCenter = [centerLng, centerLat];
            nextZoom = regionToZoom({ longitudeDelta });
          }
        } catch {
          // Ignore boundary read failures.
        }
      }

      if (!nextCenter) {
        return;
      }
      if (!Number.isFinite(nextZoom)) {
        nextZoom = fallbackZoom;
      }

      const normalizedCenter = normalizeCenter(nextCenter);
      applyRenderCamera(normalizedCenter, nextZoom);
      onCameraChanged(normalizedCenter, nextZoom, false);
    } catch {
      // Ignore native camera read failures.
    }
  }, [applyRenderCamera, cameraRef, fallbackZoom, onCameraChanged]);

  const gestureRef = useRef(false);
  const didSyncInitialRegionRef = useRef(false);
  const gestureReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    return () => {
      clearPendingStackedOpen();
    };
  }, [clearPendingStackedOpen]);

  useEffect(() => {
    return () => {
      if (gestureReleaseTimeoutRef.current) {
        clearTimeout(gestureReleaseTimeoutRef.current);
      }
    };
  }, []);

  const markGestureActive = useCallback(() => {
    gestureRef.current = true;
    if (gestureReleaseTimeoutRef.current) {
      clearTimeout(gestureReleaseTimeoutRef.current);
      gestureReleaseTimeoutRef.current = null;
    }
  }, []);

  const scheduleGestureRelease = useCallback(() => {
    if (gestureReleaseTimeoutRef.current) {
      clearTimeout(gestureReleaseTimeoutRef.current);
    }
    gestureReleaseTimeoutRef.current = setTimeout(() => {
      gestureRef.current = false;
      gestureReleaseTimeoutRef.current = null;
    }, 120);
  }, []);

  const handlePanDrag = useCallback(() => {
    markGestureActive();
    if (selectedStackedMarkerId || pendingStackedOpenRef.current) {
      closeStackedTooltip();
    }
  }, [markGestureActive, selectedStackedMarkerId, closeStackedTooltip]);

  const handleRegionChange = useCallback(
    (region: Region) => {
      if (!isValidRegion(region)) {
        return;
      }

      const nextCenter = normalizeCenter([region.longitude, region.latitude]);
      const nextZoom = regionToZoom(region);
      if (!isFiniteCoordinate(nextCenter[1], nextCenter[0]) || !Number.isFinite(nextZoom)) {
        return;
      }

      if (!didSyncInitialRegionRef.current) {
        didSyncInitialRegionRef.current = true;
        applyRenderCamera(nextCenter, nextZoom);
        onCameraChanged(nextCenter, nextZoom, false);
      }

      if (!gestureRef.current) {
        return;
      }
      onCameraChanged(nextCenter, nextZoom, true);
    },
    [applyRenderCamera, onCameraChanged]
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region, details?: { isGesture?: boolean }) => {
      if (!isValidRegion(region)) {
        scheduleGestureRelease();
        return;
      }

      const isUserGesture = Boolean(details?.isGesture ?? gestureRef.current);
      const nextCenter = normalizeCenter([region.longitude, region.latitude]);
      const nextZoom = regionToZoom(region);
      if (!isFiniteCoordinate(nextCenter[1], nextCenter[0]) || !Number.isFinite(nextZoom)) {
        scheduleGestureRelease();
        return;
      }

      applyRenderCamera(nextCenter, nextZoom);
      scheduleGestureRelease();
      onCameraChanged(
        nextCenter,
        nextZoom,
        isUserGesture
      );

      const pendingStackedId = pendingStackedOpenRef.current?.id;
      if (pendingStackedId) {
        const pendingVisible = renderMarkers.some(
          (marker) => marker.isStacked && marker.id === pendingStackedId
        );
        clearPendingStackedOpen();
        if (pendingVisible) {
          setSelectedStackedMarkerId(pendingStackedId);
        }
      }

      if (selectedStackedMarker) {
        void updateStackedTooltipPosition(selectedStackedMarker);
      }
      recomputeInlineLabels(nextCenter, nextZoom);
    },
    [
      applyRenderCamera,
      clearPendingStackedOpen,
      onCameraChanged,
      recomputeInlineLabels,
      renderMarkers,
      scheduleGestureRelease,
      selectedStackedMarker,
      updateStackedTooltipPosition,
    ]
  );

  const handleMarkerPress = useCallback(
    (marker: RenderMarker) => {
      if (marker.id === USER_MARKER_ID) {
        return;
      }
      if (
        !isFiniteCoordinate(
          marker.focusCoordinate.latitude,
          marker.focusCoordinate.longitude
        )
      ) {
        return;
      }

      if (marker.isStacked) {
        suppressNextMapPressRef.current = true;
        const isSameOpen =
          selectedStackedMarkerId === marker.id &&
          pendingStackedOpenRef.current === null;
        if (isSameOpen) {
          closeStackedTooltip();
          return;
        }

        closeStackedTooltip();

        const pendingId = marker.id;
        const openFallbackTimeout = setTimeout(() => {
          if (pendingStackedOpenRef.current?.id !== pendingId) {
            return;
          }
          clearPendingStackedOpen();
          setSelectedStackedMarkerId(pendingId);
        }, STACKED_OPEN_FALLBACK_MS);

        pendingStackedOpenRef.current = {
          id: pendingId,
          timeout: openFallbackTimeout,
        };

        const mapView = cameraRef.current;
        if (mapView) {
          void mapView
            .getCamera()
            .then((currentCamera) => {
              mapView.animateCamera(
                {
                  ...currentCamera,
                  center: {
                    latitude: marker.focusCoordinate.latitude,
                    longitude: marker.focusCoordinate.longitude,
                  },
                },
                { duration: STACKED_CENTER_DURATION_MS }
              );
            })
            .catch(() => {
              setMapCamera(cameraRef, {
                center: [
                  marker.focusCoordinate.longitude,
                  marker.focusCoordinate.latitude,
                ],
                zoom: zoomRef.current,
                durationMs: STACKED_CENTER_DURATION_MS,
              });
            });
        } else {
          setMapCamera(cameraRef, {
            center: [
              marker.focusCoordinate.longitude,
              marker.focusCoordinate.latitude,
            ],
            zoom: zoomRef.current,
            durationMs: STACKED_CENTER_DURATION_MS,
          });
        }
        return;
      }

      closeStackedTooltip();

      if (marker.isCluster) {
        const targetZoom = Math.min(zoomRef.current + 2, 20);

        setMapCamera(cameraRef, {
          center: [
            marker.focusCoordinate.longitude,
            marker.focusCoordinate.latitude,
          ],
          zoom: targetZoom,
          durationMs: 500,
        });
        return;
      }

      onMarkerPress?.(marker.id);
    },
    [
      cameraRef,
      clearPendingStackedOpen,
      onMarkerPress,
      selectedStackedMarkerId,
      closeStackedTooltip,
    ]
  );

  const handleMapPress = useCallback(() => {
    if (suppressNextMapPressRef.current) {
      suppressNextMapPressRef.current = false;
      return;
    }
    if (selectedStackedMarkerId || pendingStackedOpenRef.current) {
      closeStackedTooltip();
    }
  }, [selectedStackedMarkerId, closeStackedTooltip]);

  const handleMapLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = Math.round(event.nativeEvent.layout.width);
      const height = Math.round(event.nativeEvent.layout.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return;
      }
      setMapLayoutSize((prev) => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }
        return { width, height };
      });
      if (selectedStackedMarker) {
        void updateStackedTooltipPosition(selectedStackedMarker);
      }
      recomputeInlineLabels(cameraCenter, zoom);
    },
    [
      cameraCenter,
      recomputeInlineLabels,
      selectedStackedMarker,
      updateStackedTooltipPosition,
      zoom,
    ]
  );

  const markerElements = useMemo(
    () =>
      renderMarkers
        .filter((marker) =>
          isValidMapCoordinate(marker.coordinate.latitude, marker.coordinate.longitude)
        )
        .map((marker) => {
          let markerImage: number | ImageURISource | undefined = marker.image;
          let markerAnchor: { x: number; y: number } | undefined = marker.anchor;

          if (!marker.isCluster && !marker.isStacked && marker.markerData) {
            const shouldRenderFullSprite =
              fullSpritesEnabled &&
              showSingleLayer &&
              fullSpriteCandidateIdSet.has(marker.id) &&
              readyFullSpriteIdSet.has(marker.id);
            const resolved = resolveMarkerImage(marker.markerData, {
              preferFullSprite: shouldRenderFullSprite,
              remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
            });
            markerImage = resolved.image;
            markerAnchor = resolved.anchor;
          }

          const useCustomImage = isValidMarkerImage(markerImage);
          const imageProp = useCustomImage ? markerImage : undefined;
          const anchorProp = useCustomImage ? markerAnchor : undefined;
          const markerPinColor = useCustomImage
            ? undefined
            : getDefaultPinColor(marker, hasActiveFilter);

          return (
            <Marker
              key={marker.key}
              coordinate={marker.coordinate}
              zIndex={marker.zIndex}
              onPress={() => handleMarkerPress(marker)}
              {...(imageProp
                ? { image: imageProp, tracksViewChanges: false }
                : {})}
              {...(anchorProp ? { anchor: anchorProp } : {})}
              {...(markerPinColor ? { pinColor: markerPinColor } : {})}
            />
          );
        }),
    [
      failedRemoteSpriteKeySet,
      fullSpriteCandidateIdSet,
      fullSpritesEnabled,
      hasActiveFilter,
      handleMarkerPress,
      readyFullSpriteIdSet,
      renderMarkers,
      showSingleLayer,
    ]
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.map}>
        <Text style={{ textAlign: "center", marginTop: 50, color: "#666" }}>
          Map view is not available on web. Please use the mobile app.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.map} onLayout={handleMapLayout}>
      <MapView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onMapReady={() => {
          void syncRenderCameraFromNative();
          recomputeInlineLabels(cameraCenter, zoom);
        }}
        onPanDrag={handlePanDrag}
        onPress={handleMapPress}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsCompass={false}
        zoomControlEnabled={false}
        customMapStyle={Platform.OS === "android" ? GOOGLE_MAP_STYLE : undefined}
        showsPointsOfInterest={Platform.OS === "ios" ? false : undefined}
      >
        {markerElements}

        {userCoord && isValidMapCoordinate(userCoord[1], userCoord[0]) && (
          <Marker
            key={USER_MARKER_ID}
            coordinate={{ latitude: userCoord[1], longitude: userCoord[0] }}
            pinColor={USER_MARKER_COLOR}
            onPress={() => undefined}
          />
        )}
      </MapView>

      {selectedStackedMarker && stackedTooltipLayout && (
        <TouchableWithoutFeedback onPress={closeStackedTooltip}>
          <View style={localStyles.tooltipBackdrop}>
            <TouchableWithoutFeedback onPress={() => undefined}>
              <View
                style={[
                  localStyles.tooltipCard,
                  {
                    left: stackedTooltipLayout.left,
                    top: stackedTooltipLayout.top,
                    width: stackedTooltipLayout.width,
                    height: stackedTooltipLayout.height,
                  },
                ]}
              >
                {tooltipItems.map((item, index) => {
                  const title = item.title ?? item.id;
                  const ratingText = Number.isFinite(item.rating)
                    ? item.rating.toFixed(1)
                    : item.ratingFormatted ?? "-";
                  return (
                    <TouchableOpacity
                      key={`${selectedStackedMarker.id}:${item.id}`}
                      activeOpacity={0.8}
                      style={[
                        localStyles.tooltipRow,
                        index < tooltipItems.length - 1 && localStyles.tooltipRowDivider,
                      ]}
                      onPress={() => {
                        closeStackedTooltip();
                        onMarkerPress?.(item.id);
                      }}
                    >
                      <View style={localStyles.tooltipTitleWrap}>
                        <View style={localStyles.tooltipCategoryIconWrap}>
                          <Ionicons
                            name={getTooltipCategoryIcon(item.category)}
                            size={12}
                            color="#000000"
                          />
                        </View>
                        <Text style={localStyles.tooltipTitle} numberOfLines={1}>
                          {title}
                        </Text>
                      </View>
                      <View style={localStyles.tooltipRatingWrap}>
                        <Ionicons
                          name="star-outline"
                          size={12}
                          color="rgba(0, 0, 0, 0.5)"
                        />
                        <Text style={localStyles.tooltipRating}>{ratingText}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  tooltipBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  tooltipCard: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tooltipRow: {
    height: TOOLTIP_ROW_HEIGHT,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  tooltipRowDivider: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#E4E4E7",
  },
  tooltipTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    marginRight: 10,
    gap: 8,
  },
  tooltipCategoryIconWrap: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipTitle: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    color: "#000000",
    flexShrink: 1,
  },
  tooltipRatingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tooltipRating: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
    color: "rgba(0, 0, 0, 0.5)",
  },
});

export default memo(DiscoverMap);


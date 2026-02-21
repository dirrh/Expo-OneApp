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
  appendUniqueValue,
  clampNumber,
  getDefaultPinColor,
  getIOSScaledMarkerSize,
  getMarkerNumericRating,
  getPixelDistanceSq,
  getTooltipCategoryIcon,
  isFiniteCoordinate,
  isValidMapCoordinate,
  isValidMarkerImage,
  isValidRegion,
  projectToWorld,
  toMarkerTitle,
  wrapWorldDelta,
} from "../../lib/maps/discoverMapUtils";
import {
  normalizeDiscoverMapLabelPolicy,
  selectInlineLabelLayout,
  selectInlineLabelIds,
  type LabelPlacement,
  type LabelSlot,
  type MarkerLabelCandidate,
} from "../../lib/maps/labelSelection";
import {
  getMarkerFullSpriteMetrics,
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
  MAP_LABEL_COLLISION_V2,
  MAP_LABEL_COLLISION_V2_LOGS_ENABLED,
  MAP_LABEL_DENSE_LOW_ZOOM_BUDGET,
  MAP_LABEL_DENSE_MARKER_COUNT_THRESHOLD,
  MAP_LABEL_GESTURE_RECOMPUTE_MS,
  MAP_LABEL_LAYOUT_V3,
  MAP_LABEL_MAX_CANDIDATES_V3,
  MAP_LABEL_STICKY_SLOT_BONUS,
  MAP_LABEL_COLLISION_WIDTH_SCALE_V3,
  MAP_LABEL_COLLISION_HEIGHT_SCALE_V3,
  MAP_FULL_SPRITES_LOGS_ENABLED,
  MAP_FULL_SPRITES_V1,
  MAP_IOS_STABLE_MARKERS_LOGS_ENABLED,
  MAP_IOS_STABLE_MARKERS_V1,
  IOS_LABEL_RECOMPUTE_PAN_THRESHOLD_PX,
  IOS_LABEL_RECOMPUTE_ZOOM_THRESHOLD,
} from "../../lib/constants/discover";

const MULTI_ICON = require("../../images/icons/multi/multi.png");
const CLUSTER_ID_PREFIX = "cluster:";
const USER_MARKER_ID = "user-location";
const USER_MARKER_COLOR = "#2563EB";
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
const FULL_SPRITE_CANVAS_MIN_WIDTH = 260;
const FULL_SPRITE_TITLE_MIN_WIDTH = 140;
const FULL_SPRITE_TITLE_MAX_WIDTH = 888;
const FULL_SPRITE_SIDE_PADDING_X = 16;
const FULL_SPRITE_TITLE_HEIGHT = 36;
const FULL_SPRITE_TITLE_TOP = BADGED_CANVAS_HEIGHT + 6;
const FULL_SPRITE_TITLE_PADDING_X = 14;
const FULL_SPRITE_TEXT_STROKE_ALLOWANCE = 10;
const FULL_SPRITE_TITLE_OFFSET_Y =
  FULL_SPRITE_TITLE_TOP - (BADGED_PIN_OFFSET_Y + PIN_TRIM_HEIGHT);
const FULL_SPRITE_TITLE_BASE_MAX_WIDTH =
  FULL_SPRITE_CANVAS_MIN_WIDTH - FULL_SPRITE_SIDE_PADDING_X * 2;
const FULL_SPRITE_COLLISION_SAFETY_X = 2;
const FULL_SPRITE_VIEWPORT_MARGIN_X = 96;
const FULL_SPRITE_VIEWPORT_MARGIN_Y = 72;
const FULL_SPRITE_FADE_IN_DURATION_MS = 160;
const FULL_SPRITE_FADE_OUT_DURATION_MS = 360;
const FULL_SPRITE_FADE_EPSILON = 0.015;
const CLUSTER_TO_SINGLE_FADE_WINDOW_MS = 0;
const SINGLE_LAYER_ENTER_ZOOM_OFFSET = 0.5;
const CLUSTER_PRESS_ZOOM_STEP = 1;
const CLUSTER_PRESS_TARGET_MARGIN_ZOOM = 0.2;
const INLINE_LABEL_COLLISION_GAP_X = 0;
const INLINE_LABEL_COLLISION_GAP_Y = 0;
const INLINE_LABEL_FIXED_SLOT_OFFSETS = {
  below: { x: 0, y: 0 },
  "below-right": { x: 0, y: 0 },
  "below-left": { x: 0, y: 0 },
  above: { x: 0, y: 0 },
} as const;
const INLINE_LABEL_FIXED_SLOT_PENALTIES = {
  below: 0,
  "below-right": 0,
  "below-left": 0,
  above: 0,
} as const;
const NATIVE_PROJECTION_FAST_LIMIT = 120;
const NATIVE_PROJECTION_ULTRA_FAST_LIMIT = 72;
const LABEL_RECOMPUTE_SKIP_PAN_PX = 10;
const LABEL_RECOMPUTE_SKIP_ZOOM = 0.025;

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

const estimateInlineTitleWidth = (title: string) => {
  const normalized = title.trim();
  if (!normalized) {
    return BADGED_TITLE_WIDTH;
  }
  const estimated =
    normalized.length * BADGED_TITLE_CHAR_PX + BADGED_TITLE_HORIZONTAL_PADDING * 2;
  return Math.round(clampNumber(estimated, BADGED_TITLE_WIDTH, BADGED_TITLE_MAX_WIDTH));
};

const FULL_SPRITE_GLYPH_WIDTH_MAP: Record<string, number> = {
  A: 20,
  B: 21,
  C: 21,
  D: 22,
  E: 20,
  F: 19,
  G: 23,
  H: 22,
  I: 10,
  J: 17,
  K: 21,
  L: 18,
  M: 27,
  N: 23,
  O: 23,
  P: 21,
  Q: 23,
  R: 21,
  S: 20,
  T: 19,
  U: 22,
  V: 21,
  W: 30,
  X: 21,
  Y: 21,
  Z: 20,
  "0": 19,
  "1": 16,
  "2": 19,
  "3": 19,
  "4": 20,
  "5": 19,
  "6": 19,
  "7": 18,
  "8": 20,
  "9": 19,
  " ": 9,
  "-": 10,
  "_": 16,
  ".": 9,
  ",": 9,
  "/": 12,
  "&": 22,
  "'": 7,
};

const estimateFullSpriteGlyphWidth = (title: string) => {
  const text = title.trim().toUpperCase();
  if (!text) {
    return 0;
  }
  let total = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    total += FULL_SPRITE_GLYPH_WIDTH_MAP[char] ?? 20;
  }
  return total;
};

const estimateFullSpriteTitleWidth = (title: string) => {
  const glyphWidth = estimateFullSpriteGlyphWidth(title);
  if (glyphWidth <= 0) {
    return FULL_SPRITE_TITLE_MIN_WIDTH;
  }
  const estimated =
    glyphWidth + FULL_SPRITE_TITLE_PADDING_X * 2 + FULL_SPRITE_TEXT_STROKE_ALLOWANCE;
  return Math.round(
    clampNumber(
      estimated,
      FULL_SPRITE_TITLE_MIN_WIDTH,
      FULL_SPRITE_TITLE_MAX_WIDTH
    )
  );
};

const resolveFullSpriteLabelGeometry = (
  title: string,
  metrics: ReturnType<typeof getMarkerFullSpriteMetrics>
) => {
  const glyphWidth = estimateFullSpriteGlyphWidth(title);
  const estimatedTitleWidth = estimateFullSpriteTitleWidth(title);
  if (!metrics) {
    const contentWidth = clampNumber(
      glyphWidth + FULL_SPRITE_TEXT_STROKE_ALLOWANCE,
      24,
      estimatedTitleWidth
    );
    const collisionWidth = clampNumber(
      contentWidth + FULL_SPRITE_COLLISION_SAFETY_X,
      40,
      estimatedTitleWidth
    );
    return {
      width: estimatedTitleWidth,
      height: FULL_SPRITE_TITLE_HEIGHT,
      collisionWidth: Math.round(collisionWidth),
      collisionHeight: FULL_SPRITE_TITLE_HEIGHT - 2,
      offsetX: 0,
      offsetY: FULL_SPRITE_TITLE_OFFSET_Y,
    };
  }

  const maxTitleWidthForSprite = Math.max(
    FULL_SPRITE_TITLE_MIN_WIDTH,
    metrics.width - FULL_SPRITE_SIDE_PADDING_X * 2
  );
  const estimatedBaseWidth = Math.min(
    estimatedTitleWidth,
    FULL_SPRITE_TITLE_BASE_MAX_WIDTH
  );
  const titleWidth =
    metrics.width > FULL_SPRITE_CANVAS_MIN_WIDTH + 0.5
      ? maxTitleWidthForSprite
      : Math.min(maxTitleWidthForSprite, estimatedBaseWidth);
  const contentWidth = clampNumber(
    glyphWidth + FULL_SPRITE_TEXT_STROKE_ALLOWANCE,
    24,
    titleWidth
  );
  const collisionWidth = clampNumber(
    contentWidth + FULL_SPRITE_COLLISION_SAFETY_X,
    40,
    titleWidth
  );
  const anchorX =
    typeof metrics.anchor?.x === "number" && Number.isFinite(metrics.anchor.x)
      ? metrics.anchor.x
      : 0.5;
  const anchorY =
    typeof metrics.anchor?.y === "number" && Number.isFinite(metrics.anchor.y)
      ? metrics.anchor.y
      : BADGED_ANCHOR_Y;

  return {
    width: Math.round(
      clampNumber(titleWidth, FULL_SPRITE_TITLE_MIN_WIDTH, FULL_SPRITE_TITLE_MAX_WIDTH)
    ),
    height: FULL_SPRITE_TITLE_HEIGHT,
    collisionWidth: Math.round(collisionWidth),
    collisionHeight: FULL_SPRITE_TITLE_HEIGHT - 2,
    offsetX: (0.5 - anchorX) * metrics.width,
    offsetY: FULL_SPRITE_TITLE_TOP - anchorY * metrics.height,
  };
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

const areOpacityMapsEqual = (
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

/**
 * DiscoverMap: Natívna Discover mapa s marker clusteringom, kamerou a callbackmi na výber podniku.
 *
 * Prečo: Komplexnú mapovú logiku drží v jednom mieste, aby bola interakcia plynulá aj pri veľa bodoch.
 */
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
  const cameraCenterRef = useRef(cameraCenter);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    cameraCenterRef.current = cameraCenter;
  }, [cameraCenter]);

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
  const singleLayerEnterZoom = Math.max(0, singleModeZoom + SINGLE_LAYER_ENTER_ZOOM_OFFSET);
  const isIOS = Platform.OS === "ios";
  const isIOSStableMarkersMode = isIOS && MAP_IOS_STABLE_MARKERS_V1;
  const fullSpritesEnabled =
    markerRenderPolicy?.fullSpritesEnabled ?? MAP_FULL_SPRITES_V1;
  const labelLayoutV3Enabled = MAP_LABEL_LAYOUT_V3;
  const fullSpriteTextLayersEnabled = fullSpritesEnabled;
  const useInlineLabelOverlay = labelLayoutV3Enabled && !fullSpriteTextLayersEnabled;
  const labelEngineBaseSize = useMemo(
    () =>
      fullSpriteTextLayersEnabled
        ? {
            width: FULL_SPRITE_TITLE_MIN_WIDTH,
            height: FULL_SPRITE_TITLE_HEIGHT,
            offsetY: FULL_SPRITE_TITLE_OFFSET_Y,
          }
        : {
            width: BADGED_TITLE_WIDTH,
            height: BADGED_TITLE_HEIGHT,
            offsetY: MARKER_TITLE_OFFSET_Y,
          },
    [fullSpriteTextLayersEnabled]
  );
  const fullSpriteFadeEnabled = false;
  const useOverlayFullSprites =
    fullSpriteTextLayersEnabled && !isIOSStableMarkersMode;
  const resolvedLabelPolicy = useMemo(
    () => normalizeDiscoverMapLabelPolicy(labelPolicy),
    [labelPolicy]
  );
  const mapLabelCollisionV2Enabled = MAP_LABEL_COLLISION_V2;
  const stableClusterZoom = Math.max(
    0,
    Math.min(
      forceClusterZoom,
      Math.floor(superclusterZoom / CLUSTER_ZOOM_BUCKET_SIZE) *
        CLUSTER_ZOOM_BUCKET_SIZE
    )
  );

  const showSingleLayer = effectiveZoom >= singleLayerEnterZoom;
  const showClusterLayer = !showSingleLayer;
  const shouldCullClustersByViewport = Platform.OS !== "ios";
  const showSingleLayerRef = useRef(showSingleLayer);

  useEffect(() => {
    showSingleLayerRef.current = showSingleLayer;
  }, [showSingleLayer]);

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
    const useFullSpriteGeometry = fullSpriteTextLayersEnabled;
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
      const rating = getMarkerNumericRating(marker) ?? 0;
      const fullSpriteMetrics = getMarkerFullSpriteMetrics(marker);
      const fullSpriteGeometry = useFullSpriteGeometry
        ? resolveFullSpriteLabelGeometry(title, fullSpriteMetrics)
        : null;
      candidates.push({
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
        labelPriority: Number.isFinite(marker.labelPriority)
          ? Number(marker.labelPriority)
          : 0,
      });
    });
    return candidates;
  }, [fullSpriteTextLayersEnabled, singleLayerMarkers]);
  const localFullSpriteIdSet = useMemo(() => {
    const ids = new Set<string>();
    singleLayerMarkers.forEach((group) => {
      if (group.items.length !== 1) {
        return;
      }
      const marker = group.items[0];
      if (!marker || marker.category === "Multi") {
        return;
      }
      if (hasLocalFullMarkerSprite(marker)) {
        ids.add(marker.id);
      }
    });
    return ids;
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
  const [inlineLabelPlacements, setInlineLabelPlacements] = useState<LabelPlacement[]>(
    []
  );
  const [readyFullSpriteIds, setReadyFullSpriteIds] = useState<string[]>([]);
  const [fullSpriteOpacityById, setFullSpriteOpacityById] = useState<
    Record<string, number>
  >({});
  const [failedRemoteSpriteKeys, setFailedRemoteSpriteKeys] = useState<string[]>([]);
  const inlineLabelIdsRef = useRef<string[]>([]);
  const stickySlotByIdRef = useRef<Map<string, LabelSlot>>(new Map());
  const forceInlineLabelIdsRef = useRef<Set<string>>(new Set());
  const fullSpriteOpacityByIdRef = useRef<Record<string, number>>({});
  const fullSpriteTargetIdsRef = useRef<Set<string>>(new Set());
  const fullSpriteFadeRafRef = useRef<number | null>(null);
  const fullSpriteFadePrevTsRef = useRef<number | null>(null);
  const clusterToSingleFadeUntilRef = useRef(0);
  const previousShowSingleLayerRef = useRef(showSingleLayer);
  const inlineLabelHashRef = useRef("");
  const inlineLabelsEnabledRef = useRef(false);
  const pendingRemoteSpritePrefetchRef = useRef(new Set<string>());
  const suppressNextMapPressRef = useRef(false);
  const pendingStackedOpenRef = useRef<{
    id: string;
    timeout: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const lastInlineRecomputeRef = useRef<{
    center: [number, number];
    zoom: number;
  } | null>(null);
  const recomputeCounterRef = useRef(0);
  const nativeProjectionRequestRef = useRef(0);
  const mountedRef = useRef(true);
  const prefetchGenerationRef = useRef(0);
  const gestureRecomputeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pendingGestureRecomputeRef = useRef<{
    center: [number, number];
    zoom: number;
  } | null>(null);
  const lastGestureRecomputeTsRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  const commitInlineLabelLayout = useCallback(
    (
      nextPlacements: LabelPlacement[],
      enabled: boolean,
      explicitHash?: string,
      explicitIds?: string[]
    ) => {
      const nextIds =
        explicitIds && explicitIds.length > 0
          ? [...explicitIds]
          : nextPlacements.map((placement) => placement.id);
      const nextHash =
        explicitHash ??
        [...nextPlacements]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((placement) => `${placement.id}:${placement.slot}`)
          .join("|");
      const hasSameState =
        inlineLabelHashRef.current === nextHash &&
        inlineLabelsEnabledRef.current === enabled;
      if (hasSameState) {
        return;
      }
      inlineLabelHashRef.current = nextHash;
      inlineLabelsEnabledRef.current = enabled;
      inlineLabelIdsRef.current = nextIds;
      stickySlotByIdRef.current = new Map(
        nextPlacements.map((placement) => [placement.id, placement.slot])
      );
      setInlineLabelIds(nextIds);
      setInlineLabelPlacements(nextPlacements);
    },
    []
  );

  useEffect(() => {
    inlineLabelIdsRef.current = inlineLabelIds;
  }, [inlineLabelIds]);

  const recomputeInlineLabels = useCallback(
    (
      nextCenter: [number, number],
      nextZoom: number,
      source:
        | "dataset"
        | "layout"
        | "map-ready"
        | "region-change"
        | "region-complete"
        | "marker-press" = "dataset"
    ) => {
      const startedAtMs = Date.now();
      const selectionRunId = nativeProjectionRequestRef.current + 1;
      nativeProjectionRequestRef.current = selectionRunId;
      if (
        mapLayoutSize.width <= 0 ||
        mapLayoutSize.height <= 0 ||
        labelCandidates.length === 0 ||
        !showSingleLayer
      ) {
        commitInlineLabelLayout([], false, "", []);
        lastInlineRecomputeRef.current = null;
        stickySlotByIdRef.current = new Map();
        forceInlineLabelIdsRef.current.clear();
        return;
      }

      const effectiveNextZoomRaw =
        Platform.OS === "ios" ? nextZoom + IOS_ZOOM_OFFSET : nextZoom;
      const effectiveNextZoom = clampNumber(effectiveNextZoomRaw, 0, 20);
      const hasForcedIds = forceInlineLabelIdsRef.current.size > 0;
      const previousRecompute = lastInlineRecomputeRef.current;
      let panDeltaPx = Number.POSITIVE_INFINITY;
      let zoomDelta = Number.POSITIVE_INFINITY;
      if (previousRecompute) {
        const worldSize = 256 * Math.pow(2, effectiveNextZoom);
        const previousPoint = projectToWorld(
          previousRecompute.center[0],
          previousRecompute.center[1],
          worldSize
        );
        const nextPoint = projectToWorld(nextCenter[0], nextCenter[1], worldSize);
        const deltaX = wrapWorldDelta(nextPoint.x - previousPoint.x, worldSize);
        const deltaY = nextPoint.y - previousPoint.y;
        panDeltaPx = Math.hypot(deltaX, deltaY);
        zoomDelta = Math.abs(effectiveNextZoom - previousRecompute.zoom);
      }
      const shouldThrottleIOSRecompute =
        isIOSStableMarkersMode &&
        (source === "region-change" || source === "region-complete") &&
        !hasForcedIds;

      if (shouldThrottleIOSRecompute) {
        if (
          previousRecompute &&
          panDeltaPx < IOS_LABEL_RECOMPUTE_PAN_THRESHOLD_PX &&
          zoomDelta < IOS_LABEL_RECOMPUTE_ZOOM_THRESHOLD
        ) {
          return;
        }
      }

      if (
        source === "region-complete" &&
        !hasForcedIds &&
        previousRecompute &&
        panDeltaPx < LABEL_RECOMPUTE_SKIP_PAN_PX &&
        zoomDelta < LABEL_RECOMPUTE_SKIP_ZOOM
      ) {
        return;
      }

      const applySelection = (selectionCandidates: MarkerLabelCandidate[]) => {
        if (
          !mountedRef.current ||
          nativeProjectionRequestRef.current !== selectionRunId
        ) {
          return;
        }

        const previousHash = inlineLabelHashRef.current;
        const previousEnabled = inlineLabelsEnabledRef.current;

        if (!mapLabelCollisionV2Enabled) {
          if (effectiveNextZoom < singleLayerEnterZoom) {
            commitInlineLabelLayout([], false, "", []);
            lastInlineRecomputeRef.current = {
              center: [nextCenter[0], nextCenter[1]],
              zoom: effectiveNextZoom,
            };
            stickySlotByIdRef.current = new Map();
            forceInlineLabelIdsRef.current.clear();
            return;
          }

          const worldSize = 256 * Math.pow(2, effectiveNextZoom);
          const centerPoint = projectToWorld(nextCenter[0], nextCenter[1], worldSize);
          const visiblePlacements: LabelPlacement[] = [];

          selectionCandidates.forEach((candidate) => {
            const hasNativePoint =
              typeof candidate.screenX === "number" &&
              Number.isFinite(candidate.screenX) &&
              typeof candidate.screenY === "number" &&
              Number.isFinite(candidate.screenY);
            let screenX = 0;
            let screenY = 0;

            if (hasNativePoint) {
              screenX = candidate.screenX!;
              screenY = candidate.screenY!;
            } else {
              const candidatePoint = projectToWorld(
                candidate.coordinate.longitude,
                candidate.coordinate.latitude,
                worldSize
              );
              const dx = wrapWorldDelta(candidatePoint.x - centerPoint.x, worldSize);
              const dy = candidatePoint.y - centerPoint.y;
              screenX = mapLayoutSize.width / 2 + dx;
              screenY = mapLayoutSize.height / 2 + dy;
            }

            const candidateWidth = candidate.estimatedWidth ?? labelEngineBaseSize.width;
            const candidateHeight = candidate.labelHeight ?? labelEngineBaseSize.height;
            const candidateOffsetX = candidate.labelOffsetX ?? 0;
            const candidateOffsetY = candidate.labelOffsetY ?? labelEngineBaseSize.offsetY;
            const renderLeft = screenX + candidateOffsetX - candidateWidth / 2;
            const renderTop = screenY + candidateOffsetY;
            const renderRight = renderLeft + candidateWidth;
            const renderBottom = renderTop + candidateHeight;

            if (
              renderRight < -FULL_SPRITE_VIEWPORT_MARGIN_X ||
              renderLeft > mapLayoutSize.width + FULL_SPRITE_VIEWPORT_MARGIN_X ||
              renderBottom < -FULL_SPRITE_VIEWPORT_MARGIN_Y ||
              renderTop > mapLayoutSize.height + FULL_SPRITE_VIEWPORT_MARGIN_Y
            ) {
              return;
            }

            visiblePlacements.push({
              id: candidate.id,
              title: candidate.title,
              slot: "below",
              left: renderLeft,
              top: renderTop,
              width: candidateWidth,
              height: candidateHeight,
              screenX: screenX + candidateOffsetX,
              screenY: screenY + candidateOffsetY,
              score: 1,
            });
          });

          const visibleIds = visiblePlacements.map((placement) => placement.id);
          const visibleHash = visiblePlacements
            .map((placement) => `${placement.id}:${placement.slot}`)
            .sort()
            .join("|");
          commitInlineLabelLayout(
            visiblePlacements,
            true,
            visibleHash,
            visibleIds
          );
          lastInlineRecomputeRef.current = {
            center: [nextCenter[0], nextCenter[1]],
            zoom: effectiveNextZoom,
          };
          forceInlineLabelIdsRef.current.clear();
          return;
        }

        const denseLowZoomCircuitBreakerActive =
          selectionCandidates.length > MAP_LABEL_DENSE_MARKER_COUNT_THRESHOLD &&
          effectiveNextZoom < singleLayerEnterZoom;
        const policyForPass = denseLowZoomCircuitBreakerActive
          ? {
              ...resolvedLabelPolicy,
              lowZoomMax: Math.min(
                resolvedLabelPolicy.lowZoomMax,
                MAP_LABEL_DENSE_LOW_ZOOM_BUDGET
              ),
            }
          : resolvedLabelPolicy;
        const forcedIds =
          forceInlineLabelIdsRef.current.size > 0
            ? new Set(forceInlineLabelIdsRef.current)
            : undefined;
        const maxCandidatesForPass =
          source === "region-change"
            ? MAP_LABEL_MAX_CANDIDATES_V3
            : Math.max(MAP_LABEL_MAX_CANDIDATES_V3, selectionCandidates.length);
        const selection = labelLayoutV3Enabled
          ? selectInlineLabelLayout({
              candidates: selectionCandidates,
              center: nextCenter,
              zoom: effectiveNextZoom,
              singleModeZoom: singleLayerEnterZoom,
              preferVisibleNonOverlapping: true,
              collisionGapX: INLINE_LABEL_COLLISION_GAP_X,
              collisionGapY: INLINE_LABEL_COLLISION_GAP_Y,
              collisionWidthScale: MAP_LABEL_COLLISION_WIDTH_SCALE_V3,
              collisionHeightScale: MAP_LABEL_COLLISION_HEIGHT_SCALE_V3,
              maxCandidates: maxCandidatesForPass,
              stickySlotBonus: MAP_LABEL_STICKY_SLOT_BONUS,
              slotOffsets: INLINE_LABEL_FIXED_SLOT_OFFSETS,
              slotPenalties: INLINE_LABEL_FIXED_SLOT_PENALTIES,
              mapSize: mapLayoutSize,
              labelSize: labelEngineBaseSize,
              policy: policyForPass,
              wasEnabled: inlineLabelsEnabledRef.current,
              stickyIds: new Set(inlineLabelIdsRef.current),
              stickySlots: stickySlotByIdRef.current,
              forceIncludeIds: forcedIds,
            })
          : (() => {
              const legacySelection = selectInlineLabelIds({
                candidates: selectionCandidates,
                center: nextCenter,
                zoom: effectiveNextZoom,
                singleModeZoom: singleLayerEnterZoom,
                preferVisibleNonOverlapping: true,
                mapSize: mapLayoutSize,
                labelSize: labelEngineBaseSize,
                policy: policyForPass,
                wasEnabled: inlineLabelsEnabledRef.current,
                stickyIds: new Set(inlineLabelIdsRef.current),
                forceIncludeIds: forcedIds,
              });
              return {
                ...legacySelection,
                placements: [] as LabelPlacement[],
                hiddenCount: 0,
                forcedPlaced: 0,
                evicted: 0,
              };
            })();

        commitInlineLabelLayout(
          selection.placements,
          selection.enabled,
          selection.hash,
          selection.ids
        );
        lastInlineRecomputeRef.current = {
          center: [nextCenter[0], nextCenter[1]],
          zoom: effectiveNextZoom,
        };
        forceInlineLabelIdsRef.current.clear();
        const currentHash = selection.hash;
        const hashChanged =
          previousHash !== currentHash || previousEnabled !== selection.enabled;
        if (hashChanged) {
          recomputeCounterRef.current += 1;
        }
        if (isIOSStableMarkersMode && MAP_IOS_STABLE_MARKERS_LOGS_ENABLED) {
          const recomputeMs = Date.now() - startedAtMs;
          const fallbackCount = selection.ids.filter(
            (id) => !localFullSpriteIdSet.has(id)
          ).length;
          console.debug(
            `[map_ios_stable_markers_v1] source=${source} markers=${selectionCandidates.length} inlineLabelCount=${selection.ids.length} selectionHashChanges=${recomputeCounterRef.current} recomputeMs=${recomputeMs} fallbackCount=${fallbackCount}`
          );
        }

        if (MAP_LABEL_COLLISION_V2_LOGS_ENABLED) {
          const recomputeMs = Date.now() - startedAtMs;
          console.debug(
            `[map_label_collision_v2] source=${source} markers=${selectionCandidates.length} candidates=${selection.candidateCount ?? 0} projected=${selection.projectedCount ?? 0} selected=${selection.ids.length} hidden=${selection.hiddenCount ?? 0} forcedPlaced=${selection.forcedPlaced ?? 0} evicted=${selection.evicted ?? 0} rejectedByCollision=${selection.rejectedByCollision ?? 0} zoom=${effectiveNextZoom.toFixed(2)} recomputeMs=${recomputeMs}`
          );
        }
      };

      const shouldUseNativeProjection =
        labelLayoutV3Enabled &&
        mapLabelCollisionV2Enabled &&
        source !== "region-change" &&
        labelCandidates.length <= MAP_LABEL_MAX_CANDIDATES_V3;
      const mapView = cameraRef.current;
      if (!shouldUseNativeProjection || !mapView) {
        applySelection(labelCandidates);
        return;
      }

      const isSmallRegionCompleteStep =
        source === "region-complete" &&
        Number.isFinite(panDeltaPx) &&
        Number.isFinite(zoomDelta) &&
        panDeltaPx < 90 &&
        zoomDelta < 0.18;
      const baseNativeProjectionLimit =
        fullSpriteTextLayersEnabled && !useInlineLabelOverlay
          ? NATIVE_PROJECTION_FAST_LIMIT
          : labelCandidates.length;
      const dynamicNativeProjectionLimit = isSmallRegionCompleteStep
        ? NATIVE_PROJECTION_ULTRA_FAST_LIMIT
        : baseNativeProjectionLimit;
      const nativeProjectionFloor = Math.min(
        labelCandidates.length,
        Math.max(36, forceInlineLabelIdsRef.current.size * 6)
      );
      const nativeProjectionLimit = Math.min(
        labelCandidates.length,
        Math.max(nativeProjectionFloor, dynamicNativeProjectionLimit)
      );
      const stickyNativeProjectionIds = new Set<string>([
        ...inlineLabelIdsRef.current,
        ...Array.from(forceInlineLabelIdsRef.current),
      ]);
      const worldSize = 256 * Math.pow(2, effectiveNextZoom);
      const centerPoint = projectToWorld(nextCenter[0], nextCenter[1], worldSize);
      const distanceToCenterById = new Map<string, number>();
      labelCandidates.forEach((candidate) => {
        const point = projectToWorld(
          candidate.coordinate.longitude,
          candidate.coordinate.latitude,
          worldSize
        );
        const dx = wrapWorldDelta(point.x - centerPoint.x, worldSize);
        const dy = point.y - centerPoint.y;
        distanceToCenterById.set(candidate.id, Math.hypot(dx, dy));
      });
      const nativeProjectionCandidates = [...labelCandidates]
        .sort((left, right) => {
          const leftSticky = stickyNativeProjectionIds.has(left.id) ? 1 : 0;
          const rightSticky = stickyNativeProjectionIds.has(right.id) ? 1 : 0;
          if (rightSticky !== leftSticky) {
            return rightSticky - leftSticky;
          }
          const leftDistance = distanceToCenterById.get(left.id) ?? Number.POSITIVE_INFINITY;
          const rightDistance = distanceToCenterById.get(right.id) ?? Number.POSITIVE_INFINITY;
          if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
          }
          const leftPriority = Number.isFinite(left.labelPriority)
            ? left.labelPriority
            : 0;
          const rightPriority = Number.isFinite(right.labelPriority)
            ? right.labelPriority
            : 0;
          if (rightPriority !== leftPriority) {
            return rightPriority - leftPriority;
          }
          const leftRating = Number.isFinite(left.rating) ? left.rating : 0;
          const rightRating = Number.isFinite(right.rating) ? right.rating : 0;
          if (rightRating !== leftRating) {
            return rightRating - leftRating;
          }
          return left.id.localeCompare(right.id);
        })
        .slice(0, nativeProjectionLimit);

      const shouldRunInstantPassBeforeNative =
        !fullSpriteTextLayersEnabled ||
        useInlineLabelOverlay ||
        source === "map-ready" ||
        source === "dataset" ||
        source === "layout" ||
        !inlineLabelsEnabledRef.current ||
        inlineLabelIdsRef.current.length === 0;

      if (shouldRunInstantPassBeforeNative) {
        // Instant pass first, then precise native-projected refinement.
        applySelection(labelCandidates);
      }

      if (nativeProjectionCandidates.length === 0) {
        applySelection(labelCandidates);
        return;
      }

      void Promise.all(
        nativeProjectionCandidates.map(async (candidate) => {
          try {
            const point = await mapView.pointForCoordinate(candidate.coordinate);
            if (
              point &&
              Number.isFinite(point.x) &&
              Number.isFinite(point.y)
            ) {
              return {
                ...candidate,
                screenX: point.x,
                screenY: point.y,
              };
            }
          } catch {
          }
          return candidate;
        })
      )
        .then((projectedCandidatesSubset) => {
          const projectedById = new Map(
            projectedCandidatesSubset.map((candidate) => [candidate.id, candidate])
          );
          const mergedCandidates = labelCandidates.map(
            (candidate) => projectedById.get(candidate.id) ?? candidate
          );
          applySelection(mergedCandidates);
        })
        .catch(() => {
          applySelection(labelCandidates);
        });
    },
    [
      cameraRef,
      commitInlineLabelLayout,
      fullSpriteTextLayersEnabled,
      labelCandidates,
      labelEngineBaseSize,
      mapLabelCollisionV2Enabled,
      mapLayoutSize.height,
      mapLayoutSize.width,
      singleLayerEnterZoom,
      showSingleLayer,
      labelLayoutV3Enabled,
      isIOSStableMarkersMode,
      localFullSpriteIdSet,
      resolvedLabelPolicy,
      useInlineLabelOverlay,
    ]
  );

  const readyFullSpriteIdSet = useMemo(
    () => new Set(readyFullSpriteIds),
    [readyFullSpriteIds]
  );
  const inlineLabelIdSet = useMemo(() => new Set(inlineLabelIds), [inlineLabelIds]);

  const fullSpriteTargetIdSet = useMemo(() => {
    if (!useOverlayFullSprites || !showSingleLayer) {
      return new Set<string>();
    }
    const next = new Set<string>();
    inlineLabelIds.forEach((id) => {
      if (localFullSpriteIdSet.has(id) || readyFullSpriteIdSet.has(id)) {
        next.add(id);
      }
    });
    return next;
  }, [
    useOverlayFullSprites,
    inlineLabelIds,
    localFullSpriteIdSet,
    readyFullSpriteIdSet,
    showSingleLayer,
  ]);

  const fullSpriteTargetHash = useMemo(() => {
    if (fullSpriteTargetIdSet.size === 0) {
      return "";
    }
    return Array.from(fullSpriteTargetIdSet).sort().join("|");
  }, [fullSpriteTargetIdSet]);

  const inlineTextRenderedByMarkerIdSet = useMemo(() => {
    if (!fullSpriteTextLayersEnabled || !showSingleLayer) {
      return new Set<string>();
    }
    if (useOverlayFullSprites) {
      return fullSpriteTargetIdSet;
    }
    if (isIOSStableMarkersMode) {
      const next = new Set<string>();
      inlineLabelIds.forEach((id) => {
        if (localFullSpriteIdSet.has(id)) {
          next.add(id);
        }
      });
      return next;
    }
    return new Set<string>();
  }, [
    fullSpriteTargetIdSet,
    fullSpriteTextLayersEnabled,
    inlineLabelIds,
    isIOSStableMarkersMode,
    localFullSpriteIdSet,
    showSingleLayer,
    useOverlayFullSprites,
  ]);

  const failedRemoteSpriteKeySet = useMemo(
    () => new Set(failedRemoteSpriteKeys),
    [failedRemoteSpriteKeys]
  );

  useEffect(() => {
    fullSpriteOpacityByIdRef.current = fullSpriteOpacityById;
  }, [fullSpriteOpacityById]);

  const stopFullSpriteFade = useCallback(() => {
    if (fullSpriteFadeRafRef.current !== null) {
      cancelAnimationFrame(fullSpriteFadeRafRef.current);
      fullSpriteFadeRafRef.current = null;
    }
    fullSpriteFadePrevTsRef.current = null;
  }, []);

  const isClusterToSingleFadeActive = useCallback(
    () =>
      showSingleLayerRef.current &&
      Date.now() < clusterToSingleFadeUntilRef.current,
    []
  );

  const runFullSpriteFadeFrame = useCallback(
    (timestamp: number) => {
      const previous = fullSpriteOpacityByIdRef.current;
      const previousTimestamp = fullSpriteFadePrevTsRef.current ?? timestamp;
      const deltaMs = Math.min(64, Math.max(1, timestamp - previousTimestamp));
      fullSpriteFadePrevTsRef.current = timestamp;

      const next: Record<string, number> = {};
      const candidateIds = new Set<string>([
        ...Object.keys(previous),
        ...Array.from(fullSpriteTargetIdsRef.current),
      ]);
      let shouldContinue = false;

      candidateIds.forEach((id) => {
        const currentOpacity = previous[id] ?? 0;
        const targetOpacity = fullSpriteTargetIdsRef.current.has(id) ? 1 : 0;
        const durationMs =
          targetOpacity > currentOpacity
            ? FULL_SPRITE_FADE_IN_DURATION_MS
            : FULL_SPRITE_FADE_OUT_DURATION_MS;
        const step = durationMs > 0 ? deltaMs / durationMs : 1;
        const nextOpacity =
          targetOpacity > currentOpacity
            ? Math.min(1, currentOpacity + step)
            : Math.max(0, currentOpacity - step);

        if (nextOpacity > FULL_SPRITE_FADE_EPSILON || targetOpacity > 0) {
          next[id] = nextOpacity;
        }
        if (Math.abs(nextOpacity - targetOpacity) > 0.0001) {
          shouldContinue = true;
        }
      });

      fullSpriteOpacityByIdRef.current = next;
      if (!areOpacityMapsEqual(previous, next)) {
        setFullSpriteOpacityById(next);
      }

      if (shouldContinue) {
        fullSpriteFadeRafRef.current = requestAnimationFrame(runFullSpriteFadeFrame);
        return;
      }

      stopFullSpriteFade();
    },
    [stopFullSpriteFade]
  );

  useEffect(() => {
    const previous = previousShowSingleLayerRef.current;
    if (!previous && showSingleLayer) {
      clusterToSingleFadeUntilRef.current = fullSpriteFadeEnabled
        ? Date.now() + CLUSTER_TO_SINGLE_FADE_WINDOW_MS
        : 0;
    } else if (previous && !showSingleLayer) {
      clusterToSingleFadeUntilRef.current = 0;
      stopFullSpriteFade();
      if (Object.keys(fullSpriteOpacityByIdRef.current).length > 0) {
        fullSpriteOpacityByIdRef.current = {};
        setFullSpriteOpacityById({});
      }
    }
    previousShowSingleLayerRef.current = showSingleLayer;
  }, [fullSpriteFadeEnabled, showSingleLayer, stopFullSpriteFade]);

  useEffect(() => {
    fullSpriteTargetIdsRef.current = new Set(fullSpriteTargetIdSet);

    if (!fullSpriteFadeEnabled || !isClusterToSingleFadeActive()) {
      stopFullSpriteFade();
      const immediateMap: Record<string, number> = {};
      fullSpriteTargetIdSet.forEach((id) => {
        immediateMap[id] = 1;
      });
      fullSpriteOpacityByIdRef.current = immediateMap;
      setFullSpriteOpacityById((previous) =>
        areOpacityMapsEqual(previous, immediateMap) ? previous : immediateMap
      );
      return;
    }

    if (fullSpriteFadeRafRef.current === null) {
      fullSpriteFadeRafRef.current = requestAnimationFrame(runFullSpriteFadeFrame);
    }
  }, [
    fullSpriteFadeEnabled,
    fullSpriteTargetHash,
    fullSpriteTargetIdSet,
    isClusterToSingleFadeActive,
    runFullSpriteFadeFrame,
    stopFullSpriteFade,
  ]);

  useEffect(() => {
    return () => {
      stopFullSpriteFade();
    };
  }, [stopFullSpriteFade]);

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
    recomputeInlineLabels(cameraCenterRef.current, zoomRef.current, "dataset");
  }, [labelCandidates, recomputeInlineLabels]);

  useEffect(() => {
    const generation = prefetchGenerationRef.current + 1;
    prefetchGenerationRef.current = generation;

    if (!fullSpriteTextLayersEnabled || !showSingleLayer) {
      setReadyFullSpriteIds((previous) => (previous.length > 0 ? [] : previous));
      return;
    }
    if (isIOSStableMarkersMode) {
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

      if (hasLocalSprite && !readyFullSpriteIdSet.has(markerId)) {
        immediateReadyMarkerIds.push(markerId);
      }

      if (!remoteSpriteUrl || failedRemoteSpriteKeySet.has(spriteKey)) {
        return;
      }

      if (pendingRemoteSpritePrefetchRef.current.has(spriteKey)) {
        return;
      }

      pendingRemoteSpritePrefetchRef.current.add(spriteKey);
      void Image.prefetch(remoteSpriteUrl)
        .then((prefetchOk) => {
          if (
            !mountedRef.current ||
            prefetchGenerationRef.current !== generation
          ) {
            return;
          }
          if (prefetchOk) {
            setReadyFullSpriteIds((previous) => appendUniqueValue(previous, markerId));
            return;
          }
          setFailedRemoteSpriteKeys((previous) => appendUniqueValue(previous, spriteKey));
          if (hasLocalSprite) {
            requestAnimationFrame(() => {
              if (
                !mountedRef.current ||
                prefetchGenerationRef.current !== generation
              ) {
                return;
              }
              setReadyFullSpriteIds((previous) => appendUniqueValue(previous, markerId));
            });
          }
        })
        .catch(() => {
          if (
            !mountedRef.current ||
            prefetchGenerationRef.current !== generation
          ) {
            return;
          }
          setFailedRemoteSpriteKeys((previous) => appendUniqueValue(previous, spriteKey));
          if (hasLocalSprite) {
            requestAnimationFrame(() => {
              if (
                !mountedRef.current ||
                prefetchGenerationRef.current !== generation
              ) {
                return;
              }
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
    fullSpriteTextLayersEnabled,
    inlineLabelIds,
    isIOSStableMarkersMode,
    readyFullSpriteIdSet,
    showSingleLayer,
    singleMarkerById,
  ]);

  useEffect(() => {
    if (!MAP_FULL_SPRITES_LOGS_ENABLED || !fullSpriteTextLayersEnabled) {
      return;
    }
    console.debug(
      `[map_full_sprites_v1] markers=${filteredMarkers.length} selected=${inlineLabelIds.length} ready=${readyFullSpriteIds.length} remoteFailures=${failedRemoteSpriteKeys.length}`
    );
  }, [
    fullSpriteTextLayersEnabled,
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

  const clearPendingGestureLabelRecompute = useCallback(() => {
    if (gestureRecomputeTimeoutRef.current) {
      clearTimeout(gestureRecomputeTimeoutRef.current);
      gestureRecomputeTimeoutRef.current = null;
    }
    pendingGestureRecomputeRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearPendingGestureLabelRecompute();
    };
  }, [clearPendingGestureLabelRecompute]);

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

  const scheduleGestureLabelRecompute = useCallback(
    (nextCenter: [number, number], nextZoom: number) => {
      if (!labelLayoutV3Enabled) {
        return;
      }
      if (fullSpriteTextLayersEnabled && !useInlineLabelOverlay) {
        return;
      }

      pendingGestureRecomputeRef.current = {
        center: [nextCenter[0], nextCenter[1]],
        zoom: nextZoom,
      };

      const now = Date.now();
      const elapsed = now - lastGestureRecomputeTsRef.current;
      const runImmediate =
        elapsed >= MAP_LABEL_GESTURE_RECOMPUTE_MS &&
        gestureRecomputeTimeoutRef.current === null;

      if (runImmediate) {
        lastGestureRecomputeTsRef.current = now;
        const pending = pendingGestureRecomputeRef.current;
        pendingGestureRecomputeRef.current = null;
        if (pending) {
          recomputeInlineLabels(pending.center, pending.zoom, "region-change");
        }
        return;
      }

      if (gestureRecomputeTimeoutRef.current) {
        return;
      }

      const waitMs = Math.max(1, MAP_LABEL_GESTURE_RECOMPUTE_MS - elapsed);
      gestureRecomputeTimeoutRef.current = setTimeout(() => {
        gestureRecomputeTimeoutRef.current = null;
        lastGestureRecomputeTsRef.current = Date.now();
        const pending = pendingGestureRecomputeRef.current;
        pendingGestureRecomputeRef.current = null;
        if (pending) {
          recomputeInlineLabels(pending.center, pending.zoom, "region-change");
        }
      }, waitMs);
    },
    [
      fullSpriteTextLayersEnabled,
      labelLayoutV3Enabled,
      recomputeInlineLabels,
      useInlineLabelOverlay,
    ]
  );

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
      scheduleGestureLabelRecompute(nextCenter, nextZoom);
      onCameraChanged(nextCenter, nextZoom, true);
    },
    [applyRenderCamera, onCameraChanged, scheduleGestureLabelRecompute]
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
      clearPendingGestureLabelRecompute();
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
      recomputeInlineLabels(nextCenter, nextZoom, "region-complete");
    },
    [
      applyRenderCamera,
      clearPendingGestureLabelRecompute,
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
        const targetZoom = Math.min(
          20,
          Math.max(
            zoomRef.current + CLUSTER_PRESS_ZOOM_STEP,
            singleLayerEnterZoom + CLUSTER_PRESS_TARGET_MARGIN_ZOOM
          )
        );

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

      if (mapLabelCollisionV2Enabled) {
        forceInlineLabelIdsRef.current = new Set([marker.id]);
        recomputeInlineLabels(
          cameraCenterRef.current,
          zoomRef.current,
          "marker-press"
        );
      }

      onMarkerPress?.(marker.id);
    },
    [
      cameraRef,
      clearPendingStackedOpen,
      mapLabelCollisionV2Enabled,
      onMarkerPress,
      recomputeInlineLabels,
      singleLayerEnterZoom,
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
      recomputeInlineLabels(cameraCenter, zoom, "layout");
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
          const inlineLabelSelected = inlineLabelIdSet.has(marker.id);
          const hasLocalInlineFullSprite =
            marker.markerData ? hasLocalFullMarkerSprite(marker.markerData) : false;
          const canUseIOSStableInlineSprite =
            isIOSStableMarkersMode &&
            fullSpriteTextLayersEnabled &&
            hasLocalInlineFullSprite &&
            !marker.isCluster &&
            !marker.isStacked &&
            Boolean(marker.markerData);
          let iosStableCompactImage: number | undefined;
          let iosStableCompactAnchor: { x: number; y: number } | undefined;
          let iosStableFullImage: number | undefined;
          let iosStableFullAnchor: { x: number; y: number } | undefined;

          if (!marker.isCluster && !marker.isStacked && marker.markerData) {
            if (canUseIOSStableInlineSprite) {
              const compactResolved = resolveMarkerImage(marker.markerData, {
                preferFullSprite: false,
                remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
              });
              markerImage = compactResolved.image;
              markerAnchor = compactResolved.anchor;
              if (typeof compactResolved.image === "number") {
                iosStableCompactImage = compactResolved.image;
                iosStableCompactAnchor = compactResolved.anchor;
              }

              const fullResolved = resolveMarkerImage(marker.markerData, {
                preferFullSprite: true,
                preferLocalFullSprite: true,
                remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
              });
              if (
                fullResolved.variant !== "compact" &&
                typeof fullResolved.image === "number"
              ) {
                iosStableFullImage = fullResolved.image;
                iosStableFullAnchor = fullResolved.anchor;
              }
            } else {
              const resolved = resolveMarkerImage(marker.markerData, {
                preferFullSprite: false,
                remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
              });
              markerImage = resolved.image;
              markerAnchor = resolved.anchor;
            }
          }

          const useCustomImage = isValidMarkerImage(markerImage);
          const imageProp = useCustomImage ? markerImage : undefined;
          const anchorProp = useCustomImage ? markerAnchor : undefined;
          const markerPinColor = useCustomImage
            ? undefined
            : getDefaultPinColor(marker, hasActiveFilter);
          const fullOpacityForMarker =
            !marker.isCluster && !marker.isStacked
              ? clampNumber(fullSpriteOpacityById[marker.id] ?? 0, 0, 1)
              : 0;
          const compactMarkerOpacity =
            useOverlayFullSprites && fullOpacityForMarker >= 1 - FULL_SPRITE_FADE_EPSILON
              ? 0
              : 1;
          const numericImageProp = typeof imageProp === "number" ? imageProp : undefined;
          const iosCompactImageSource =
            typeof iosStableCompactImage === "number"
              ? iosStableCompactImage
              : numericImageProp;
          const shouldRenderIOSScaledStaticImage =
            isIOSStableMarkersMode &&
            typeof iosCompactImageSource === "number";
          const iosFullImageSource =
            typeof iosStableFullImage === "number" ? iosStableFullImage : undefined;
          const iosScaledMarkerSize = shouldRenderIOSScaledStaticImage
            ? getIOSScaledMarkerSize(iosCompactImageSource!)
            : undefined;
          const iosScaledFullSpriteSize =
            shouldRenderIOSScaledStaticImage && typeof iosFullImageSource === "number"
              ? getIOSScaledMarkerSize(iosFullImageSource!)
              : undefined;
          const iosScaledMarkerWrapperSize =
            shouldRenderIOSScaledStaticImage && iosScaledMarkerSize
              ? {
                  width: Math.max(
                    iosScaledMarkerSize.width,
                    iosScaledFullSpriteSize?.width ?? iosScaledMarkerSize.width
                  ),
                  height: Math.max(
                    iosScaledMarkerSize.height,
                    iosScaledFullSpriteSize?.height ?? iosScaledMarkerSize.height
                  ),
                }
              : undefined;
          const iosScaledActiveAnchor = iosStableCompactAnchor ?? anchorProp ?? { x: 0.5, y: 1 };
          const iosScaledWrapperAnchor =
            shouldRenderIOSScaledStaticImage && iosStableFullAnchor
              ? iosStableFullAnchor
              : iosScaledActiveAnchor;
          const iosScaledCompactOffset =
            shouldRenderIOSScaledStaticImage &&
            iosScaledMarkerSize &&
            iosScaledMarkerWrapperSize
              ? {
                  left:
                    iosScaledWrapperAnchor.x * iosScaledMarkerWrapperSize.width -
                    iosScaledActiveAnchor.x * iosScaledMarkerSize.width,
                  top:
                    iosScaledWrapperAnchor.y * iosScaledMarkerWrapperSize.height -
                    iosScaledActiveAnchor.y * iosScaledMarkerSize.height,
                }
              : undefined;
          const iosScaledFullOffset =
            shouldRenderIOSScaledStaticImage &&
            iosScaledFullSpriteSize &&
            iosScaledMarkerWrapperSize
              ? {
                  left:
                    iosScaledWrapperAnchor.x * iosScaledMarkerWrapperSize.width -
                    (iosStableFullAnchor?.x ?? iosScaledWrapperAnchor.x) *
                      iosScaledFullSpriteSize.width,
                  top:
                    iosScaledWrapperAnchor.y * iosScaledMarkerWrapperSize.height -
                    (iosStableFullAnchor?.y ?? iosScaledWrapperAnchor.y) *
                      iosScaledFullSpriteSize.height,
                }
              : undefined;
          const iosUseDualLayer =
            shouldRenderIOSScaledStaticImage &&
            typeof iosFullImageSource === "number" &&
            iosScaledFullSpriteSize &&
            iosScaledFullOffset;
          const resolvedAnchorProp =
            shouldRenderIOSScaledStaticImage && iosScaledWrapperAnchor
              ? iosScaledWrapperAnchor
              : anchorProp;

          return (
            <Marker
              key={marker.key}
              coordinate={marker.coordinate}
              zIndex={marker.zIndex}
              opacity={compactMarkerOpacity}
              onPress={() => handleMarkerPress(marker)}
              {...(!shouldRenderIOSScaledStaticImage && imageProp
                ? { image: imageProp, tracksViewChanges: false }
                : shouldRenderIOSScaledStaticImage
                  ? { tracksViewChanges: false }
                  : {})}
              {...(resolvedAnchorProp ? { anchor: resolvedAnchorProp } : {})}
              {...(markerPinColor ? { pinColor: markerPinColor } : {})}
            >
              {shouldRenderIOSScaledStaticImage &&
              iosScaledMarkerSize &&
              iosScaledMarkerWrapperSize &&
              iosScaledCompactOffset ? (
                <View
                  style={[
                    localStyles.iosMarkerImageWrap,
                    {
                      width: iosScaledMarkerWrapperSize.width,
                      height: iosScaledMarkerWrapperSize.height,
                    },
                  ]}
                >
                  <Image
                    source={iosCompactImageSource!}
                    style={[
                      localStyles.iosMarkerImage,
                      iosScaledMarkerSize,
                      iosScaledCompactOffset,
                      iosUseDualLayer && inlineLabelSelected
                        ? localStyles.iosMarkerLayerHidden
                        : localStyles.iosMarkerLayerVisible,
                    ]}
                    resizeMode="contain"
                    fadeDuration={0}
                  />
                  {iosUseDualLayer && iosScaledFullOffset ? (
                    <Image
                      source={iosFullImageSource!}
                      style={[
                        localStyles.iosMarkerImage,
                        iosScaledFullSpriteSize,
                        iosScaledFullOffset,
                        inlineLabelSelected
                          ? localStyles.iosMarkerLayerVisible
                          : localStyles.iosMarkerLayerHidden,
                      ]}
                      resizeMode="contain"
                      fadeDuration={0}
                    />
                  ) : null}
                </View>
              ) : null}
            </Marker>
          );
        }),
    [
      failedRemoteSpriteKeySet,
      fullSpriteOpacityById,
      fullSpriteTextLayersEnabled,
      hasActiveFilter,
      handleMarkerPress,
      isIOSStableMarkersMode,
      inlineLabelIdSet,
      renderMarkers,
      useOverlayFullSprites,
    ]
  );

  const inlineLabelOverlayElements = useMemo(() => {
    if (!showSingleLayer || inlineLabelPlacements.length === 0) {
      return [] as React.ReactNode[];
    }

    const placementsToRender = useInlineLabelOverlay
      ? inlineLabelPlacements
      : inlineLabelPlacements.filter(
          (placement) => !inlineTextRenderedByMarkerIdSet.has(placement.id)
        );
    if (placementsToRender.length === 0) {
      return [] as React.ReactNode[];
    }

    return placementsToRender.map((placement) => (
      <View
        key={`inline-label:${placement.id}`}
        pointerEvents="none"
        style={[
          localStyles.inlineLabelWrap,
          {
            left: placement.left,
            top: placement.top,
            width: placement.width,
            height: placement.height,
          },
        ]}
      >
        <Text style={localStyles.inlineLabelText} numberOfLines={1}>
          {placement.title}
        </Text>
      </View>
    ));
  }, [
    inlineLabelPlacements,
    inlineTextRenderedByMarkerIdSet,
    showSingleLayer,
    useInlineLabelOverlay,
  ]);

  const fullSpriteOverlayElements = useMemo(() => {
    if (!useOverlayFullSprites) {
      return [] as React.ReactNode[];
    }

    return renderMarkers
      .filter((marker) =>
        isValidMapCoordinate(marker.coordinate.latitude, marker.coordinate.longitude)
      )
      .map((marker) => {
        if (marker.isCluster || marker.isStacked || !marker.markerData) {
          return null;
        }

        const opacity = fullSpriteOpacityById[marker.id] ?? 0;
        if (opacity <= FULL_SPRITE_FADE_EPSILON) {
          return null;
        }

        const resolved = resolveMarkerImage(marker.markerData, {
          preferFullSprite: true,
          preferLocalFullSprite: true,
          remoteSpriteFailureKeys: failedRemoteSpriteKeySet,
        });
        if (resolved.variant === "compact" || !isValidMarkerImage(resolved.image)) {
          return null;
        }

        const imageProp = resolved.image;
        const anchorProp = resolved.anchor;

        return (
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
      });
  }, [
    failedRemoteSpriteKeySet,
    fullSpriteOpacityById,
    useOverlayFullSprites,
    handleMarkerPress,
    renderMarkers,
  ]);

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
          recomputeInlineLabels(cameraCenter, zoom, "map-ready");
        }}
        onPanDrag={handlePanDrag}
        onPress={handleMapPress}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsCompass={false}
        zoomControlEnabled={false}
        rotateEnabled={true}
        pitchEnabled={true}
        customMapStyle={Platform.OS === "android" ? GOOGLE_MAP_STYLE : undefined}
        showsPointsOfInterest={Platform.OS === "ios" ? false : undefined}
      >
        {markerElements}
        {fullSpriteOverlayElements}

        {userCoord && isValidMapCoordinate(userCoord[1], userCoord[0]) && (
          <Marker
            key={USER_MARKER_ID}
            coordinate={{ latitude: userCoord[1], longitude: userCoord[0] }}
            pinColor={USER_MARKER_COLOR}
            onPress={() => undefined}
          />
        )}
      </MapView>

      {inlineLabelOverlayElements.length > 0 && (
        <View pointerEvents="none" style={localStyles.inlineLabelLayer}>
          {inlineLabelOverlayElements}
        </View>
      )}

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
  iosMarkerImageWrap: {
    position: "relative",
    alignItems: "center",
    overflow: "visible",
  },
  iosMarkerImage: {
    position: "absolute",
  },
  iosMarkerLayerVisible: {
    opacity: 1,
  },
  iosMarkerLayerHidden: {
    opacity: 0,
  },
  inlineLabelLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
  },
  inlineLabelWrap: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  inlineLabelText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    color: "#0B0F19",
    textAlign: "center",
    includeFontPadding: false,
    textShadowColor: "rgba(255, 255, 255, 0.92)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
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


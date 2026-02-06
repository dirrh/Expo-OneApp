import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import Supercluster from "supercluster";
import type { ImageSourcePropType, ImageURISource } from "react-native";
import type { DiscoverMapProps, DiscoverMapMarker } from "../../lib/interfaces";
import { styles } from "./discoverStyles";
import { regionToZoom, setMapCamera, zoomToRegion } from "../../lib/maps/camera";
import {
  BADGED_ICON_SOURCES,
  BadgedCategory,
} from "../../lib/maps/badgedIcons";
import {
  CLUSTER_ICON_SOURCES,
  ClusterCountKey,
} from "../../lib/maps/clusterIcons";

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
} from "../../lib/constants/discover";

const FITNESS_ICON = require("../../images/icons/fitness/fitness_without_review.png");
const GASTRO_ICON = require("../../images/icons/gastro/gastro_without_rating.png");
const RELAX_ICON = require("../../images/icons/relax/relax_without_rating.png");
const BEAUTY_ICON = require("../../images/icons/beauty/beauty_without_rating.png");
const MULTI_ICON = require("../../images/icons/multi/multi.png");
const CLUSTER_ID_PREFIX = "cluster:";
const USER_MARKER_ID = "user-location";
const USER_MARKER_COLOR = "#2563EB";
const CLUSTER_ZOOM_BUCKET_SIZE = 2;
const VIEWPORT_PADDING_RATIO = 0.35;

const PIN_CANVAS_WIDTH = 165;
const PIN_CANVAS_HEIGHT = 186;
const PIN_TRIM_WIDTH = 153;
const PIN_TRIM_HEIGHT = 177;
const PIN_TRIM_X = 0;
const PIN_TRIM_Y = 0;
const BADGED_CANVAS_HEIGHT = 226;
const BADGED_PIN_OFFSET_Y = 40;

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
  zIndex: number;
  isCluster: boolean;
  focusCoordinate: { latitude: number; longitude: number };
};

type ClusterPointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { markerId: string; weight: number };
};

const toIconSource = (source?: ImageSourcePropType | null) => {
  if (!source) {
    return undefined;
  }
  if (typeof source === "number") {
    return source;
  }
  if (Array.isArray(source)) {
    const first = source[0];
    if (!first) {
      return undefined;
    }
    return typeof first === "number" ? first : first;
  }
  return source;
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
  onCameraChanged,
  mapCenter,
  mapZoom,
  cityCenter,
  onMarkerPress,
  initialCamera,
}: DiscoverMapProps) {
  const cameraCenter = mapCenter ?? cityCenter ?? DEFAULT_CITY_CENTER;
  const zoom = mapZoom ?? DEFAULT_CAMERA_ZOOM;

  const initialRegionRef = useRef<Region | null>(null);
  if (!initialRegionRef.current) {
    initialRegionRef.current = zoomToRegion(cameraCenter, zoom);
  }

  const initialRegion = useMemo(() => {
    if (initialCamera) {
      return zoomToRegion(initialCamera.center, initialCamera.zoom);
    }
    return initialRegionRef.current!;
  }, [initialCamera]);

  const rawFeatures = useMemo<RenderFeature[]>(
    () =>
      filteredMarkers.map((marker) => ({
        id: marker.id,
        isCluster: false,
        count: 0,
        coordinates: { latitude: marker.coord.lat, longitude: marker.coord.lng },
        focusCoordinates: {
          latitude: marker.coord.lat,
          longitude: marker.coord.lng,
        },
        marker,
      })),
    [filteredMarkers]
  );

  const getRatingIcon = useCallback((marker?: DiscoverMapMarker) => {
    if (!marker) return undefined;
    if (marker.category === "Multi") return undefined;

    const numericRating =
      typeof marker.rating === "number"
        ? marker.rating
        : typeof marker.ratingFormatted === "string"
          ? Number.parseFloat(marker.ratingFormatted)
          : NaN;

    if (!Number.isFinite(numericRating)) return undefined;

    const clamped = Math.min(5, Math.max(0, numericRating));
    const ratingKey = clamped.toFixed(1);
    const iconsForCategory = BADGED_ICON_SOURCES[marker.category as BadgedCategory];
    return iconsForCategory?.[ratingKey as keyof typeof iconsForCategory];
  }, []);

  const effectiveZoomRaw = Platform.OS === "ios" ? zoom + IOS_ZOOM_OFFSET : zoom;
  const effectiveZoom = Math.max(0, Math.min(20, effectiveZoomRaw));
  const superclusterZoom = Math.max(0, Math.min(20, Math.floor(effectiveZoom)));
  const forceClusterZoom =
    Platform.OS === "ios" ? IOS_FORCE_CLUSTER_ZOOM : FORCE_CLUSTER_ZOOM;
  const singleModeZoom =
    Platform.OS === "ios" ? IOS_SINGLE_MODE_ZOOM : SINGLE_MODE_ZOOM;
  const stableClusterZoom = Math.max(
    0,
    Math.min(
      forceClusterZoom,
      Math.floor(superclusterZoom / CLUSTER_ZOOM_BUCKET_SIZE) *
        CLUSTER_ZOOM_BUCKET_SIZE
    )
  );

  const [committedMode, setCommittedMode] = useState<"cluster" | "single">(
    effectiveZoom >= singleModeZoom ? "single" : "cluster"
  );

  useEffect(() => {
    setCommittedMode((prevMode) => {
      if (effectiveZoom >= singleModeZoom) {
        return "single";
      }
      if (effectiveZoom <= forceClusterZoom) {
        return "cluster";
      }
      return prevMode;
    });
  }, [effectiveZoom, forceClusterZoom, singleModeZoom]);

  const showSingleLayer = committedMode === "single";
  const showClusterLayer = committedMode === "cluster";

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
    const paddedViewport = {
      minLng: Math.max(-180, viewportRegion.longitude - paddedHalfLng),
      maxLng: Math.min(180, viewportRegion.longitude + paddedHalfLng),
      minLat: Math.max(-85, viewportRegion.latitude - paddedHalfLat),
      maxLat: Math.min(85, viewportRegion.latitude + paddedHalfLat),
    };

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

    return buckets
      .filter((bucket) => {
        const lng = bucket.focus.longitude;
        const lat = bucket.focus.latitude;
        return !(
          lng < paddedViewport.minLng ||
          lng > paddedViewport.maxLng ||
          lat < paddedViewport.minLat ||
          lat > paddedViewport.maxLat
        );
      })
      .map((bucket) => ({
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
    filteredMarkers,
    stableClusterZoom,
    effectiveZoom,
    forceClusterZoom,
    cameraCenter,
    zoom,
  ]);

  const renderMarkers = useMemo<RenderMarker[]>(() => {
    const markers: RenderMarker[] = [];

    if (showClusterLayer) {
      clusteredFeatures.forEach((feature) => {
        const clusterCount = Math.min(
          99,
          Math.max(0, Math.floor(Number(feature.count ?? 0)))
        );
        const clusterIcon =
          CLUSTER_ICON_SOURCES[String(clusterCount) as ClusterCountKey] ??
          MULTI_ICON;

        markers.push({
          key: `cluster-layer:${feature.id}`,
          id: feature.id,
          coordinate: feature.coordinates,
          image: clusterIcon,
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
      rawFeatures.forEach((feature) => {
        const marker = feature.marker;
        const ratingIcon = getRatingIcon(marker);
        const fallbackIcon =
          toIconSource(marker?.icon) ??
          (marker?.category === "Fitness"
            ? FITNESS_ICON
            : marker?.category === "Gastro"
              ? GASTRO_ICON
              : marker?.category === "Relax"
                ? RELAX_ICON
                : marker?.category === "Beauty"
                  ? BEAUTY_ICON
                  : MULTI_ICON);
        const image = ratingIcon ?? fallbackIcon;

        markers.push({
          key: `single-layer:${feature.id}`,
          id: feature.id,
          coordinate: feature.coordinates,
          image,
          anchor: image
            ? {
                x: ratingIcon ? BADGED_ANCHOR_X : BASE_ANCHOR_X,
                y: ratingIcon ? BADGED_ANCHOR_Y : BASE_ANCHOR_Y,
              }
            : undefined,
          zIndex: 1,
          isCluster: false,
          focusCoordinate: feature.focusCoordinates ?? feature.coordinates,
        });
      });
    }

    return markers;
  }, [
    showClusterLayer,
    clusteredFeatures,
    showSingleLayer,
    rawFeatures,
    getRatingIcon,
  ]);

  const gestureRef = useRef(false);
  const gestureReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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
  }, [markGestureActive]);

  const handleTouchStart = useCallback(() => {
    markGestureActive();
  }, [markGestureActive]);

  const handleTouchEnd = useCallback(() => {
    scheduleGestureRelease();
  }, [scheduleGestureRelease]);

  const handleRegionChange = useCallback(
    (region: Region) => {
      if (!gestureRef.current) {
        return;
      }

      onCameraChanged([region.longitude, region.latitude], regionToZoom(region), true);
    },
    [onCameraChanged]
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region, details?: { isGesture?: boolean }) => {
      const isUserGesture = Boolean(details?.isGesture ?? gestureRef.current);
      scheduleGestureRelease();
      onCameraChanged(
        [region.longitude, region.latitude],
        regionToZoom(region),
        isUserGesture
      );
    },
    [onCameraChanged, scheduleGestureRelease]
  );

  const handleMarkerPress = useCallback(
    (marker: RenderMarker) => {
      if (marker.id === USER_MARKER_ID) {
        return;
      }

      if (marker.isCluster) {
        const targetZoom = Math.min(zoom + 2, 20);

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
    [cameraRef, onMarkerPress, zoom]
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
    <View style={styles.map}>
      <MapView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPanDrag={handlePanDrag}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsCompass={false}
        zoomControlEnabled={false}
        customMapStyle={Platform.OS === "android" ? GOOGLE_MAP_STYLE : undefined}
        showsPointsOfInterest={Platform.OS === "ios" ? false : undefined}
      >
        {renderMarkers.map((marker) => (
          <Marker
            key={marker.key}
            identifier={marker.key}
            coordinate={marker.coordinate}
            image={marker.image}
            anchor={marker.anchor}
            zIndex={marker.zIndex}
            tracksViewChanges={false}
            onPress={() => handleMarkerPress(marker)}
          />
        ))}

        {userCoord && (
          <Marker
            key={USER_MARKER_ID}
            identifier={USER_MARKER_ID}
            coordinate={{ latitude: userCoord[1], longitude: userCoord[0] }}
            pinColor={USER_MARKER_COLOR}
            onPress={() => undefined}
          />
        )}
      </MapView>
    </View>
  );
}

export default memo(DiscoverMap);

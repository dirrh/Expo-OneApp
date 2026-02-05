import React, { memo, useCallback, useMemo, useRef, useEffect, useState } from "react";
import { View, Text, Platform, ImageSourcePropType, Animated, Easing, StyleSheet } from "react-native";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { Image, useImage } from "expo-image";
import type { ImageRef } from "expo-image";
import type { DiscoverMapProps, DiscoverMapMarker } from "../../lib/interfaces";
import { styles } from "./discoverStyles";
import { setMapCamera } from "../../lib/maps/camera";
import {
  BADGED_ICON_SOURCES,
  BADGED_RATING_KEYS,
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
const HOME_ICON = require("../../images/home.png");
const BUSINESS_ICON = require("../../images/business.png");
const LIST_ICON = require("../../images/list.png");
const PIN_ICON = require("../../images/pin.png");

type BadgedIconRefs = Partial<
  Record<BadgedCategory, Partial<Record<string, ImageRef>>>
>;

const useBadgedIconRefs = () => {
  const [iconRefs, setIconRefs] = useState<BadgedIconRefs>({});

  useEffect(() => {
    let cancelled = false;

    const loadIcons = async () => {
      const entries = await Promise.all(
        (Object.keys(BADGED_ICON_SOURCES) as BadgedCategory[]).map(
          async (category) => {
            const sources = BADGED_ICON_SOURCES[category];
            const iconEntries = await Promise.all(
              BADGED_RATING_KEYS.map(async (key) => {
                try {
                  const ref = await Image.loadAsync(sources[key]);
                  return [key, ref] as const;
                } catch {
                  return [key, undefined] as const;
                }
              })
            );
            return [category, Object.fromEntries(iconEntries)] as const;
          }
        )
      );

      if (!cancelled) {
        setIconRefs(Object.fromEntries(entries));
      }
    };

    loadIcons();

    return () => {
      cancelled = true;
    };
  }, []);

  return iconRefs;
};

const useClusterIconRefs = (countKeys: string[]) => {
  const [iconRefs, setIconRefs] = useState<Record<string, ImageRef>>({});

  useEffect(() => {
    let cancelled = false;

    const keysToLoad = countKeys.filter((key) => !iconRefs[key]);
    if (!keysToLoad.length) {
      return () => {
        cancelled = true;
      };
    }

    const loadIcons = async () => {
      const entries = await Promise.all(
        keysToLoad.map(async (key) => {
          try {
            const ref = await Image.loadAsync(
              CLUSTER_ICON_SOURCES[key as ClusterCountKey]
            );
            return [key, ref] as const;
          } catch {
            return [key, undefined] as const;
          }
        })
      );

      if (!cancelled) {
        setIconRefs((prev) => ({
          ...prev,
          ...Object.fromEntries(entries.filter(([, ref]) => Boolean(ref))),
        }));
      }
    };

    loadIcons();

    return () => {
      cancelled = true;
    };
  }, [countKeys, iconRefs]);

  return iconRefs;
};
const CLUSTER_ID_PREFIX = "cluster:";

const IOS_CATEGORY_SYMBOLS = {
  Fitness: "dumbbell",
  Gastro: "fork.knife",
  Relax: "leaf",
  Beauty: "scissors",
  Multi: "circle.grid.2x2.fill",
} as const;

const IOS_MARKER_TINT = "#EB8100";
const IOS_USER_TINT = "#2563EB";

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

const GOOGLE_MAP_STYLE = JSON.stringify([
  { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
]);

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
  const fallbackCameraRef = useRef<{
    coordinates: { latitude: number; longitude: number };
    zoom: number;
  } | null>(null);
  if (!fallbackCameraRef.current) {
    fallbackCameraRef.current = {
      coordinates: { latitude: cameraCenter[1], longitude: cameraCenter[0] },
      zoom,
    };
  }
  const initialCameraPosition = useMemo(() => {
    if (initialCamera) {
      return {
        coordinates: {
          latitude: initialCamera.center[1],
          longitude: initialCamera.center[0],
        },
        zoom: initialCamera.zoom,
      };
    }
    return fallbackCameraRef.current!;
  }, [initialCamera]);

  const fitnessIcon = useImage(FITNESS_ICON);
  const gastroIcon = useImage(GASTRO_ICON);
  const relaxIcon = useImage(RELAX_ICON);
  const beautyIcon = useImage(BEAUTY_ICON);
  const multiIcon = useImage(MULTI_ICON);
  const clusterFallbackIcon = useImage(CLUSTER_ICON_SOURCES["1"]);
  const homeIcon = useImage(HOME_ICON);
  const businessIcon = useImage(BUSINESS_ICON);
  const listIcon = useImage(LIST_ICON);
  const pinIcon = useImage(PIN_ICON);
  const badgedIconRefs = useBadgedIconRefs();

  const rawFeatures = useMemo(
    () =>
      filteredMarkers.map((marker) => ({
        id: marker.id,
        isCluster: false,
        count: 0,
        coordinates: { latitude: marker.coord.lat, longitude: marker.coord.lng },
        marker,
      })),
    [filteredMarkers]
  );

  const iconLookup = useMemo(() => {
    return new Map<number, ReturnType<typeof useImage> | null>([
      [FITNESS_ICON, fitnessIcon],
      [GASTRO_ICON, gastroIcon],
      [RELAX_ICON, relaxIcon],
      [BEAUTY_ICON, beautyIcon],
      [MULTI_ICON, multiIcon],
      [HOME_ICON, homeIcon],
      [BUSINESS_ICON, businessIcon],
      [LIST_ICON, listIcon],
      [PIN_ICON, pinIcon],
    ]);
  }, [
    fitnessIcon,
    gastroIcon,
    relaxIcon,
    beautyIcon,
    multiIcon,
    homeIcon,
    businessIcon,
    listIcon,
    pinIcon,
  ]);

  const getRatingIcon = useCallback(
    (marker?: DiscoverMapMarker) => {
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
      const iconsForCategory =
        badgedIconRefs[marker.category as BadgedCategory];
      return iconsForCategory?.[ratingKey];
    },
    [badgedIconRefs]
  );

  const getIconRef = useCallback(
    (source?: ImageSourcePropType | null) => {
      if (!source) return undefined;
      if (typeof source === "number") {
        return iconLookup.get(source) ?? undefined;
      }
      return undefined;
    },
    [iconLookup]
  );

  const effectiveZoom = Platform.OS === "ios" ? zoom + IOS_ZOOM_OFFSET : zoom;
  const normalizedZoom = Math.max(0, Math.min(20, Math.round(effectiveZoom)));
  const forceClusterZoom =
    Platform.OS === "ios" ? IOS_FORCE_CLUSTER_ZOOM : FORCE_CLUSTER_ZOOM;
  const singleModeZoom =
    Platform.OS === "ios" ? IOS_SINGLE_MODE_ZOOM : SINGLE_MODE_ZOOM;
  const clusterOnly = normalizedZoom <= forceClusterZoom;
  const singleMode = normalizedZoom >= singleModeZoom;

  const groupingAnim = useRef(new Animated.Value(0)).current;
  const lastGroupingRef = useRef<"cluster" | "single" | null>(null);

  useEffect(() => {
    const nextMode = singleMode ? "single" : "cluster";
    if (lastGroupingRef.current === null) {
      lastGroupingRef.current = nextMode;
      return;
    }
    if (lastGroupingRef.current !== nextMode) {
      lastGroupingRef.current = nextMode;
      groupingAnim.stopAnimation();
      groupingAnim.setValue(0);
      Animated.timing(groupingAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [singleMode, groupingAnim]);

  const groupingOverlayStyle = useMemo(() => {
    const opacity = groupingAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.08, 0],
    });
    const scale = groupingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.985, 1],
    });
    return { opacity, transform: [{ scale }] };
  }, [groupingAnim]);

  const gridClusters = useMemo(() => {
    if (!clusterOnly) return [];

    const zoomStep = Math.max(0, forceClusterZoom - normalizedZoom);
    const basePixels =
      Platform.OS === "ios" ? IOS_CLUSTER_CELL_PX : ANDROID_CLUSTER_CELL_PX;
    const cellPx = Math.min(160, Math.max(80, basePixels + zoomStep * 20));
    const degreesPerPixel = 360 / (256 * Math.pow(2, normalizedZoom));
    const cellSize = cellPx * degreesPerPixel;

    if (!Number.isFinite(cellSize) || cellSize <= 0) return [];

    type Bucket = {
      id: string;
      sumLat: number;
      sumLng: number;
      count: number;
    };

    const buckets = new Map<string, Bucket>();

    const addToBucket = (key: string, lat: number, lng: number, weight: number) => {
      const existing = buckets.get(key);
      if (existing) {
        existing.sumLat += lat * weight;
        existing.sumLng += lng * weight;
        existing.count += weight;
        return;
      }
      buckets.set(key, {
        id: `${CLUSTER_ID_PREFIX}grid:${key}`,
        sumLat: lat * weight,
        sumLng: lng * weight,
        count: weight,
      });
    };

    filteredMarkers.forEach((marker) => {
      const { lat, lng } = marker.coord ?? {};
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const weight = marker.category === "Multi"
        ? Math.max(1, marker.groupCount ?? 1)
        : 1;
      const cellX = Math.floor(lng / cellSize);
      const cellY = Math.floor(lat / cellSize);
      const key = `${cellX}:${cellY}`;
      addToBucket(key, lat, lng, weight);
    });

    const bucketArray = Array.from(buckets.values());

    const getCenter = (bucket: Bucket) => ({
      latitude: bucket.sumLat / bucket.count,
      longitude: bucket.sumLng / bucket.count,
    });

    const distanceSq = (
      a: { latitude: number; longitude: number },
      b: { latitude: number; longitude: number }
    ) => {
      const cosLat = Math.cos((a.latitude * Math.PI) / 180);
      const dx = (b.longitude - a.longitude) * cosLat;
      const dy = b.latitude - a.latitude;
      return dx * dx + dy * dy;
    };

    const mergeInto = (target: Bucket, source: Bucket) => {
      target.sumLat += source.sumLat;
      target.sumLng += source.sumLng;
      target.count += source.count;
    };

    let majors = bucketArray.filter((b) => b.count >= 2);
    const singles = bucketArray.filter((b) => b.count < 2);

    if (majors.length === 0) {
      const pending = [...singles];
      const paired: Bucket[] = [];
      let pairIndex = 0;

      while (pending.length >= 2) {
        const first = pending.shift()!;
        const firstCenter = getCenter(first);
        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;
        pending.forEach((candidate, index) => {
          const dist = distanceSq(firstCenter, getCenter(candidate));
          if (dist < nearestDistance) {
            nearestDistance = dist;
            nearestIndex = index;
          }
        });
        const second = pending.splice(nearestIndex, 1)[0];
        paired.push({
          id: `${CLUSTER_ID_PREFIX}grid:pair:${pairIndex++}`,
          sumLat: first.sumLat + second.sumLat,
          sumLng: first.sumLng + second.sumLng,
          count: first.count + second.count,
        });
      }

      if (pending.length === 1) {
        const leftover = pending[0];
        if (paired.length > 0) {
          let nearestIndex = 0;
          let nearestDistance = Number.POSITIVE_INFINITY;
          paired.forEach((bucket, index) => {
            const dist = distanceSq(getCenter(leftover), getCenter(bucket));
            if (dist < nearestDistance) {
              nearestDistance = dist;
              nearestIndex = index;
            }
          });
          mergeInto(paired[nearestIndex], leftover);
        } else {
          paired.push({
            id: `${CLUSTER_ID_PREFIX}grid:single:${leftover.id}`,
            sumLat: leftover.sumLat,
            sumLng: leftover.sumLng,
            count: Math.max(2, leftover.count),
          });
        }
      }

      majors = paired;
    } else {
      singles.forEach((single) => {
        const singleCenter = getCenter(single);
        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;
        majors.forEach((bucket, index) => {
          const dist = distanceSq(singleCenter, getCenter(bucket));
          if (dist < nearestDistance) {
            nearestDistance = dist;
            nearestIndex = index;
          }
        });
        mergeInto(majors[nearestIndex], single);
      });
    }

    return majors.map((bucket) => ({
      id: bucket.id,
      isCluster: true,
      count: Math.min(99, Math.max(2, Math.round(bucket.count))),
      coordinates: getCenter(bucket),
      marker: undefined,
    }));
  }, [clusterOnly, filteredMarkers, normalizedZoom, forceClusterZoom]);

  const renderFeatures = singleMode ? rawFeatures : gridClusters;

  const clusterCountKeys = useMemo(() => {
    if (singleMode) return [];
    const keys = new Set<string>();
    gridClusters.forEach((feature) => {
      const rawCount = Number(feature.count ?? 0);
      const normalized = Number.isFinite(rawCount) ? Math.floor(rawCount) : 0;
      const clamped = Math.min(99, Math.max(0, normalized));
      keys.add(String(clamped));
    });
    return Array.from(keys);
  }, [gridClusters, singleMode]);

  const clusterIconRefs = useClusterIconRefs(clusterCountKeys);

  const userMarker = userCoord
    ? {
        id: "user-location",
        coordinates: { latitude: userCoord[1], longitude: userCoord[0] },
      }
    : null;

  const appleMarkers = useMemo(() => {
    const baseMarkers = renderFeatures.map((feature) => {
      const category = feature.isCluster
        ? "Multi"
        : feature.marker?.category ?? "Multi";
      return {
        id: feature.id,
        coordinates: feature.coordinates,
        systemImage: IOS_CATEGORY_SYMBOLS[category] ?? "mappin.circle.fill",
        tintColor: IOS_MARKER_TINT,
      };
    });

    if (userMarker) {
      baseMarkers.push({
        id: userMarker.id,
        coordinates: userMarker.coordinates,
        systemImage: "location.fill",
        tintColor: IOS_USER_TINT,
      });
    }

    return baseMarkers;
  }, [renderFeatures, userMarker]);

  const googleMarkers = useMemo(() => {
    const baseMarkers = renderFeatures.map((feature) => {
      const marker = feature.marker;
      const ratingIcon = feature.isCluster ? undefined : getRatingIcon(marker);
      const showClusterIcon = !singleMode && feature.isCluster;
      const clusterCount = showClusterIcon
        ? Math.min(99, Math.max(0, Math.floor(Number(feature.count ?? 0))))
        : null;
      const clusterIcon =
        clusterCount !== null
          ? clusterIconRefs[String(clusterCount)] ?? clusterFallbackIcon
          : undefined;
      const fallbackIcon = showClusterIcon
        ? clusterIcon
        : getIconRef(marker?.icon);
      const icon = ratingIcon ?? fallbackIcon;
      const anchor = icon
        ? {
            x: ratingIcon ? BADGED_ANCHOR_X : BASE_ANCHOR_X,
            y: ratingIcon ? BADGED_ANCHOR_Y : BASE_ANCHOR_Y,
          }
        : undefined;
      return {
        id: feature.id,
        coordinates: feature.coordinates,
        icon: icon ?? undefined,
        anchor,
        zIndex: feature.isCluster ? 2 : 1,
        showCallout: false,
      };
    });

    if (userMarker) {
      baseMarkers.push(userMarker);
    }

    return baseMarkers;
  }, [
    renderFeatures,
    getRatingIcon,
    getIconRef,
    clusterIconRefs,
    clusterFallbackIcon,
    singleMode,
    userMarker,
  ]);

  const handleCameraChanged = useCallback(
    (event: any) => {
      const { latitude, longitude } = event?.coordinates ?? {};
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return;
      }
      const nextZoom = typeof event?.zoom === "number" ? event.zoom : zoom;
      const isUserGesture = Boolean(
        event?.isGesture ?? event?.isGestureActive ?? event?.isUserGesture
      );
      onCameraChanged([longitude, latitude], nextZoom, isUserGesture);
    },
    [onCameraChanged, zoom]
  );

  const handleMarkerClick = useCallback(
    (event: any) => {
      const rawId =
        event?.id ??
        event?.markerId ??
        event?.annotationId ??
        event?.marker?.id ??
        "";

      const id = String(rawId ?? "");
      const isCluster = id.startsWith(CLUSTER_ID_PREFIX);

      const longitude =
        event?.coordinates?.longitude ??
        event?.marker?.coordinates?.longitude ??
        event?.annotation?.coordinates?.longitude;
      const latitude =
        event?.coordinates?.latitude ??
        event?.marker?.coordinates?.latitude ??
        event?.annotation?.coordinates?.latitude;

      if (isCluster && typeof latitude === "number" && typeof longitude === "number") {
        setMapCamera(cameraRef, {
          center: [longitude, latitude],
          zoom: Math.min(zoom + 2, 20),
          durationMs: 300,
        });
        return;
      }

      if (!id) {
        onMarkerPress?.("");
        return;
      }
      if (id === "user-location") {
        return;
      }
      onMarkerPress?.(id);
    },
    [onMarkerPress, zoom]
  );

  // Web fallback - Mapbox doesn't work on web
  if (Platform.OS === 'web') {
    return (
      <View style={styles.map}>
        <Text style={{ textAlign: 'center', marginTop: 50, color: '#666' }}>
          Map view is not available on web. Please use the mobile app.
        </Text>
      </View>
    );
  }

  return Platform.OS === "ios" ? (
    <View style={styles.map}>
      <AppleMaps.View
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        cameraPosition={initialCameraPosition}
        onCameraMove={handleCameraChanged}
        markers={appleMarkers}
        uiSettings={{ compassEnabled: false }}
        properties={{ pointsOfInterest: { including: [] } }}
        onMarkerClick={handleMarkerClick}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: "#fff" }, groupingOverlayStyle]}
      />
    </View>
  ) : (
    <View style={styles.map}>
      <GoogleMaps.View
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        cameraPosition={initialCameraPosition}
        onCameraMove={handleCameraChanged}
        markers={googleMarkers}
        uiSettings={{ compassEnabled: false, zoomControlsEnabled: false }}
        properties={{ mapStyleOptions: { json: GOOGLE_MAP_STYLE } }}
        onMarkerClick={handleMarkerClick}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: "#fff" }, groupingOverlayStyle]}
      />
    </View>
  );
}

export default memo(DiscoverMap);

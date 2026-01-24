import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import BranchCard from "../components/BranchCard";
import { Skeleton } from "../components/Skeleton";
import { useDataSource } from "../lib/data/useDataSource";
import type { DiscoverMapMarker, DiscoverCategory } from "../lib/interfaces";

// Skeleton pre BranchCard - zobrazuje sa počas načítavania
function SkeletonBranchCard() {
  return (
    <View style={skeletonStyles.card}>
      {/* Skeleton obrázka */}
      <Skeleton width={88} height={88} borderRadius={14} />
      {/* Skeleton obsahu */}
      <View style={skeletonStyles.content}>
        <Skeleton width="70%" height={18} borderRadius={4} />
        <View style={skeletonStyles.metaRow}>
          <Skeleton width={50} height={14} borderRadius={4} />
          <Skeleton width={60} height={14} borderRadius={4} />
          <Skeleton width={70} height={14} borderRadius={4} />
        </View>
        <View style={skeletonStyles.bottomRow}>
          <Skeleton width={140} height={28} borderRadius={14} />
          <Skeleton width={50} height={14} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

// Štýly pre skeleton
const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  content: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
});

// Placeholder obrázky pre kategórie
const CATEGORY_IMAGES: Record<DiscoverCategory, any> = {
  Fitness: require("../assets/365.jpg"),
  Gastro: require("../assets/royal.jpg"),
  Relax: require("../assets/klub.jpg"),
  Beauty: require("../assets/royal.jpg"),
};

// Haversine formula - výpočet vzdialenosti medzi dvoma GPS bodmi v km
function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Polomer Zeme v km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Formátovanie názvu z ID (napr. "gym_365" -> "Gym 365")
function formatTitle(id: string): string {
  return id
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface NearbyBranch {
  id: string;
  title: string;
  image: any;
  rating: number;
  distance: string;
  distanceKm: number;
  hours: string;
  category: DiscoverCategory;
  discount?: string;
  moreCount?: number;
}

// Fallback poloha - centrum Nitry
const NITRA_CENTER: [number, number] = [18.091, 48.3069];

// Výška jednej BranchCard vrátane marginu (126px karta + 16px margin)
const CARD_HEIGHT = 142;
const DEG_TO_RAD = Math.PI / 180;

export default function DiscoverListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();
  const dataSource = useDataSource();

  // Výpočet počtu skeleton kariet podľa výšky obrazovky
  const skeletonCount = useMemo(() => {
    const headerHeight = insets.top + 76;
    const availableHeight = screenHeight - headerHeight;
    return Math.ceil(availableHeight / CARD_HEIGHT);
  }, [screenHeight, insets.top]);

  // Získame userCoord z route params alebo použijeme fallback
  const userLocation: [number, number] = route.params?.userCoord ?? NITRA_CENTER;

  const [markers, setMarkers] = useState<DiscoverMapMarker[]>([]);
  const [loading, setLoading] = useState(true);

  // Načítanie markerov
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const markersData = await dataSource.getMarkers();
        if (isMounted) setMarkers(markersData);
      } catch (error) {
        console.error("Error loading markers:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [dataSource]);

  // Filtrovanie a zoradenie pobočiek do 2km
  // Používame bounding box filter a predpočítané konštanty pre rýchlejšie výpočty
  const nearbyBranches = useMemo<NearbyBranch[]>(() => {
    if (!userLocation || markers.length === 0) return [];

    const [userLng, userLat] = userLocation;
    const MAX_DIST_KM = 2;
    
    // Konštanty pre rýchly pred-filter
    const LAT_DEGREE_KM = 111; 
    const MAX_LAT_DIFF = MAX_DIST_KM / LAT_DEGREE_KM;
    // Longitude stupeň sa skracuje s kosínusom šírky
    const userLatRad = userLat * DEG_TO_RAD;
    const MAX_LNG_DIFF = MAX_DIST_KM / (LAT_DEGREE_KM * Math.cos(userLatRad));

    const results: NearbyBranch[] = [];

    for (const marker of markers) {
      if (marker.category === "Multi") continue;

      const mCoord = marker.coord;
      
      // 1. Rýchly Bounding Box filter (Lat)
      const latDiff = Math.abs(mCoord.lat - userLat);
      if (latDiff > MAX_LAT_DIFF) continue;

      // 2. Rýchly Bounding Box filter (Lng)
      const lngDiff = Math.abs(mCoord.lng - userLng);
      if (lngDiff > MAX_LNG_DIFF) continue;

      // 3. Presný výpočet len pre tie, čo prešli boxom
      const distanceKm = getDistanceKm(userLat, userLng, mCoord.lat, mCoord.lng);

      if (distanceKm <= MAX_DIST_KM) {
        results.push({
          id: marker.id,
          title: marker.title || formatTitle(marker.id),
          image: CATEGORY_IMAGES[marker.category as DiscoverCategory] || CATEGORY_IMAGES.Fitness,
          rating: marker.rating,
          distance: `${distanceKm.toFixed(1)} km`,
          distanceKm,
          hours: "9:00 - 21:00",
          category: marker.category as DiscoverCategory,
          discount: "20% discount on first entry",
          moreCount: 1,
        });
      }
    }

    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [userLocation, markers]);

  // Definujeme presnú výšku položiek pre FlatList
  // To umožňuje preskočiť výpočet rozloženia a zlepšuje plynulosť skrolovania
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CARD_HEIGHT,
      offset: CARD_HEIGHT * index,
      index,
    }),
    []
  );

  // Render funkcia pre FlatList (memoizovaná)
  const renderBranchItem = useCallback(
    ({ item }: { item: NearbyBranch }) => (
      <BranchCard
        title={item.title}
        image={item.image}
        rating={item.rating}
        distance={item.distance}
        hours={item.hours}
        category={item.category}
        discount={item.discount}
        moreCount={item.moreCount}
      />
    ),
    []
  );

  // Key extractor pre FlatList
  const keyExtractor = useCallback((item: NearbyBranch) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} activeOpacity={0.85}>
            <Image
              source={require("../images/pin.png")}
              style={styles.rowIcon}
              resizeMode="contain"
            />
            <Text style={styles.rowTextBold} numberOfLines={1}>
              Your Location
            </Text>
            <Image
              source={require("../images/options.png")}
              style={styles.caret}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          {/* Filter button */}
          <TouchableOpacity style={styles.roundBtn} activeOpacity={0.85}>
            <Image
              source={require("../images/filter.png")}
              style={styles.actionBtnIcon}
            />
          </TouchableOpacity>

          {/* Map button - návrat na mapu */}
          <TouchableOpacity
            style={styles.roundBtn}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Image
              source={require("../images/menu/compass_b.png")}
              style={styles.actionBtnIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <SkeletonBranchCard key={index} />
          ))}
        </View>
      ) : nearbyBranches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No places found within 2 km</Text>
        </View>
      ) : (
        <FlatList
          data={nearbyBranches}
          renderItem={renderBranchItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {nearbyBranches.length} {nearbyBranches.length === 1 ? "place" : "places"} within 2 km
            </Text>
          }
          // Nastavenia pre efektívne vykresľovanie zoznamu
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#F5F5F5",
  },
  card: {
    flex: 1,
    maxWidth: 200,
    marginRight: 24,
    backgroundColor: "white",
    borderRadius: 18,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 6px 12px rgba(0, 0, 0, 0.14)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }),
  },
  row: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowIcon: { width: 18, height: 18 },
  rowTextBold: { flex: 1, fontWeight: "700" },
  caret: { width: 16, height: 16, opacity: 0.7 },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 5px 10px rgba(0, 0, 0, 0.12)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 8,
        }),
  },
  actionBtnIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  resultCount: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    fontWeight: "500",
  },
});

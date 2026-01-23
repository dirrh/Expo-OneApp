import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import BranchCard from "../components/BranchCard";
import { useDataSource } from "../lib/data/useDataSource";
import type { DiscoverMapMarker, DiscoverCategory } from "../lib/interfaces";

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

export default function DiscoverListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const dataSource = useDataSource();

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
        if (isMounted) {
          setMarkers(markersData);
        }
      } catch (error) {
        console.error("Error loading markers:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [dataSource]);

  // Filtrovanie a zoradenie pobočiek do 2km
  const nearbyBranches = useMemo<NearbyBranch[]>(() => {
    if (!userLocation || markers.length === 0) return [];

    const [userLng, userLat] = userLocation;

    return markers
      .filter((m) => m.category !== "Multi") // Vynechať multi-piny
      .map((marker) => {
        const distanceKm = getDistanceKm(
          userLat,
          userLng,
          marker.coord.lat,
          marker.coord.lng
        );
        return {
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
        };
      })
      .filter((b) => b.distanceKm <= 2) // Len do 2km
      .sort((a, b) => a.distanceKm - b.distanceKm); // Zoradiť podľa vzdialenosti
  }, [userLocation, markers]);

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EB8100" />
          <Text style={styles.loadingText}>Loading nearby places...</Text>
        </View>
      ) : nearbyBranches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No places found within 2 km</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.resultCount}>
            {nearbyBranches.length} {nearbyBranches.length === 1 ? "place" : "places"} within 2 km
          </Text>
          {nearbyBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              title={branch.title}
              image={branch.image}
              rating={branch.rating}
              distance={branch.distance}
              hours={branch.hours}
              category={branch.category}
              discount={branch.discount}
              moreCount={branch.moreCount}
            />
          ))}
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
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

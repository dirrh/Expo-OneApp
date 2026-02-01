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
import DiscoverSideFilterPanel from "../components/discover/DiscoverSideFilterPanel";
import type { DiscoverMapMarker, DiscoverCategory } from "../lib/interfaces";

// Skeleton pre BranchCard - zobrazuje sa počas načítavania
function SkeletonBranchCard({ scale, cardPadding }: { scale: number; cardPadding: number }) {
  const imageSize = Math.round(80 * scale);
  const cardHeight = Math.round(112 * scale);
  const cardRadius = Math.round(14 * scale);
  const gap = Math.round(8 * scale);
  const metaHeight = Math.round(14 * scale);
  const badgeHeight = Math.round(19 * scale);

  return (
    <View style={[skeletonStyles.card, { height: cardHeight, padding: cardPadding, borderRadius: cardRadius }]}>
      {/* Skeleton obrázka */}
      <Skeleton width={imageSize} height={imageSize} borderRadius={Math.round(6 * scale)} />
      {/* Skeleton obsahu */}
      <View style={[skeletonStyles.content, { marginLeft: cardPadding, gap }]}>
        <Skeleton width="70%" height={Math.round(14 * scale)} borderRadius={4} />
        <View style={[skeletonStyles.metaRow, { gap }]}>
          <Skeleton width={Math.round(40 * scale)} height={metaHeight} borderRadius={4} />
          <Skeleton width={Math.round(50 * scale)} height={metaHeight} borderRadius={4} />
          <Skeleton width={Math.round(70 * scale)} height={metaHeight} borderRadius={4} />
        </View>
        <View style={[skeletonStyles.bottomRow, { marginTop: Math.round(4 * scale) }]}>
          <Skeleton width={Math.round(140 * scale)} height={badgeHeight} borderRadius={999} />
          <Skeleton width={Math.round(50 * scale)} height={metaHeight} borderRadius={4} />
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  offers?: string[];
  moreCount?: number;
}

// Fallback poloha - centrum Nitry
const NITRA_CENTER: [number, number] = [18.091, 48.3069];

const DEG_TO_RAD = Math.PI / 180;

// Možnosti triedenia
const SORT_OPTIONS = ["trending", "topRated", "openNearYou"] as const;
type SortOption = typeof SORT_OPTIONS[number];

// Filter options
const FILTER_OPTIONS: DiscoverCategory[] = ["Fitness", "Gastro", "Relax", "Beauty"];
const SUBCATEGORIES = ["Vegan", "Coffee", "Asian", "Pizza", "Sushi", "Fast Food", "Seafood", "Beer"];

export default function DiscoverListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const dataSource = useDataSource();

  // Stav pre sort dropdown
  const [sortOption, setSortOption] = useState<SortOption>("trending");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Stav pre bočný filter
  const [sideFilterOpen, setSideFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<Set<string>>(new Set());
  const [rating, setRating] = useState<Set<string>>(new Set());
  const [appliedRatings, setAppliedRatings] = useState<Set<string>>(new Set());
  const [sub, setSub] = useState<Set<string>>(new Set());

  const toggleSubcategory = useCallback((s: string) => {
    setSub((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  }, []);

  const scale = useMemo(() => Math.min(1, Math.max(0.82, screenWidth / 393)), [screenWidth]);
  const cardHeight = Math.round(112 * scale);
  const cardPadding = Math.round(16 * scale);
  const cardHeightWithMargin = cardHeight + 16;

  // Výpočet počtu skeleton kariet podľa výšky obrazovky
  const skeletonCount = useMemo(() => {
    const headerHeight = insets.top + 76;
    const availableHeight = screenHeight - headerHeight;
    return Math.ceil(availableHeight / cardHeightWithMargin);
  }, [screenHeight, insets.top, cardHeightWithMargin]);

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
  const allBranches = useMemo<NearbyBranch[]>(() => {
    if (!userLocation || markers.length === 0) return [];

    const [userLng, userLat] = userLocation;
    
    // Konštanty pre rýchly pred-filter
    const LAT_DEGREE_KM = 111; 
    // Longitude stupeň sa skracuje s kosínusom šírky
    const userLatRad = userLat * DEG_TO_RAD;

    const results: NearbyBranch[] = [];

    for (const marker of markers) {
      if (marker.category === "Multi") continue;

      const mCoord = marker.coord;
      
      // Vypočítame vzdialenosť pre každú pobočku (pre sorting aj display)
      const distanceKm = getDistanceKm(userLat, userLng, mCoord.lat, mCoord.lng);

      results.push({
        id: marker.id,
        title: marker.title || formatTitle(marker.id),
        image: CATEGORY_IMAGES[marker.category as DiscoverCategory] || CATEGORY_IMAGES.Fitness,
        rating: marker.rating,
        distance: `${distanceKm.toFixed(1)} km`,
        distanceKm,
        hours: "9:00 - 21:00",
        category: marker.category as DiscoverCategory,
        discount: t("offer_discount20"),
        offers: [t("offer_discount20"), t("offer_freeEntryFriend"), t("offer_discount10Monthly"), t("offer_firstMonthFree")],
        moreCount: 3,
      });
    }

    return results;
  }, [userLocation, markers, t]);

  const visibleBranches = useMemo<NearbyBranch[]>(() => {
    if (allBranches.length === 0) return [];

    // Najprv aplikujeme filtre
    let filtered = allBranches;

    // Filter podľa kategórie
    if (appliedFilters.size > 0) {
      filtered = filtered.filter((item) => appliedFilters.has(item.category));
    }

    // Filter podľa ratingu
    if (appliedRatings.size > 0) {
      const minRating = Math.min(...Array.from(appliedRatings).map(Number));
      filtered = filtered.filter((item) => item.rating >= minRating);
    }

    // Potom triedime
    switch (sortOption) {
      case "openNearYou": {
        const MAX_DIST_KM = 2;
        return filtered
          .filter((item) => item.distanceKm <= MAX_DIST_KM)
          .sort((a, b) => a.distanceKm - b.distanceKm);
      }
      case "topRated":
        return [...filtered].sort((a, b) => b.rating - a.rating);
      case "trending":
      default:
        return filtered;
    }
  }, [allBranches, sortOption, appliedFilters, appliedRatings]);

  // Definujeme presnú výšku položiek pre FlatList
  // To umožňuje preskočiť výpočet rozloženia a zlepšuje plynulosť skrolovania
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: cardHeightWithMargin,
      offset: cardHeightWithMargin * index,
      index,
    }),
    [cardHeightWithMargin]
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
        offers={item.offers}
        moreCount={item.moreCount}
      />
    ),
    []
  );

  // Key extractor pre FlatList
  const keyExtractor = useCallback((item: NearbyBranch) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Bočný filter panel */}
      <DiscoverSideFilterPanel
        visible={sideFilterOpen}
        onOpen={() => setSideFilterOpen(true)}
        onClose={() => setSideFilterOpen(false)}
        filterOptions={FILTER_OPTIONS}
        appliedFilters={appliedFilters}
        setAppliedFilters={setAppliedFilters}
        rating={rating}
        setRating={setRating}
        setAppliedRatings={setAppliedRatings}
        subcategories={SUBCATEGORIES}
        sub={sub}
        toggleSubcategory={toggleSubcategory}
      />

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
              {t("yourLocation")}
            </Text>
            <Image
              source={require("../images/options.png")}
              style={styles.caret}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Cancel button - návrat späť */}
        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>{t("cancel")}</Text>
        </TouchableOpacity>
      </View>

      {/* Sort dropdown */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={styles.sortDropdown}
          activeOpacity={0.85}
          onPress={() => setSortDropdownOpen(!sortDropdownOpen)}
        >
          <Text style={styles.sortText}>{t(sortOption)}</Text>
          <Image
            source={require("../images/arrow_b.png")}
            style={[styles.sortCaret, sortDropdownOpen && styles.sortCaretOpen]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {sortDropdownOpen && (
          <View style={styles.sortMenu}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.sortMenuItem,
                  sortOption === option && styles.sortMenuItemActive,
                ]}
                activeOpacity={0.85}
                onPress={() => {
                  setSortOption(option);
                  setSortDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.sortMenuText,
                    sortOption === option && styles.sortMenuTextActive,
                  ]}
                >
                  {t(option)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <SkeletonBranchCard key={index} scale={scale} cardPadding={cardPadding} />
          ))}
        </View>
      ) : visibleBranches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {sortOption === "openNearYou"
              ? t("noPlacesFoundWithin", { distance: "2 km" })
              : t("noPlacesFound")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleBranches}
          renderItem={renderBranchItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          // Nastavenia pre efektívne vykresľovanie zoznamu
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
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
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  row: {
    height: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowIcon: { width: 18, height: 18 },
  rowTextBold: { fontWeight: "600", fontSize: 14 },
  caret: { width: 14, height: 14, opacity: 0.5, marginLeft: 4 },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  sortContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 100,
  },
  sortDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sortText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
  },
  sortCaret: {
    width: 16,
    height: 16,
    opacity: 1,
  },
  sortCaretOpen: {
    transform: [{ rotate: "180deg" }],
  },
  sortMenu: {
    position: "absolute",
    top: 40,
    left: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    paddingVertical: 8,
    minWidth: 180,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }),
  },
  sortMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sortMenuItemActive: {
    backgroundColor: "#FFF5EB",
  },
  sortMenuText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  sortMenuTextActive: {
    color: "#EB8100",
    fontWeight: "600",
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
});

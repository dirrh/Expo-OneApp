import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Text,
  ImageSourcePropType,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import BranchCard from "../components/BranchCard";
import { Skeleton } from "../components/Skeleton";
import { useDataSource } from "../lib/data/useDataSource";
import { useDiscoverFilters } from "../lib/hooks";
import DiscoverSideFilterPanel from "../components/discover/DiscoverSideFilterPanel";
import { TAB_BAR_BASE_HEIGHT } from "../lib/constants/layout";
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

const CATEGORY_PREVIEW_IMAGES: Record<DiscoverCategory, ImageSourcePropType[]> = {
  Fitness: [
    require("../assets/gallery/fitness/fitness_1.jpg"),
    require("../assets/gallery/fitness/fitness_2.jpg"),
    require("../assets/gallery/fitness/fitness_3.jpg"),
    require("../assets/gallery/fitness/fitness_4.jpg"),
  ],
  Gastro: [
    require("../assets/gallery/gastro/gastro_1.jpg"),
    require("../assets/gallery/gastro/gastro_2.jpg"),
    require("../assets/gallery/gastro/gastro_3.jpg"),
    require("../assets/gallery/gastro/gastro_4.jpg"),
  ],
  Relax: [
    require("../assets/gallery/relax/relax_1.jpg"),
    require("../assets/gallery/relax/relax_2.jpg"),
    require("../assets/gallery/relax/relax_3.jpg"),
    require("../assets/gallery/relax/relax_4.jpg"),
  ],
  Beauty: [
    require("../assets/gallery/beauty/beauty_1.jpg"),
    require("../assets/gallery/beauty/beauty_2.jpg"),
    require("../assets/gallery/beauty/beauty_3.jpg"),
    require("../assets/gallery/beauty/beauty_4.jpg"),
  ],
};

const getStableHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getCategoryPreviewImage = (
  category: DiscoverCategory,
  markerId: string
): ImageSourcePropType => {
  const images = CATEGORY_PREVIEW_IMAGES[category];
  if (!images || images.length === 0) {
    return CATEGORY_PREVIEW_IMAGES.Fitness[0];
  }
  return images[getStableHash(markerId) % images.length];
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
  image: ImageSourcePropType;
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
const SORT_MENU_MIN_WIDTH = 180;
const SORT_MENU_HORIZONTAL_MARGIN = 16;
const SORT_MENU_OFFSET = 8;

export default function DiscoverListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const dataSource = useDataSource();
  const filters = useDiscoverFilters("Gastro");

  // Stav pre sort dropdown
  const [sortOption, setSortOption] = useState<SortOption>("trending");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [sortContainerLayout, setSortContainerLayout] = useState({ x: 0, y: 0 });
  const [sortTriggerLayout, setSortTriggerLayout] = useState({
    x: 0,
    y: 0,
    height: 0,
  });

  // Stav pre bočný filter
  const [sideFilterOpen, setSideFilterOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const shouldHideTabBar = sideFilterOpen;
      navigation.setOptions({
        tabBarStyle: { display: shouldHideTabBar ? "none" : "flex" },
      });
      return () => {
        navigation.setOptions({
          tabBarStyle: { display: "flex" },
        });
      };
    }, [navigation, sideFilterOpen])
  );

  useEffect(() => {
    if (!sideFilterOpen || !sortDropdownOpen) return;
    setSortDropdownOpen(false);
  }, [sideFilterOpen, sortDropdownOpen]);

  const scale = useMemo(() => Math.min(1, Math.max(0.82, screenWidth / 393)), [screenWidth]);
  const homeCategoriesTopSpacing = useMemo(
    () => Math.max(24, Math.round(42 * scale)),
    [scale]
  );
  const sortTopSpacing = useMemo(
    () => Math.max(0, homeCategoriesTopSpacing - 16),
    [homeCategoriesTopSpacing]
  );
  const sortMenuFallbackTop = useMemo(
    () => insets.top + 16 + 44 + 16 + sortTopSpacing + 30 + SORT_MENU_OFFSET,
    [insets.top, sortTopSpacing]
  );
  const sortMenuPosition = useMemo(() => {
    const maxLeft = Math.max(
      SORT_MENU_HORIZONTAL_MARGIN,
      screenWidth - SORT_MENU_HORIZONTAL_MARGIN - SORT_MENU_MIN_WIDTH
    );

    const measuredTop =
      sortContainerLayout.y + sortTriggerLayout.y + sortTriggerLayout.height + SORT_MENU_OFFSET;
    const measuredLeft = sortContainerLayout.x + sortTriggerLayout.x;
    const hasMeasuredTrigger = sortTriggerLayout.height > 0;

    return {
      top: hasMeasuredTrigger ? Math.max(0, measuredTop) : sortMenuFallbackTop,
      left: hasMeasuredTrigger
        ? Math.max(SORT_MENU_HORIZONTAL_MARGIN, Math.min(measuredLeft, maxLeft))
        : SORT_MENU_HORIZONTAL_MARGIN,
    };
  }, [
    screenWidth,
    sortContainerLayout.x,
    sortContainerLayout.y,
    sortTriggerLayout.x,
    sortTriggerLayout.y,
    sortTriggerLayout.height,
    sortMenuFallbackTop,
  ]);
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
        image: getCategoryPreviewImage(marker.category as DiscoverCategory, marker.id),
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
    if (filters.appliedFilters.size > 0) {
      filtered = filtered.filter((item) => filters.appliedFilters.has(item.category));
    }

    // Filter podľa ratingu
    const ratingThreshold = filters.ratingThreshold;
    if (ratingThreshold !== null) {
      filtered = filtered.filter((item) => item.rating >= ratingThreshold);
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
  }, [allBranches, sortOption, filters.appliedFilters, filters.ratingThreshold]);

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
        badgeRowOffset={-4}
        noElevation
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
        appliedFilters={filters.appliedFilters}
        setAppliedFilters={filters.setAppliedFilters}
        rating={filters.ratingFilter}
        setRating={filters.setRatingFilter}
        setAppliedRatings={filters.setAppliedRatings}
        subcategories={SUBCATEGORIES}
        sub={filters.sub}
        toggleSubcategory={filters.toggleSubcategory}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.card} activeOpacity={0.85}>
          <Ionicons name="location-outline" size={18} color="#000" />
            <Text style={styles.rowTextBold} numberOfLines={1}>
              {t("yourLocation")}
            </Text>
          <Ionicons name="chevron-down-outline" size={16} color="#000" style={styles.caret} />
          </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.85} onPress={() => {}}>
            <Ionicons name="search-outline" size={18} color="#000" />
          </TouchableOpacity>
        <TouchableOpacity
            style={styles.headerIconButton}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
            <Ionicons name="map-outline" size={18} color="#000" />
        </TouchableOpacity>
        </View>
      </View>

      {/* Sort dropdown */}
      <View
        style={[styles.sortContainer, { paddingTop: sortTopSpacing }]}
        onLayout={(event) => {
          const { x, y } = event.nativeEvent.layout;
          setSortContainerLayout((prev) => {
            if (prev.x === x && prev.y === y) return prev;
            return { x, y };
          });
        }}
      >
        <View
          onLayout={(event) => {
            const { x, y, height } = event.nativeEvent.layout;
            setSortTriggerLayout((prev) => {
              if (prev.x === x && prev.y === y && prev.height === height) return prev;
              return { x, y, height };
            });
          }}
        >
          <TouchableOpacity
            style={styles.sortDropdown}
            activeOpacity={0.85}
            onPress={() => setSortDropdownOpen((prev) => !prev)}
          >
            <Text style={styles.sortText}>{t(sortOption)}</Text>
            <Ionicons
              name="chevron-down-outline"
              size={16}
              color="#000"
              style={[styles.sortCaret, sortDropdownOpen && styles.sortCaretOpen]}
            />
          </TouchableOpacity>
        </View>
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
            { paddingBottom: insets.bottom + TAB_BAR_BASE_HEIGHT + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          // Nastavenia pre efektívne vykresľovanie zoznamu
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          removeClippedSubviews={false}
        />
      )}

      {sortDropdownOpen ? (
        <View style={styles.sortOverlay} pointerEvents="box-none">
          <Pressable
            style={styles.sortOverlayBackdrop}
            onPress={() => setSortDropdownOpen(false)}
          />
          <View
            style={[
              styles.sortMenu,
              styles.sortMenuPortal,
              {
                top: sortMenuPosition.top,
                left: sortMenuPosition.left,
                maxWidth: screenWidth - SORT_MENU_HORIZONTAL_MARGIN * 2,
              },
            ]}
          >
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
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    position: "relative",
    zIndex: 30,
    elevation: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  card: {
    width: 184,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  rowTextBold: {
    flex: 1,
    fontWeight: "600",
    fontSize: 14,
    color: "#000",
  },
  caret: { opacity: 0.7 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sortContainer: {
    position: "relative",
    overflow: "visible",
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 200,
    elevation: 0,
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
    zIndex: 5001,
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
          elevation: 5001,
        }),
  },
  sortMenuPortal: {
    position: "absolute",
  },
  sortOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
    elevation: 5000,
  },
  sortOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
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
    zIndex: 1,
    elevation: 1,
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

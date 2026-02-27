/**
 * DiscoverListScreen: List režim Discover zobrazuje filtrované prevádzky v zozname s radením podľa vybraného kritéria.
 *
 * Prečo: Alternatíva k mape umožní rýchle porovnanie prevádzok v textovo-kartovom rozložení.
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Text,
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
import { useDiscoverData, useDiscoverFilters } from "../lib/hooks";
import {
  buildDiscoverListItems,
  filterDiscoverListItems,
  sortDiscoverListItems,
  type DiscoverListItem,
  type DiscoverListSortOption,
} from "../lib/data/selectors";
import DiscoverSideFilterPanel from "../components/discover/DiscoverSideFilterPanel";
import DiscoverSearchSheet from "../components/discover/DiscoverSearchSheet";
import { TAB_BAR_BASE_HEIGHT } from "../lib/constants/layout";
import {
  buildDiscoverBranchSearchIndex,
  filterDiscoverBranchSearchIndex,
} from "../lib/discover/discoverSearchUtils";
import {
  DISCOVER_FILTER_OPTIONS,
  DISCOVER_SUBCATEGORIES,
  NITRA_CENTER,
} from "../lib/constants/discoverUi";
import type { BranchData } from "../lib/interfaces";

function SkeletonBranchCard({ scale, cardPadding }: { scale: number; cardPadding: number }) {
  const imageSize = Math.round(80 * scale);
  const cardHeight = Math.round(112 * scale);
  const cardRadius = Math.round(14 * scale);
  const gap = Math.round(8 * scale);
  const metaHeight = Math.round(14 * scale);
  const badgeHeight = Math.round(19 * scale);

  return (
    <View style={[skeletonStyles.card, { height: cardHeight, padding: cardPadding, borderRadius: cardRadius }]}> 
      <Skeleton width={imageSize} height={imageSize} borderRadius={Math.round(6 * scale)} />
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

const SORT_OPTIONS: DiscoverListSortOption[] = ["trending", "topRated", "openNearYou"];
const SORT_MENU_MIN_WIDTH = 180;
const SORT_MENU_HORIZONTAL_MARGIN = 16;
const SORT_MENU_OFFSET = 8;
const LIST_SORT_TOP_SHIFT = 16;

export default function DiscoverListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const filters = useDiscoverFilters("Gastro");
  const { markers, loading, error, buildBranchFromMarker } = useDiscoverData({
    t,
    includeBranches: false,
    includeGroupedMarkers: false,
  });

  const [sortOption, setSortOption] = useState<DiscoverListSortOption>("openNearYou");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [sortContainerLayout, setSortContainerLayout] = useState({ x: 0, y: 0 });
  const [sortTriggerLayout, setSortTriggerLayout] = useState({
    x: 0,
    y: 0,
    height: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [searchSheetIndex, setSearchSheetIndex] = useState(-1);
  const [searchSortOption, setSearchSortOption] = useState<DiscoverListSortOption>("openNearYou");
  const [sideFilterOpen, setSideFilterOpen] = useState(false);
  const isSearchOpen = searchSheetIndex !== -1;

  useFocusEffect(
    useCallback(() => {
      const shouldHideTabBar = sideFilterOpen || isSearchOpen;
      navigation.setOptions({
        tabBarStyle: { display: shouldHideTabBar ? "none" : "flex" },
      });
      return () => {
        navigation.setOptions({
          tabBarStyle: { display: "flex" },
        });
      };
    }, [navigation, sideFilterOpen, isSearchOpen])
  );

  useEffect(() => {
    if ((!sideFilterOpen && !isSearchOpen) || !sortDropdownOpen) {
      return;
    }
    setSortDropdownOpen(false);
  }, [isSearchOpen, sideFilterOpen, sortDropdownOpen]);

  const scale = useMemo(() => Math.min(1, Math.max(0.82, screenWidth / 393)), [screenWidth]);
  const homeCategoriesTopSpacing = useMemo(
    () => Math.max(24, Math.round(42 * scale)),
    [scale]
  );
  const sortTopSpacing = useMemo(
    () => Math.max(0, homeCategoriesTopSpacing - 16 - LIST_SORT_TOP_SHIFT),
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

  const skeletonCount = useMemo(() => {
    const headerHeight = insets.top + 76;
    const availableHeight = screenHeight - headerHeight;
    return Math.ceil(availableHeight / cardHeightWithMargin);
  }, [screenHeight, insets.top, cardHeightWithMargin]);

  const userLocation: [number, number] = route.params?.userCoord ?? NITRA_CENTER;
  const allBranches = useMemo(
    () =>
      buildDiscoverListItems({
        markers,
        userLocation,
        buildBranchFromMarker,
    }),
    [buildBranchFromMarker, markers, userLocation]
  );

  const baseFilteredBranches = useMemo<DiscoverListItem[]>(() => {
    if (allBranches.length === 0) {
      return [];
    }

    return filterDiscoverListItems({
      items: allBranches,
      appliedCategories: filters.appliedFilters,
      ratingThreshold: filters.ratingThreshold,
    });
  }, [allBranches, filters.appliedFilters, filters.ratingThreshold]);

  const visibleBranches = useMemo<DiscoverListItem[]>(() => {
    if (baseFilteredBranches.length === 0) {
      return [];
    }

    return sortDiscoverListItems(baseFilteredBranches, sortOption);
  }, [baseFilteredBranches, sortOption]);
  const searchBranchIndex = useMemo(
    () => buildDiscoverBranchSearchIndex(baseFilteredBranches),
    [baseFilteredBranches]
  );
  const searchBranchById = useMemo(() => {
    const map = new Map<string, DiscoverListItem>();
    baseFilteredBranches.forEach((branch) => {
      const key = branch.id ?? branch.title;
      map.set(key, branch);
    });
    return map;
  }, [baseFilteredBranches]);
  const searchResultTabs = useMemo(
    () => [
      { key: "trending", label: t("discoverSearchTabTrending") },
      { key: "topRated", label: t("discoverSearchTabTopRated") },
      { key: "openNearYou", label: t("discoverSearchTabNearby") },
    ],
    [t]
  );
  const searchBranches = useMemo(() => {
    const matched = filterDiscoverBranchSearchIndex(searchBranchIndex, searchText);
    const resolved = matched
      .map((branch) => searchBranchById.get(branch.id ?? branch.title))
      .filter((item): item is DiscoverListItem => Boolean(item));

    return sortDiscoverListItems(resolved, searchSortOption);
  }, [searchBranchById, searchBranchIndex, searchSortOption, searchText]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: cardHeightWithMargin,
      offset: cardHeightWithMargin * index,
      index,
    }),
    [cardHeightWithMargin]
  );

  const renderBranchItem = useCallback(
    ({ item }: { item: DiscoverListItem }) => (
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

  const keyExtractor = useCallback(
    (item: DiscoverListItem) => item.id ?? item.title,
    []
  );

  const handleBackToMap = useCallback(() => {
    navigation.navigate("Discover");
  }, [navigation]);
  const handleSearchSheetChange = useCallback((index: number) => {
    setSearchSheetIndex(index);
  }, []);
  const handleChangeSearchResultTab = useCallback((key: string) => {
    if (key === "trending" || key === "topRated" || key === "openNearYou") {
      setSearchSortOption(key);
    }
  }, []);
  const handleOpenSearch = useCallback(() => {
    setSearchSortOption(sortOption);
    setSearchSheetIndex(0);
  }, [sortOption]);
  const handleCloseSearch = useCallback(() => {
    setSearchSheetIndex(-1);
    setSearchText("");
  }, []);
  const handleSelectSearchBranch = useCallback((branch: BranchData) => {
    handleCloseSearch();
    navigation.navigate("BusinessDetailScreen", { branch });
  }, [handleCloseSearch, navigation]);
  const handleSelectFavorite = useCallback(() => {
    // DiscoverSearchSheet vyžaduje callback, v list view favorites nepoužívame.
  }, []);

  return (
    <View style={styles.container}>
      <DiscoverSideFilterPanel
        visible={sideFilterOpen}
        onOpen={() => setSideFilterOpen(true)}
        onClose={() => setSideFilterOpen(false)}
        filterOptions={DISCOVER_FILTER_OPTIONS}
        appliedFilters={filters.appliedFilters}
        setAppliedFilters={filters.setAppliedFilters}
        rating={filters.ratingFilter}
        setRating={filters.setRatingFilter}
        setAppliedRatings={filters.setAppliedRatings}
        subcategories={DISCOVER_SUBCATEGORIES}
        sub={filters.sub}
        toggleSubcategory={filters.toggleSubcategory}
      />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.card} activeOpacity={0.85}>
          <Ionicons name="location-outline" size={18} color="#000" />
          <Text style={styles.rowTextBold} numberOfLines={1}>
            {t("yourLocation")}
          </Text>
          <Ionicons name="chevron-down-outline" size={16} color="#000" style={styles.caret} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.85}
            onPress={handleOpenSearch}
          >
            <Ionicons name="search-outline" size={18} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            activeOpacity={0.85}
            onPress={handleBackToMap}
          >
            <Ionicons name="map-outline" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[styles.sortContainer, { paddingTop: sortTopSpacing }]}
        onLayout={(event) => {
          const { x, y } = event.nativeEvent.layout;
          setSortContainerLayout((prev) => {
            if (prev.x === x && prev.y === y) {
              return prev;
            }
            return { x, y };
          });
        }}
      >
        <View
          onLayout={(event) => {
            const { x, y, height } = event.nativeEvent.layout;
            setSortTriggerLayout((prev) => {
              if (prev.x === x && prev.y === y && prev.height === height) {
                return prev;
              }
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
            {error ? t("dataLoadFailed") : t("noPlacesFound")}
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
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          removeClippedSubviews={false}
        />
      )}

      <DiscoverSearchSheet
        onSheetChange={handleSearchSheetChange}
        onClose={handleCloseSearch}
        sheetIndex={searchSheetIndex}
        text={searchText}
        setText={setSearchText}
        filtered={searchBranches}
        onSelectBranch={handleSelectSearchBranch}
        favoritePlaces={[]}
        onSelectFavorite={handleSelectFavorite}
        autoFocus
        showFavorites={false}
        resultTabs={searchResultTabs}
        activeResultTabKey={searchSortOption}
        onChangeResultTab={handleChangeSearchResultTab}
        t={t}
      />

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

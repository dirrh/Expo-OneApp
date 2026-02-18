// HomeScreen: obrazovka hlavneho flow aplikacie.
// Zodpovednost: renderuje UI, obsluhuje udalosti a lokalny stav obrazovky.
// Vstup/Vystup: pracuje s navigation params, hookmi a volaniami akcii.

import React, { useCallback, useEffect, useMemo } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useDiscoverData, useHomeSearch } from "../lib/hooks";
import { appendDerivedBranchesFromMarkers } from "../lib/data/mappers";
import { TAB_BAR_BASE_HEIGHT } from "../lib/constants/layout";
import type { BranchData } from "../lib/interfaces";
import { getCategoryPreviewImages } from "../lib/data/assets/categoryAssets";
import HomeSearchOverlay from "../components/home/HomeSearchOverlay";
import HomeBranchGridCard from "../components/home/HomeBranchGridCard";
import type { HomeSearchResult } from "../lib/search/homeSearchTypes";
import { AppConfig } from "../lib/config/AppConfig";
import {
  HOME_CATEGORY_CHIPS,
  normalizeHomeCategory,
} from "../lib/home/homeCategoryConfig";
import type { HomeCategoryFilter } from "../lib/home/homeCategoryConfig";
import type { ShowMoreSection } from "../lib/home/showMoreUtils";

const getBranchKey = (branch: BranchData): string =>
  String(branch.id ?? branch.title).trim().toLowerCase();

const getStableHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const layoutScale = useMemo(
    () => Math.min(1.08, Math.max(0.86, screenWidth / 393)),
    [screenWidth]
  );
  const horizontalPadding = useMemo(
    () => Math.max(12, Math.round(16 * layoutScale)),
    [layoutScale]
  );
  const headerControlsGap = useMemo(
    () => Math.max(10, Math.round(13 * layoutScale)),
    [layoutScale]
  );
  const headerTopOffset = useMemo(
    () => 16,
    []
  );
  const categoriesVerticalSpacing = useMemo(
    () => Math.max(12, Math.round(18 * layoutScale)),
    [layoutScale]
  );
  const categoriesChipGap = useMemo(
    () => Math.max(8, Math.round(10 * layoutScale)),
    [layoutScale]
  );
  const locationChipWidth = useMemo(
    () =>
      Math.min(
        184,
        Math.max(160, screenWidth - horizontalPadding * 2 - 42 - headerControlsGap)
      ),
    [headerControlsGap, horizontalPadding, screenWidth]
  );
  const [selectedCategory, setSelectedCategory] = React.useState<HomeCategoryFilter>("All");
  const [isSearchOverlayVisible, setIsSearchOverlayVisible] = React.useState(false);
  const { branches, markers, buildBranchFromMarker } = useDiscoverData({ t });
  const homeBranchesSource = useMemo(
    () => appendDerivedBranchesFromMarkers(branches, markers, buildBranchFromMarker),
    [branches, markers, buildBranchFromMarker]
  );

  const homeBranches = useMemo(
    () =>
      homeBranchesSource.map((branch) => {
        const normalizedCategory = normalizeHomeCategory(branch.category);
        if (!normalizedCategory || normalizedCategory === "All") {
          return branch;
        }

        const categoryImages = getCategoryPreviewImages(normalizedCategory);
        if (!categoryImages || categoryImages.length === 0) {
          return branch;
        }

        const hashKey = getBranchKey(branch);
        const previewImage = categoryImages[getStableHash(hashKey) % categoryImages.length];

        return {
          ...branch,
          image: previewImage,
          images:
            branch.images && branch.images.length > 0
              ? branch.images
              : [...categoryImages],
        };
      }),
    [homeBranchesSource]
  );

  const filteredBranches = useMemo(() => {
    if (selectedCategory === "All") {
      return homeBranches;
    }

    return homeBranches.filter(
      (branch) => normalizeHomeCategory(branch.category) === selectedCategory
    );
  }, [homeBranches, selectedCategory]);

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    scope: searchScope,
    setScope: setSearchScope,
    scopeOptions: searchScopeOptions,
    history: searchHistory,
    clearHistory: clearSearchHistory,
    applySuggestionQuery,
    rememberQuery,
    results: searchResults,
    isSearchActive,
    popularQueries,
    resetSearch,
  } = useHomeSearch({
    branches: homeBranches,
    selectedCategory,
    isVisible: isSearchOverlayVisible,
    localeKey: i18n.language,
    enabled: AppConfig.homeSearchV2Enabled,
  });

  const openNearYou = useMemo(() => filteredBranches.slice(0, 6), [filteredBranches]);
  const trending = useMemo(() => filteredBranches.slice(0, 6), [filteredBranches]);
  const topRated = useMemo(
    () => [...filteredBranches].sort((a, b) => b.rating - a.rating).slice(0, 6),
    [filteredBranches]
  );

  const cardGap = useMemo(
    () => Math.min(27, Math.max(16, Math.round(27 * layoutScale))),
    [layoutScale]
  );
  const cardWidth = useMemo(
    () => Math.min(220, Math.max(186, Math.round(207 * layoutScale))),
    [layoutScale]
  );

  const renderService = useCallback(
    ({ item }: { item: BranchData }) => {
      return <HomeBranchGridCard branch={item} cardWidth={cardWidth} />;
    },
    [cardWidth]
  );

  const keyExtractor = useCallback(
    (item: BranchData, index: number) => item.id ?? `${item.title}-${index}`,
    []
  );

  const sectionList = useMemo(
    (): Array<{ key: ShowMoreSection; title: string; data: BranchData[] }> => [
      { key: "openNearYou", title: t("openNearYou"), data: openNearYou },
      { key: "trending", title: t("trending"), data: trending },
      { key: "topRated", title: t("topRated"), data: topRated },
    ],
    [openNearYou, trending, topRated, t]
  );

  const sectionKeyExtractor = useCallback((item: { key: ShowMoreSection }) => item.key, []);
  const sectionSeparator = useCallback(() => <View style={{ height: 0 }} />, []);
  const topRowStyle = useMemo(
    () => [styles.topRow, { paddingHorizontal: horizontalPadding, gap: headerControlsGap }],
    [headerControlsGap, horizontalPadding]
  );
  const categoriesScrollStyle = useMemo(
    () => [styles.categoriesScroll, { paddingHorizontal: horizontalPadding, gap: categoriesChipGap }],
    [categoriesChipGap, horizontalPadding]
  );
  const sectionContainerStyle = useMemo(
    () => styles.section,
    []
  );
  const sectionHeaderStyle = useMemo(
    () => [styles.sectionHeader, { paddingHorizontal: horizontalPadding }],
    [horizontalPadding]
  );
  const servicesRowStyle = useMemo(
    () => [styles.servicesRow, { paddingLeft: horizontalPadding }],
    [horizontalPadding]
  );

  useEffect(() => {
    if (!AppConfig.homeSearchV2Enabled) {
      return;
    }

    navigation.setOptions({
      tabBarStyle: { display: isSearchOverlayVisible ? "none" : "flex" },
    });

    return () => {
      navigation.setOptions({
        tabBarStyle: { display: "flex" },
      });
    };
  }, [isSearchOverlayVisible, navigation]);

  const handleOpenSearch = useCallback(() => {
    if (!AppConfig.homeSearchV2Enabled) {
      return;
    }
    setIsSearchOverlayVisible(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOverlayVisible(false);
    resetSearch();
  }, [resetSearch]);

  const handleApplySuggestion = useCallback(
    (value: string) => {
      applySuggestionQuery(value);
    },
    [applySuggestionQuery]
  );

  const handleSelectSearchResult = useCallback(
    (result: HomeSearchResult) => {
      const normalizedQuery = searchQuery.trim();
      if (normalizedQuery.length > 0) {
        rememberQuery(normalizedQuery);
      }

      setIsSearchOverlayVisible(false);
      resetSearch();
      navigation.navigate("BusinessDetailScreen", { branch: result.branch });
    },
    [navigation, rememberQuery, resetSearch, searchQuery]
  );

  const listHeader = useMemo(
    () => (
      <>
        <View style={topRowStyle}>
          <TouchableOpacity
            style={[
              styles.locationChip,
              {
                width: locationChipWidth,
              },
            ]}
            activeOpacity={0.9}
          >
            <Ionicons name="location-outline" size={18} color="#000" />
            <Text style={styles.locationText}>{t("yourLocation")}</Text>
            <Ionicons name="chevron-down-outline" size={16} color="#000" style={{ opacity: 0.7 }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchButton}
            activeOpacity={0.9}
            onPress={handleOpenSearch}
            accessibilityLabel={t("homeSearchOpenA11y")}
          >
            <Ionicons name="search-outline" size={20} color="#000" />
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.categoriesWrap,
              {
                marginTop: categoriesVerticalSpacing,
                marginBottom: categoriesVerticalSpacing,
              },
            ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={categoriesScrollStyle}
          >
            {HOME_CATEGORY_CHIPS.map((chip) => {
              const isActive = selectedCategory === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  activeOpacity={0.85}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(chip.key)}
                >
                  {chip.iconName ? (
                    <Ionicons
                      name={chip.iconName}
                      size={14}
                      color={isActive ? "#FFFFFF" : "#18181B"}
                    />
                  ) : null}
                  <Text style={[styles.categoryChipLabel, isActive && styles.categoryChipLabelActive]}>
                    {t(chip.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </>
    ),
    [
      categoriesVerticalSpacing,
      categoriesScrollStyle,
      handleOpenSearch,
      locationChipWidth,
      selectedCategory,
      topRowStyle,
      t,
    ]
  );

  const sectionItemSeparator = useCallback(
    () => <View style={{ width: cardGap }} />,
    [cardGap]
  );

  const handleShowMore = useCallback(
    (sectionKey: ShowMoreSection, sectionTitle: string) => {
      navigation.navigate("ShowMore", {
        section: sectionKey,
        title: sectionTitle,
        initialCategory: selectedCategory,
      });
    },
    [navigation, selectedCategory]
  );

  const renderSection = useCallback(
    ({ item }: { item: { key: ShowMoreSection; title: string; data: BranchData[] } }) => (
      <View style={sectionContainerStyle}>
        <View style={sectionHeaderStyle}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          <TouchableOpacity 
            onPress={() => handleShowMore(item.key, item.title)}
            activeOpacity={0.7}
          >
          <Text style={styles.sectionMore}>{t("showMore")}</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={item.data}
          renderItem={renderService}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={servicesRowStyle}
          ItemSeparatorComponent={sectionItemSeparator}
          snapToInterval={cardWidth + cardGap}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: cardWidth + cardGap,
            offset: index * (cardWidth + cardGap),
            index,
          })}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={3}
          removeClippedSubviews
        />
      </View>
    ),
    [
      cardGap,
      cardWidth,
      handleShowMore,
      keyExtractor,
      renderService,
      servicesRowStyle,
      sectionHeaderStyle,
      sectionContainerStyle,
      sectionItemSeparator,
      t,
    ]
  );

  const contentStyle = useMemo(
    () => [
      styles.containerContent,
      {
        paddingTop: insets.top + headerTopOffset,
        paddingBottom: insets.bottom + TAB_BAR_BASE_HEIGHT + 24,
      },
    ],
    [headerTopOffset, insets.bottom, insets.top]
  );

  return (
    <View style={styles.screenRoot}>
      <FlatList
        data={sectionList}
        keyExtractor={sectionKeyExtractor}
        renderItem={renderSection}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={sectionSeparator}
        style={styles.container}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        removeClippedSubviews={Platform.OS !== "web"}
      />

      <HomeSearchOverlay
        visible={isSearchOverlayVisible}
        query={searchQuery}
        setQuery={setSearchQuery}
        scope={searchScope}
        setScope={setSearchScope}
        scopeOptions={searchScopeOptions}
        history={searchHistory}
        onClearHistory={clearSearchHistory}
        popularQueries={popularQueries}
        onApplySuggestion={handleApplySuggestion}
        results={searchResults}
        isSearchActive={isSearchActive}
        onClose={handleCloseSearch}
        onSelectResult={handleSelectSearchResult}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  containerContent: {
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 0,
    gap: 13,
  },
  categoriesWrap: {
    height: 42,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryChip: {
    height: 42,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: "#EB8100",
    borderColor: "#EB8100",
  },
  categoryChipLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
    color: "#18181B",
  },
  categoryChipLabelActive: {
    color: "#FFFFFF",
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    height: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  locationText: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 4,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  searchButton: {
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
    elevation: 3,
  },
  section: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 16,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  sectionMore: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C7C7C",
  },
  servicesRow: {
    paddingRight: 0,
  },
});


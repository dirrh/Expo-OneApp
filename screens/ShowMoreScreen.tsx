// ShowMoreScreen: detailny list sekcie z Home ("Zobrazit viac").
// Zodpovednost: legacy fallback + ShowMore V2 (sticky filtre a grid layout).
// Vstup/Vystup: route params sekcie + optional inicialna kategoria z Home.

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import BranchCard from "../components/BranchCard";
import HomeBranchGridCard from "../components/home/HomeBranchGridCard";
import { useDiscoverData } from "../lib/hooks";
import type { BranchData } from "../lib/interfaces";
import { AppConfig } from "../lib/config/AppConfig";
import { HOME_CATEGORY_CHIPS } from "../lib/home/homeCategoryConfig";
import type { HomeCategoryFilter } from "../lib/home/homeCategoryConfig";
import {
  filterShowMoreByCategory,
  getShowMoreSectionBranches,
  resolveInitialShowMoreCategory,
} from "../lib/home/showMoreUtils";
import type { ShowMoreSection } from "../lib/home/showMoreUtils";

interface ShowMoreRouteParams {
  section?: ShowMoreSection;
  title?: string;
  initialCategory?: HomeCategoryFilter | string;
}

type ShowMoreRoute = RouteProp<Record<"ShowMore", ShowMoreRouteParams>, "ShowMore">;

export default function ShowMoreScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<ShowMoreRoute>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const sectionType: ShowMoreSection = route.params?.section ?? "openNearYou";
  const sectionTitle: string = route.params?.title ?? t("openNearYou");
  const initialCategory = useMemo(
    () => resolveInitialShowMoreCategory(route.params?.initialCategory),
    [route.params?.initialCategory]
  );
  const [selectedCategory, setSelectedCategory] = useState<HomeCategoryFilter>(initialCategory);

  const { branches } = useDiscoverData({ t });

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const sectionBranches = useMemo(
    () => getShowMoreSectionBranches(branches, sectionType),
    [branches, sectionType]
  );

  const filteredBranches = useMemo(
    () => filterShowMoreByCategory(sectionBranches, selectedCategory),
    [sectionBranches, selectedCategory]
  );

  const layoutScale = useMemo(
    () => Math.min(1.08, Math.max(0.86, screenWidth / 393)),
    [screenWidth]
  );
  const horizontalPadding = useMemo(
    () => Math.max(12, Math.round(16 * layoutScale)),
    [layoutScale]
  );
  const headerTopOffset = useMemo(() => 16, []);
  const categoriesVerticalSpacing = useMemo(
    () => Math.max(12, Math.round(18 * layoutScale)),
    [layoutScale]
  );
  const categoriesChipGap = useMemo(
    () => Math.max(8, Math.round(10 * layoutScale)),
    [layoutScale]
  );
  const gridSpec = useMemo(() => {
    const availableWidth = screenWidth - horizontalPadding * 2;
    const columnGap = Math.max(10, Math.round(12 * layoutScale));
    const minCardWidth = 158;
    const baseColumns = screenWidth >= 768 ? 3 : 2;

    const widthForColumns = (columns: number) =>
      Math.floor((availableWidth - columnGap * (columns - 1)) / columns);

    let numColumns = baseColumns;
    let cardWidth = widthForColumns(numColumns);

    while (numColumns > 1 && cardWidth < minCardWidth) {
      numColumns -= 1;
      cardWidth = widthForColumns(numColumns);
    }

    return {
      numColumns,
      columnGap,
      cardWidth: Math.max(140, cardWidth),
    };
  }, [horizontalPadding, layoutScale, screenWidth]);

  const keyExtractor = useCallback(
    (item: BranchData, index: number) => item.id ?? `${item.title}-${index}`,
    []
  );

  const emptyState = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="location-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>{t("noPlacesFound")}</Text>
      </View>
    ),
    [t]
  );

  const renderLegacyItem = useCallback(
    ({ item }: { item: BranchData }) => (
      <View style={styles.legacyCardContainer}>
        <BranchCard {...item} badgeRowOffset={-4} />
      </View>
    ),
    []
  );

  if (!AppConfig.showMoreV2Enabled) {
    return (
      <View style={styles.legacyContainer}>
        <FlatList
          data={sectionBranches}
          renderItem={renderLegacyItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={
            <View style={[styles.legacyHeader, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity
                style={styles.legacyBackButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#111" />
              </TouchableOpacity>
              <Text style={styles.legacyHeaderTitle}>{sectionTitle}</Text>
              <View style={styles.legacyHeaderRight} />
            </View>
          }
          ListEmptyComponent={emptyState}
          contentContainerStyle={[
            styles.legacyListContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== "web"}
        />
      </View>
    );
  }

  const renderGridItem = useCallback(
    ({ item }: { item: BranchData }) => (
      <View
        style={[
          styles.gridItem,
          { width: gridSpec.cardWidth },
          gridSpec.numColumns === 1 ? { marginBottom: gridSpec.columnGap } : null,
        ]}
      >
        <HomeBranchGridCard
          branch={item}
          cardWidth={gridSpec.cardWidth}
          compact={gridSpec.numColumns > 1}
        />
      </View>
    ),
    [gridSpec.cardWidth, gridSpec.columnGap, gridSpec.numColumns]
  );

  const stickyFilterHeader = (
    <View
      style={[
        styles.filtersSticky,
        {
          paddingTop: categoriesVerticalSpacing,
          paddingBottom: categoriesVerticalSpacing,
        },
      ]}
    >
      <View style={styles.categoriesWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoriesScroll, { gap: categoriesChipGap }]}
        >
          {HOME_CATEGORY_CHIPS.map((chip) => {
            const isActive = selectedCategory === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                activeOpacity={0.85}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(chip.key)}
                accessibilityLabel={`${t("homeSearchScopeA11y")} ${t(chip.labelKey)}`}
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
    </View>
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + headerTopOffset,
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          accessibilityLabel={t("homeSearchBackA11y")}
        >
          <Ionicons name="chevron-back" size={18} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{sectionTitle}</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        key={`show-more-grid-${gridSpec.numColumns}`}
        data={filteredBranches}
        renderItem={renderGridItem}
        keyExtractor={keyExtractor}
        numColumns={gridSpec.numColumns}
        ListHeaderComponent={stickyFilterHeader}
        stickyHeaderIndices={[0]}
        ListEmptyComponent={emptyState}
        columnWrapperStyle={
          gridSpec.numColumns > 1
            ? { columnGap: gridSpec.columnGap, marginBottom: gridSpec.columnGap }
            : undefined
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== "web"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  legacyContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  legacyListContent: {
    paddingHorizontal: 16,
  },
  legacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 20,
    paddingTop: 8,
  },
  legacyBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  legacyHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  legacyHeaderRight: {
    width: 40,
  },
  legacyCardContainer: {
    marginBottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  backButton: {
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
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  headerRight: {
    width: 42,
  },
  listContent: {
    flexGrow: 1,
  },
  filtersSticky: {
    backgroundColor: "#FAFAFA",
    zIndex: 2,
  },
  categoriesWrap: {
    height: 42,
  },
  categoriesScroll: {
    alignItems: "center",
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
  gridItem: {
    minWidth: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 72,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#7C7C7C",
    textAlign: "center",
  },
});

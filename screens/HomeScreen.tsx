import React, { memo, useCallback, useMemo } from "react";
import {
  FlatList,
  Image,
  ImageSourcePropType,
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
import { useDiscoverData } from "../lib/hooks";
import { TAB_BAR_BASE_HEIGHT } from "../lib/constants/layout";
import type { BranchData, DiscoverCategory } from "../lib/interfaces";

type HomeCategoryFilter = "All" | DiscoverCategory;

const HOME_CATEGORY_CHIPS: Array<{
  key: HomeCategoryFilter;
  iconName?: keyof typeof Ionicons.glyphMap;
  labelKey: string;
}> = [
  { key: "All", labelKey: "showAll" },
  { key: "Fitness", iconName: "barbell-outline", labelKey: "Fitness" },
  { key: "Gastro", iconName: "restaurant-outline", labelKey: "Gastro" },
  { key: "Beauty", iconName: "sparkles-outline", labelKey: "Beauty" },
  { key: "Relax", iconName: "leaf-outline", labelKey: "Relax" },
];

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

const normalizeCategory = (value?: string): HomeCategoryFilter | null => {
  if (!value) return null;

  const key = value.trim().toLowerCase();
  if (key === "fitness" || key === "fitnes") return "Fitness";
  if (key === "gastro" || key === "food" || key === "jedlo") return "Gastro";
  if (key === "beauty" || key === "krasa" || key === "kozmetika") return "Beauty";
  if (key === "relax" || key === "wellness") return "Relax";
  if (key === "all") return "All";
  return null;
};

const getBranchKey = (branch: BranchData): string =>
  String(branch.id ?? branch.title).trim().toLowerCase();

const getStableHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const ServiceCard = memo(
  ({
    item,
    cardWidth,
  }: {
    item: BranchData;
    cardWidth: number;
  }) => {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("BusinessDetailScreen", { branch: item })}
      style={[styles.serviceCard, { width: cardWidth }]}
    >
      <Image source={item.image} style={[styles.serviceImage, { width: cardWidth }]} />
      <Text style={styles.serviceTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <View style={styles.serviceMetaRow}>
        <View style={styles.serviceMetaItem}>
          <Ionicons name="star" size={13} color="#FFD000" />
          <Text style={styles.serviceMetaText}>{item.rating.toFixed(1)}</Text>
        </View>
        <View style={styles.serviceMetaItem}>
          <Ionicons name="location-outline" size={13} color="#7C7C7C" />
          <Text style={styles.serviceMetaText}>{item.distance}</Text>
        </View>
        <View style={styles.serviceMetaItemLast}>
          <Ionicons name="time-outline" size={13} color="#7C7C7C" />
          <Text style={styles.serviceMetaText}>{item.hours}</Text>
        </View>
      </View>
      {(item.discount || item.moreCount) && (
        <View style={styles.serviceOfferRow}>
          {item.discount ? (
            <View style={styles.serviceBadge}>
              <Text style={styles.serviceBadgeText}>{item.discount}</Text>
            </View>
          ) : null}
          {item.moreCount ? (
            <View style={styles.serviceBadge}>
              <Text style={styles.serviceBadgeText}>+{item.moreCount} more</Text>
            </View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
  }
);

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
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
  const categoriesTopSpacing = useMemo(
    () => Math.max(24, Math.round(42 * layoutScale)),
    [layoutScale]
  );
  const categoriesBottomSpacing = useMemo(
    () => Math.max(14, Math.round(22 * layoutScale)),
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
  const markerBranchOverrides = useMemo(
    () => ({
      gym_365: { title: t("365 GYM Nitra"), image: require("../assets/365.jpg"), category: "Fitness" },
      gym_klub: { title: t("GYM KLUB"), image: require("../assets/klub.jpg"), category: "Fitness" },
      "Diamond gym": { title: t("Diamond Gym"), image: require("../assets/klub.jpg"), category: "Fitness" },
      "Diamond barber": { title: t("Diamond Barber"), image: require("../assets/royal.jpg"), category: "Beauty" },
    }),
    [t]
  );
  const { branches, markers, buildBranchFromMarker } = useDiscoverData({ t, markerBranchOverrides });

  const supplementalBranches = useMemo(() => {
    const existingKeys = new Set(branches.map(getBranchKey));
    const extras: BranchData[] = [];

    markers.forEach((marker) => {
      if (marker.category === "Multi") return;

      if (existingKeys.has(marker.id.toLowerCase())) return;

      const branch = buildBranchFromMarker(marker);
      const key = getBranchKey(branch);
      if (existingKeys.has(key)) return;

      existingKeys.add(key);
      extras.push(branch);
    });

    return extras;
  }, [branches, markers, buildBranchFromMarker]);

  const homeBranches = useMemo(
    () =>
      [...branches, ...supplementalBranches].map((branch) => {
        const normalizedCategory = normalizeCategory(branch.category);
        if (!normalizedCategory || normalizedCategory === "All") {
          return branch;
        }

        const categoryImages = CATEGORY_PREVIEW_IMAGES[normalizedCategory];
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
    [branches, supplementalBranches]
  );

  const filteredBranches = useMemo(() => {
    if (selectedCategory === "All") {
      return homeBranches;
    }

    return homeBranches.filter(
      (branch) => normalizeCategory(branch.category) === selectedCategory
    );
  }, [homeBranches, selectedCategory]);

  const openNearYou = useMemo(() => filteredBranches.slice(0, 6), [filteredBranches]);
  const trending = useMemo(() => filteredBranches.slice(0, 6), [filteredBranches]);
  const topRated = useMemo(
    () => [...filteredBranches].sort((a, b) => b.rating - a.rating).slice(0, 6),
    [filteredBranches]
  );

  const sidePadding = horizontalPadding;
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
      return <ServiceCard item={item} cardWidth={cardWidth} />;
    },
    [cardWidth]
  );

  const keyExtractor = useCallback(
    (item: BranchData, index: number) => item.id ?? `${item.title}-${index}`,
    []
  );

  const sectionList = useMemo(
    () => [
      { key: "openNearYou", title: t("openNearYou"), data: openNearYou },
      { key: "trending", title: t("trending"), data: trending },
      { key: "topRated", title: t("topRated"), data: topRated },
    ],
    [openNearYou, trending, topRated, t]
  );

  const sectionKeyExtractor = useCallback((item: { key: string }) => item.key, []);
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
    () => [styles.section, { paddingHorizontal: sidePadding }],
    [sidePadding]
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
          <TouchableOpacity style={styles.searchButton} activeOpacity={0.9}>
            <Ionicons name="search-outline" size={20} color="#000" />
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.categoriesWrap,
            {
              marginTop: categoriesTopSpacing,
              marginBottom: categoriesBottomSpacing,
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
      categoriesBottomSpacing,
      categoriesTopSpacing,
      categoriesScrollStyle,
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

  const navigation = useNavigation<any>();

  const handleShowMore = useCallback(
    (sectionKey: string, sectionTitle: string) => {
      navigation.navigate("ShowMore", { section: sectionKey, title: sectionTitle });
    },
    [navigation]
  );

  const renderSection = useCallback(
    ({ item }: { item: { key: string; title: string; data: BranchData[] } }) => (
      <View style={sectionContainerStyle}>
        <View style={styles.sectionHeader}>
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
          contentContainerStyle={[
            styles.servicesRow,
            { paddingRight: sidePadding },
          ]}
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
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 16,
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
  serviceCard: {
    gap: 6,
  },
  serviceImage: {
    height: 134,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  serviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingRight: 5,
    marginRight: 5,
    borderRightWidth: 0.8,
    borderRightColor: "#7C7C7C",
  },
  serviceMetaItemLast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  serviceMetaText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7C7C7C",
  },
  serviceOfferRow: {
    flexDirection: "row",
    gap: 4,
  },
  serviceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: "#EB8100",
  },
  serviceBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});


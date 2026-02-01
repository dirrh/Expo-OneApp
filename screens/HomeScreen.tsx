import React, { memo, useCallback, useMemo } from "react";
import {
  FlatList,
  Image,
  Platform,
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
import type { BranchData, DiscoverCategory } from "../lib/interfaces";

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
  const markerBranchOverrides = useMemo(
    () => ({
      gym_365: { title: t("365 GYM Nitra"), image: require("../assets/365.jpg"), category: "Fitness" },
      gym_klub: { title: t("GYM KLUB"), image: require("../assets/klub.jpg"), category: "Fitness" },
      "Diamond gym": { title: t("Diamond Gym"), image: require("../assets/klub.jpg"), category: "Fitness" },
      "Diamond barber": { title: t("Diamond Barber"), image: require("../assets/royal.jpg"), category: "Beauty" },
    }),
    [t]
  );
  const { branches } = useDiscoverData({ t, markerBranchOverrides });

  const openNearYou = useMemo(() => branches.slice(0, 6), [branches]);
  const trending = useMemo(() => branches.slice(0, 6), [branches]);
  const topRated = useMemo(
    () => [...branches].sort((a, b) => b.rating - a.rating).slice(0, 6),
    [branches]
  );

  const sidePadding = 16;
  const availableWidth = useMemo(() => screenWidth - sidePadding * 2, [screenWidth]);
  const cardGap = useMemo(
    () => Math.min(27, Math.max(18, Math.floor(availableWidth * 0.07))),
    [availableWidth]
  );
  const cardWidth = useMemo(
    () => Math.min(230, Math.max(200, Math.floor(availableWidth * 0.58))),
    [availableWidth]
  );
  const peekWidth = useMemo(
    () => Math.max(0, availableWidth - cardWidth - cardGap),
    [availableWidth, cardWidth, cardGap]
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

  const listHeader = useMemo(
    () => (
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.locationChip} activeOpacity={0.9}>
          <Image source={require("../images/pin.png")} style={styles.locationIcon} />
          <Text style={styles.locationText}>{t("yourLocation")}</Text>
          <Image source={require("../images/options.png")} style={styles.locationCaret} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchButton} activeOpacity={0.9}>
          <Image source={require("../images/search.png")} style={styles.searchIcon} />
        </TouchableOpacity>
      </View>
    ),
    [t]
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
      <View style={styles.section}>
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
          contentContainerStyle={[styles.servicesRow, { paddingRight: sidePadding + peekWidth }]}
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
      peekWidth,
      renderService,
      sectionItemSeparator,
      sidePadding,
      t,
    ]
  );

  const contentStyle = useMemo(
    () => [
      styles.containerContent,
      { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
    ],
    [insets.bottom, insets.top]
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
      removeClippedSubviews={Platform.OS !== "web"}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  containerContent: {
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 12,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  locationIcon: { width: 18, height: 18, resizeMode: "contain" },
  locationText: { fontSize: 14, fontWeight: "600", color: "#111" },
  locationCaret: { width: 16, height: 16, opacity: 0.7, resizeMode: "contain" },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  searchIcon: { width: 18, height: 18, resizeMode: "contain" },
  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
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
    fontSize: 10,
    fontWeight: "600",
    color: "#7C7C7C",
  },
  servicesRow: {
    paddingRight: 16,
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
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

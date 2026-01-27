import React, { memo, useCallback, useMemo } from "react";
import {
  FlatList,
  Image,
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.serviceOfferRow}
      >
        {item.discount && (
          <View style={styles.serviceBadge}>
            <Text style={styles.serviceBadgeText}>{item.discount}</Text>
          </View>
        )}
        {item.moreCount ? (
          <View style={styles.serviceBadge}>
            <Text style={styles.serviceBadgeText}>+{item.moreCount} more</Text>
          </View>
        ) : null}
      </ScrollView>
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

  const cardGap = useMemo(() => {
    return Math.min(27, Math.max(16, Math.floor((screenWidth - 32) * 0.08)));
  }, [screenWidth]);
  const cardWidth = useMemo(() => {
    const availableWidth = screenWidth - 32;
    return Math.min(207, Math.max(170, Math.floor(availableWidth * 0.55)));
  }, [screenWidth]);

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

  const sectionList = [
    { title: "Open near you", data: openNearYou },
    { title: "Trending", data: trending },
    { title: "Top rated", data: topRated },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.containerContent, { paddingBottom: insets.bottom + 24 }]}
    >
      <View style={[styles.topRow, { marginTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.locationChip} activeOpacity={0.9}>
          <Image source={require("../images/pin.png")} style={styles.locationIcon} />
          <Text style={styles.locationText}>Your Location</Text>
          <Image source={require("../images/options.png")} style={styles.locationCaret} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchButton} activeOpacity={0.9}>
          <Image source={require("../images/search.png")} style={styles.searchIcon} />
        </TouchableOpacity>
      </View>

      {sectionList.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionMore}>Show more</Text>
          </View>
          <FlatList
            data={section.data}
            renderItem={renderService}
            keyExtractor={keyExtractor}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesRow}
            ItemSeparatorComponent={() => <View style={{ width: cardGap }} />}
            getItemLayout={(_, index) => ({
              length: cardWidth + cardGap,
              offset: index * (cardWidth + cardGap),
              index,
            })}
          />
        </View>
      ))}
    </ScrollView>
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
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  locationIcon: { width: 14, height: 14, resizeMode: "contain" },
  locationText: { fontSize: 14, fontWeight: "600", color: "#111" },
  locationCaret: { width: 14, height: 14, opacity: 0.7, resizeMode: "contain" },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  searchIcon: { width: 16, height: 16, resizeMode: "contain" },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
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

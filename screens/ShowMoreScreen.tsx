/**
 * ShowMoreScreen.tsx
 * 
 * Obrazovka zobrazujúca všetky pobočky v danej kategórii.
 * Použitá z HomeScreen pri kliknutí na "Zobraziť viac".
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import BranchCard from "../components/BranchCard";
import { useDiscoverData } from "../lib/hooks";
import type { BranchData } from "../lib/interfaces";

type SectionType = "openNearYou" | "trending" | "topRated";

export default function ShowMoreScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  // Získame typ sekcie z parametrov
  const sectionType: SectionType = route.params?.section || "openNearYou";
  const sectionTitle: string = route.params?.title || t("openNearYou");

  // Načítame dáta
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

  // Filtrujeme/sortujeme podľa typu sekcie
  const filteredBranches = useMemo(() => {
    switch (sectionType) {
      case "topRated":
        return [...branches].sort((a, b) => b.rating - a.rating);
      case "trending":
        // V reálnej appke by tu bola logika pre trending
        return branches;
      case "openNearYou":
      default:
        // V reálnej appke by tu bola logika pre najbližšie
        return branches;
    }
  }, [branches, sectionType]);

  const renderItem = ({ item }: { item: BranchData }) => (
    <View style={styles.cardContainer}>
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
        address={item.address}
        phone={item.phone}
        email={item.email}
        website={item.website}
      />
    </View>
  );

  const keyExtractor = (item: BranchData, index: number) => 
    item.id ?? `${item.title}-${index}`;

  const ListHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color="#111" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{sectionTitle}</Text>
      <View style={styles.headerRight} />
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="location-outline" size={48} color="#ccc" />
      <Text style={styles.emptyText}>{t("noPlacesFound")}</Text>
    </View>
  );

  const ItemSeparator = () => <View style={styles.separator} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredBranches}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ItemSeparatorComponent={ItemSeparator}
        contentContainerStyle={[
          styles.listContent,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 20,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
  cardContainer: {
    marginBottom: 0,
  },
  separator: {
    height: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#7C7C7C",
    textAlign: "center",
  },
});

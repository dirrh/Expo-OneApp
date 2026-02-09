import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SvgUri } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

const BRANDFETCH_CLIENT = "1id2wnRBnylM5mUQzYz";
const LOGO_URLS = {
  tesco: `https://cdn.brandfetch.io/domain/tesco.com/w/800/h/200/logo?c=${BRANDFETCH_CLIENT}`,
  billa: `https://cdn.brandfetch.io/domain/billa.at/w/800/h/239/logo?c=${BRANDFETCH_CLIENT}`,
  dm: `https://cdn.brandfetch.io/domain/dm.de/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  drogeria: "https://101drogerie.sk/themes/nerd/assets/images/logo_new.svg",
  teta: "https://www.tetadrogerie.cz/img/logo.svg",
  kaufland: `https://cdn.brandfetch.io/domain/kaufland.de/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
};

const LOYALTY_CARDS = [
  { id: "1", name: "TESCO", logoUrl: LOGO_URLS.tesco, cardNumber: "123 456 7890", createdAt: 6 },
  { id: "2", name: "BILLA", logoUrl: LOGO_URLS.billa, cardNumber: "987 654 3210", createdAt: 5 },
  { id: "3", name: "dm", logoUrl: LOGO_URLS.dm, cardNumber: "456 789 0123", createdAt: 4 },
  { id: "4", name: "101 DROGÉRIA", logoUrl: LOGO_URLS.drogeria, cardNumber: "111 222 3333", createdAt: 3, logoScale: 1.15 },
  { id: "5", name: "teta drogerie", logoUrl: LOGO_URLS.teta, cardNumber: "444 555 6666", createdAt: 2, logoScale: 1.15 },
  { id: "6", name: "Kaufland", logoUrl: LOGO_URLS.kaufland, cardNumber: "777 888 9999", createdAt: 1 },
];

type SortOption = "alphabetical" | "latest" | "custom";

export default function CardsAddScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sidePadding = 16;
  const cardGap = 15;
  const availableWidth = screenWidth - sidePadding * 2;
  const cardWidth = useMemo(
    () => Math.floor((availableWidth - cardGap) / 2),
    [availableWidth]
  );
  const cardHeight = useMemo(() => Math.floor(cardWidth * 0.63), [cardWidth]);

  const filteredCards = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const baseCards = LOYALTY_CARDS.filter((card) => {
      if (!normalizedQuery) return true;
      return (
        card.name.toLowerCase().includes(normalizedQuery) ||
        card.cardNumber.replace(/\s/g, "").includes(normalizedQuery.replace(/\s/g, ""))
      );
    });

    const cards = baseCards.slice();
    if (sortOption === "alphabetical") {
      cards.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "latest") {
      cards.sort((a, b) => b.createdAt - a.createdAt);
    }

    return cards;
  }, [searchQuery, sortOption]);

  const sortLabel = useMemo(() => {
    if (sortOption === "latest") return t("fromLatest");
    if (sortOption === "custom") return t("custom");
    return t("alphabetically");
  }, [sortOption, t]);

  const sortOptions = useMemo(
    () => [
      { key: "alphabetical" as const, label: t("alphabetically") },
      { key: "latest" as const, label: t("fromLatest") },
      { key: "custom" as const, label: t("custom") },
    ],
    [t]
  );

  const handleToggleSort = useCallback(() => {
    setIsSortOpen((prev) => !prev);
  }, []);

  const handleSelectSort = useCallback((option: SortOption) => {
    setSortOption(option);
    setIsSortOpen(false);
  }, []);

  const handleCardPress = useCallback(
    (cardName: string, cardNumber: string) => {
      navigation.navigate("CardsSelectedCard", { cardName, cardNumber });
    },
    [navigation]
  );

  const handleAddCard = useCallback(() => {
    navigation.navigate("CardsAddChoose");
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={25} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t("yourCards")}</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#000000" />
            <TextInput
              style={styles.searchInput}
              placeholder={t("search")}
              placeholderTextColor="#71717A"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={[styles.metaRow, isSortOpen && styles.metaRowOnTop]}>
          <Text style={styles.allCardsText}>
            {t("allCards", { count: filteredCards.length })}
          </Text>
          <View style={styles.sortWrap}>
            <TouchableOpacity
              style={[styles.sortButton, isSortOpen && styles.sortButtonOpen]}
              activeOpacity={0.7}
              onPress={handleToggleSort}
            >
              <Text style={styles.sortText}>{sortLabel}</Text>
              <Ionicons
                name={isSortOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color="#09090B"
                style={styles.sortIcon}
              />
            </TouchableOpacity>
            {isSortOpen && (
              <View style={styles.sortDropdown}>
                {sortOptions
                  .filter((option) => option.key !== sortOption)
                  .map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={styles.dropdownItem}
                      activeOpacity={0.7}
                      onPress={() => handleSelectSort(option.key)}
                    >
                      <Text style={styles.dropdownText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.cardsGrid, { gap: cardGap }]}>
          {filteredCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[styles.card, { width: cardWidth, height: cardHeight }]}
              activeOpacity={0.8}
              onPress={() => handleCardPress(card.name, card.cardNumber)}
            >
              {card.logoUrl ? (
                card.logoUrl.includes(".svg") ? (
                  <SvgUri
                    uri={card.logoUrl}
                    width={cardWidth * 0.75 * (card.logoScale || 1)}
                    height={cardHeight * 0.55 * (card.logoScale || 1)}
                  />
                ) : (
                  <Image
                    source={{ uri: card.logoUrl }}
                    style={{
                      width: cardWidth * 0.75 * (card.logoScale || 1),
                      height: cardHeight * 0.55 * (card.logoScale || 1),
                    }}
                    resizeMode="contain"
                  />
                )
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        activeOpacity={0.85}
        onPress={handleAddCard}
      >
        <Ionicons name="add" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    marginBottom: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
  },
  headerSpacer: {
    width: 48,
  },
  searchRow: {
    marginBottom: 16,
  },
  searchBar: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 3,
        }),
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metaRowOnTop: {
    zIndex: 30,
  },
  allCardsText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#09090B",
  },
  sortButton: {
    height: 40,
    width: 160,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  sortButtonOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sortWrap: {
    position: "relative",
    zIndex: 10,
  },
  sortText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#09090B",
  },
  sortIcon: {
    opacity: 0.5,
  },
  sortDropdown: {
    position: "absolute",
    top: 36,
    right: 0,
    width: 160,
    minWidth: 128,
    paddingVertical: 4,
    paddingHorizontal: 1,
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    alignItems: "stretch",
    zIndex: 20,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 4px 8px -2px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.06)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }),
  },
  dropdownItem: {
    height: 32,
    paddingHorizontal: 12,
    alignItems: "flex-start",
    justifyContent: "center",
    borderRadius: 16,
  },
  dropdownItemSelected: {
    backgroundColor: "transparent",
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#09090B",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 3,
        }),
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#EB8100",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.15)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
});

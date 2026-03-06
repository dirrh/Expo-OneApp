/**
 * CardsScreen: Hlavná obrazovka kariet zobrazuje lojalitné karty, vyhľadávanie, triedenie a akcie pridania.
 *
 * Prečo: Zozbieranie celého card management flowu na jedno miesto znižuje počet prechodov medzi obrazovkami.
 */

import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SvgUri } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../lib/AuthContext";
import { extractNameFromEmail } from "../lib/utils/userUtils";
import SignInPromptSheet from "../components/SignInPromptSheet";
import { LOGGED_OUT_UI_STATE_ENABLED } from "../lib/constants/auth";
import { TAB_BAR_BASE_HEIGHT, TAB_BAR_MIN_INSET } from "../lib/constants/layout";
import { useCardsSession } from "../lib/CardsSessionContext";

const USER_AVATAR = require("../images/photo.png");

const BRANDFETCH_CLIENT = "1id2wnRBnylM5mUQzYz";
const LOGO_URLS = {
  tesco: `https://cdn.brandfetch.io/domain/tesco.com/w/800/h/200/logo?c=${BRANDFETCH_CLIENT}`,
  billa: `https://cdn.brandfetch.io/domain/billa.at/w/800/h/239/logo?c=${BRANDFETCH_CLIENT}`,
  dm: `https://cdn.brandfetch.io/domain/dm.de/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  drogeria: "https://101drogerie.sk/themes/nerd/assets/images/logo_new.svg",
  teta: "https://www.tetadrogerie.cz/img/logo.svg",
  kaufland: `https://cdn.brandfetch.io/domain/kaufland.de/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  lidl: `https://cdn.brandfetch.io/domain/lidl.com/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  shell: `https://cdn.brandfetch.io/domain/shell.com/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  ikea: `https://cdn.brandfetch.io/domain/ikea.com/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  starbucks: `https://cdn.brandfetch.io/domain/starbucks.com/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  mcdonalds: `https://cdn.brandfetch.io/domain/mcdonalds.com/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  alza: `https://cdn.brandfetch.io/domain/alza.cz/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  martinus: `https://cdn.brandfetch.io/domain/martinus.sk/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  notino: `https://cdn.brandfetch.io/domain/notino.com/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  omv: `https://cdn.brandfetch.io/domain/omv.com/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
  nike: `https://cdn.brandfetch.io/domain/nike.com/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
};

interface LoyaltyCardItem {
  id: string;
  name: string;
  logoUrl?: string;
  cardNumber: string;
  hasCard: boolean;
  logoScale?: number;
  createdAt?: number;
}

interface NearbyStoreItem {
  id: string;
  name: string;
  logoUrl: string;
  cardNumber: string;
  distance: string;
}

const LOYALTY_CARDS: LoyaltyCardItem[] = [
  { id: "1", name: "TESCO", logoUrl: LOGO_URLS.tesco, cardNumber: "123 456 7890", hasCard: true, createdAt: 6 },
  { id: "2", name: "BILLA", logoUrl: LOGO_URLS.billa, cardNumber: "987 654 3210", hasCard: true, createdAt: 5 },
  { id: "3", name: "dm", logoUrl: LOGO_URLS.dm, cardNumber: "456 789 0123", hasCard: true, createdAt: 4 },
  {
    id: "4",
    name: "101 DROGERIA",
    logoUrl: LOGO_URLS.drogeria,
    cardNumber: "111 222 3333",
    hasCard: true,
    logoScale: 1.15,
    createdAt: 3,
  },
  {
    id: "5",
    name: "teta drogerie",
    logoUrl: LOGO_URLS.teta,
    cardNumber: "444 555 6666",
    hasCard: true,
    logoScale: 1.15,
    createdAt: 2,
  },
  { id: "6", name: "Kaufland", logoUrl: LOGO_URLS.kaufland, cardNumber: "777 888 9999", hasCard: true, createdAt: 1 },
  { id: "7", name: "Lidl Plus", logoUrl: LOGO_URLS.lidl, cardNumber: "222 333 4444", hasCard: true, createdAt: 16 },
  {
    id: "8",
    name: "Shell ClubSmart",
    logoUrl: LOGO_URLS.shell,
    cardNumber: "333 444 5555",
    hasCard: true,
    createdAt: 15,
  },
  { id: "9", name: "IKEA Family", logoUrl: LOGO_URLS.ikea, cardNumber: "555 666 7777", hasCard: true, createdAt: 14 },
  {
    id: "10",
    name: "Starbucks Rewards",
    logoUrl: LOGO_URLS.starbucks,
    cardNumber: "666 777 8888",
    hasCard: true,
    createdAt: 13,
  },
  {
    id: "11",
    name: "McDonald's App",
    logoUrl: LOGO_URLS.mcdonalds,
    cardNumber: "888 999 0001",
    hasCard: true,
    createdAt: 12,
  },
  { id: "12", name: "Alza Klub", logoUrl: LOGO_URLS.alza, cardNumber: "910 111 2131", hasCard: true, createdAt: 11 },
  {
    id: "13",
    name: "Martinus Klub",
    logoUrl: LOGO_URLS.martinus,
    cardNumber: "121 314 1516",
    hasCard: true,
    createdAt: 10,
  },
  { id: "14", name: "Notino Club", logoUrl: LOGO_URLS.notino, cardNumber: "232 425 2627", hasCard: true, createdAt: 9 },
  { id: "15", name: "OMV Smiles", logoUrl: LOGO_URLS.omv, cardNumber: "343 536 3738", hasCard: true, createdAt: 8 },
  { id: "16", name: "Nike Member", logoUrl: LOGO_URLS.nike, cardNumber: "454 647 4849", hasCard: true, createdAt: 7 },
];

const NEARBY_STORES: NearbyStoreItem[] = [
  { id: "n1", name: "TESCO", logoUrl: LOGO_URLS.tesco, cardNumber: "123 456 7890", distance: "0.3 km" },
  { id: "n2", name: "dm", logoUrl: LOGO_URLS.dm, cardNumber: "456 789 0123", distance: "0.5 km" },
  { id: "n3", name: "BILLA", logoUrl: LOGO_URLS.billa, cardNumber: "987 654 3210", distance: "0.8 km" },
];

interface LoyaltyCardProps {
  item: LoyaltyCardItem;
  cardWidth: number;
  cardHeight: number;
  onPress?: () => void;
}

const LoyaltyCard = ({ item, cardWidth, cardHeight, onPress }: LoyaltyCardProps) => {
  if (!item.hasCard) {
    return (
      <View style={[styles.loyaltyCard, styles.loyaltyCardEmpty, { width: cardWidth, height: cardHeight }]}>
        {/* Empty card placeholder */}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.loyaltyCard, { width: cardWidth, height: cardHeight }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {item.logoUrl ? (
        item.logoUrl.includes(".svg") ? (
          <SvgUri
            uri={item.logoUrl}
            width={cardWidth * 0.75 * (item.logoScale || 1)}
            height={cardHeight * 0.5 * (item.logoScale || 1)}
          />
        ) : (
          <Image
            source={{ uri: item.logoUrl }}
            style={{
              width: cardWidth * 0.75 * (item.logoScale || 1),
              height: cardHeight * 0.5 * (item.logoScale || 1),
            }}
            resizeMode="contain"
          />
        )
      ) : (
        <Text style={styles.customCardLabel} numberOfLines={2}>
          {item.name}
        </Text>
      )}
    </TouchableOpacity>
  );
};

interface NearbyCardProps {
  item: NearbyStoreItem;
  cardWidth: number;
  onPress?: () => void;
}
type SortOption = "alphabetical" | "latest" | "custom";

const NearbyCard = ({ item, cardWidth, onPress }: NearbyCardProps) => (
  <TouchableOpacity
    style={[styles.nearbyCard, { width: cardWidth }]}
    activeOpacity={0.8}
    onPress={onPress}
  >
    {item.logoUrl.includes(".svg") ? (
      <SvgUri uri={item.logoUrl} width={cardWidth * 0.6} height={50} />
    ) : (
      <Image
        source={{ uri: item.logoUrl }}
        style={{
          width: cardWidth * 0.6,
          height: 50,
        }}
        resizeMode="contain"
      />
    )}
  </TouchableOpacity>
);

export default function CardsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { cards: sessionCards } = useCardsSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const isLoggedOut = LOGGED_OUT_UI_STATE_ENABLED && !user;

  const userName = extractNameFromEmail(user?.email);
  const firstName = userName?.firstName || "Martin";
  const lastName = userName?.lastName || "Novak";
  const fullName = user ? (lastName ? `${firstName} ${lastName}` : firstName) : "Martin Nov\u00E1k";
  const userId = user?.id?.substring(0, 6) || "123456";

  const sidePadding = 16;
  const gridGap = 10;
  const nearbyGap = 14;
  const availableWidth = screenWidth - sidePadding * 2;

  const loyaltyCardWidth = useMemo(
    () => Math.floor((availableWidth - gridGap * 2) / 3),
    [availableWidth, gridGap]
  );
  const loyaltyCardHeight = useMemo(
    () => Math.floor(loyaltyCardWidth * 0.632),
    [loyaltyCardWidth]
  );
  const nearbyCardWidth = useMemo(
    () => Math.floor((availableWidth - nearbyGap) / 2),
    [availableWidth, nearbyGap]
  );
  const contentBottomPadding = useMemo(
    () => TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, TAB_BAR_MIN_INSET) + 12,
    [insets.bottom]
  );

  const sessionLoyaltyCards = useMemo<LoyaltyCardItem[]>(() => {
    return sessionCards.map((sessionCard) => {
      const matchingCard = LOYALTY_CARDS.find(
        (card) => card.name.toLowerCase() === sessionCard.cardName.toLowerCase()
      );

      return {
        id: `session-${sessionCard.id}`,
        name: sessionCard.cardName,
        logoUrl: matchingCard?.logoUrl,
        logoScale: matchingCard?.logoScale,
        cardNumber: sessionCard.cardNumber,
        hasCard: true,
        createdAt: sessionCard.createdAt,
      };
    });
  }, [sessionCards]);

  const allLoyaltyCards = useMemo<LoyaltyCardItem[]>(() => {
    const merged: LoyaltyCardItem[] = [];
    const seenCardNumbers = new Set<string>();

    const appendCard = (card: LoyaltyCardItem) => {
      const normalizedNumber = card.cardNumber.replace(/\s/g, "");
      if (normalizedNumber && seenCardNumbers.has(normalizedNumber)) {
        return;
      }
      if (normalizedNumber) {
        seenCardNumbers.add(normalizedNumber);
      }
      merged.push(card);
    };

    sessionLoyaltyCards.forEach(appendCard);
    LOYALTY_CARDS.forEach(appendCard);

    return merged;
  }, [sessionLoyaltyCards]);

  const filteredLoyaltyCards = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const cards = allLoyaltyCards.filter((card) => {
      if (!normalizedQuery) {
        return true;
      }

      const normalizedDigits = normalizedQuery.replace(/\s/g, "");
      return (
        card.name.toLowerCase().includes(normalizedQuery) ||
        card.cardNumber.replace(/\s/g, "").includes(normalizedDigits)
      );
    });

    if (sortOption === "alphabetical") {
      cards.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "latest") {
      cards.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    return cards;
  }, [allLoyaltyCards, searchQuery, sortOption]);

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

  const filteredNearbyStores = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return NEARBY_STORES;
    }

    return NEARBY_STORES.filter((store) =>
      store.name.toLowerCase().includes(normalizedQuery)
    );
  }, [searchQuery]);
  const trimmedSearchQuery = searchQuery.trim();
  const isSearchActive = trimmedSearchQuery.length > 0;
  const shouldShowMissingCardSuggestion =
    !isLoggedOut && isSearchActive && filteredLoyaltyCards.length === 0;

  const handleCloseAuthPrompt = useCallback(() => {
    setShowAuthPrompt(false);
  }, []);

  const handleOpenAuthPrompt = useCallback(() => {
    setShowAuthPrompt(true);
  }, []);

  const handleSignIn = useCallback(() => {
    setShowAuthPrompt(false);
    navigation.navigate("Login");
  }, [navigation]);
  const handleToggleSort = useCallback(() => {
    setIsSortOpen((prev) => !prev);
  }, []);

  const handleSelectSort = useCallback((option: SortOption) => {
    setSortOption(option);
    setIsSortOpen(false);
  }, []);

  const handleUserCardPress = useCallback(() => {
    if (isLoggedOut) {
      handleOpenAuthPrompt();
      return;
    }

    navigation.navigate("CardsUserQR");
  }, [handleOpenAuthPrompt, isLoggedOut, navigation]);
  const handleAddCardPress = useCallback(() => {
    if (isLoggedOut) {
      handleOpenAuthPrompt();
      return;
    }

    navigation.navigate("CardsAddChoose");
  }, [handleOpenAuthPrompt, isLoggedOut, navigation]);
  const handleAddMissingCard = useCallback(() => {
    if (!trimmedSearchQuery) {
      return;
    }

    navigation.navigate("CardsAddNewCard", {
      cardName: t("cardsOtherCard"),
      isOtherCardFlow: true,
      prefilledCardName: trimmedSearchQuery,
    });
  }, [navigation, t, trimmedSearchQuery]);

  const handleCardPress = useCallback(
    (cardName: string, cardNumber: string) => {
      if (isLoggedOut) {
        handleOpenAuthPrompt();
        return;
      }

      navigation.navigate("CardsSelectedCard", { cardName, cardNumber });
    },
    [handleOpenAuthPrompt, isLoggedOut, navigation]
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        scrollEnabled
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: contentBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
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

          <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={handleAddCardPress}>
            <Ionicons name="add" size={16} color="#000000" />
          </TouchableOpacity>
        </View>

        {!isSearchActive && (
          <TouchableOpacity
            style={styles.userCard}
            activeOpacity={0.8}
            onPress={handleUserCardPress}
          >
            <Image source={USER_AVATAR} style={styles.userAvatar} />
            <View style={styles.userCardContent}>
              <Text style={styles.userName}>{fullName}</Text>
              <Text style={styles.userId}>{userId}</Text>
            </View>
            <View style={styles.qrButton}>
              <Ionicons name="scan-outline" size={22} color="#000000" />
            </View>
          </TouchableOpacity>
        )}

        {!isSearchActive && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("nearestToYou")}</Text>
            </View>

            {isLoggedOut ? (
              <TouchableOpacity
                style={[styles.nearbyCard, styles.loggedOutNearbyCard, { width: nearbyCardWidth }]}
                activeOpacity={0.8}
                onPress={handleOpenAuthPrompt}
              >
                <Ionicons name="add" size={54} color="#B9B9B9" />
              </TouchableOpacity>
            ) : (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.nearbyRow}
              >
                {filteredNearbyStores.map((store) => (
                  <NearbyCard
                    key={store.id}
                    item={store}
                    cardWidth={nearbyCardWidth}
                    onPress={() => handleCardPress(store.name, store.cardNumber)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.section}>
          <View style={[styles.sectionHeader, isSortOpen && styles.sectionHeaderOnTop]}>
            <Text style={styles.sectionTitle}>
              {isLoggedOut
                ? t("yourCards")
                : `${t("yourCards")} (${filteredLoyaltyCards.length})`}
            </Text>
            {!isLoggedOut && (
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
            )}
          </View>

          {isLoggedOut ? (
            <TouchableOpacity
              style={[
                styles.loyaltyCard,
                styles.loggedOutLoyaltyCard,
                { width: loyaltyCardWidth, height: loyaltyCardHeight },
              ]}
              activeOpacity={0.8}
              onPress={handleOpenAuthPrompt}
            >
              <Ionicons name="add" size={40} color="#B9B9B9" />
            </TouchableOpacity>
          ) : shouldShowMissingCardSuggestion ? (
            <TouchableOpacity
              style={[styles.notFoundCard, { width: availableWidth }]}
              activeOpacity={0.85}
              onPress={handleAddMissingCard}
            >
              <Ionicons name="add" size={28} color="#8C8C8C" />
              <Text style={styles.notFoundTitle}>
                {t("cardsSearchNoResultsTitle", "Karta nebola nájdená")}
              </Text>
              <Text style={styles.notFoundSubtitle}>
                {t("cardsSearchNoResultsCta", "Pridať kartu?")}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.cardsList}>
              <View style={styles.cardsGrid}>
                {filteredLoyaltyCards.map((card) => (
                  <LoyaltyCard
                    key={card.id}
                    item={card}
                    cardWidth={loyaltyCardWidth}
                    cardHeight={loyaltyCardHeight}
                    onPress={
                      card.hasCard
                        ? () => handleCardPress(card.name, card.cardNumber)
                        : undefined
                    }
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <SignInPromptSheet
        visible={LOGGED_OUT_UI_STATE_ENABLED && showAuthPrompt}
        onClose={handleCloseAuthPrompt}
        onSignIn={handleSignIn}
      />
    </>
  );
}

const CARD_SURFACE_SHADOW =
  Platform.OS === "web"
    ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)" }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
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
  userCard: {
    minHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 28,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }),
  },
  userAvatar: {
    width: 66,
    height: 66,
    borderRadius: 999,
  },
  userCardContent: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  userId: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "500",
    color: "#000000",
  },
  qrButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    color: "#000000",
  },
  sectionHeaderOnTop: {
    zIndex: 30,
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
  dropdownText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#09090B",
  },
  nearbyRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 2,
  },
  nearbyCard: {
    height: 118,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    alignItems: "center",
    justifyContent: "center",
    ...CARD_SURFACE_SHADOW,
  },
  loggedOutNearbyCard: {
    backgroundColor: "#EEEEEE",
    borderRadius: 14,
    borderColor: "#E4E4E7",
    alignItems: "center",
    justifyContent: "center",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cardsList: {
    paddingVertical: 2,
  },
  loyaltyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    alignItems: "center",
    justifyContent: "center",
    ...CARD_SURFACE_SHADOW,
  },
  loyaltyCardEmpty: {
    backgroundColor: "#FFFFFF",
  },
  loggedOutLoyaltyCard: {
    backgroundColor: "#EEEEEE",
    opacity: 0.7,
  },
  notFoundCard: {
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 16,
  },
  notFoundTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
  },
  notFoundSubtitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
    color: "#5B5B5B",
    textAlign: "center",
  },
  customCardLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    paddingHorizontal: 8,
  },
});

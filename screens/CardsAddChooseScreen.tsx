import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { TAB_BAR_BASE_HEIGHT, TAB_BAR_MIN_INSET } from "../lib/constants/layout";

const BRANDFETCH_CLIENT = "1id2wnRBnylM5mUQzYz";
const LOGO_URLS = {
  tesco: `https://cdn.brandfetch.io/domain/tesco.com/w/800/h/200/logo?c=${BRANDFETCH_CLIENT}`,
  billa: `https://cdn.brandfetch.io/domain/billa.at/w/800/h/239/logo?c=${BRANDFETCH_CLIENT}`,
  kaufland: `https://cdn.brandfetch.io/domain/kaufland.de/w/800/h/300/logo?c=${BRANDFETCH_CLIENT}`,
};

type ChooseCardItem = {
  id: string;
  name: string;
  logoUrl: string;
  cardNumber: string;
};

const CHOOSE_CARDS: ChooseCardItem[] = [
  {
    id: "kaufland",
    name: "Kaufland",
    logoUrl: LOGO_URLS.kaufland,
    cardNumber: "777 888 9999",
  },
  {
    id: "tesco",
    name: "Tesco",
    logoUrl: LOGO_URLS.tesco,
    cardNumber: "123 456 7890",
  },
  {
    id: "billa",
    name: "Billa",
    logoUrl: LOGO_URLS.billa,
    cardNumber: "987 654 3210",
  },
];

export default function CardsAddChooseScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const bottomPadding = useMemo(
    () => TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, TAB_BAR_MIN_INSET) + 16,
    [insets.bottom]
  );

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return CHOOSE_CARDS;
    }
    return CHOOSE_CARDS.filter((item) => item.name.toLowerCase().includes(query));
  }, [searchQuery]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: bottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={30} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("cardsNewCard")}</Text>

        <TouchableOpacity
          style={styles.headerIconButton}
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={34} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#000000" />
        <TextInput
          style={styles.searchInput}
          placeholder={t("search")}
          placeholderTextColor="#71717A"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.list}>
        {filteredCards.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.row, index === filteredCards.length - 1 && styles.rowLast]}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("CardsAddNewCard", {
                cardName: item.name,
              })
            }
          >
            <View style={styles.logoCard}>
              <Image source={{ uri: item.logoUrl }} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.rowTitle}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={styles.otherButton}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("CardsAddNewCard", {
              cardName: t("cardsOtherCard"),
              isOtherCardFlow: true,
            })
          }
        >
          <Text style={styles.otherButtonText}>{t("cardsOtherCard")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    color: "#000000",
  },
  searchWrap: {
    width: "100%",
    height: 42,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#000000",
  },
  list: {
    marginTop: 22,
  },
  row: {
    width: "100%",
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E4E7",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  logoCard: {
    width: 59.29,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 47,
    height: 30,
  },
  rowTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: "#000000",
  },
  bottomArea: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#E4E4E7",
    marginTop: 0,
    paddingTop: 20,
    alignItems: "center",
  },
  otherButton: {
    width: 105,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7D7D7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  otherButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "600",
    color: "#18181B",
  },
});

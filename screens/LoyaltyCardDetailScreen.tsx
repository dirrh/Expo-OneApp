import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Linking,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import Barcode from "@kichiyaki/react-native-barcode-generator";
import { useTranslation } from "react-i18next";
import { TAB_BAR_BASE_HEIGHT, TAB_BAR_MIN_INSET } from "../lib/constants/layout";

const OFFER_IMAGES = {
  TESCO: require("../assets/offers/tesco_offer.jpg"),
  BILLA: require("../assets/offers/billa_offer.jpg"),
  "101 DROGERIA": require("../assets/offers/drogeria101_offer.jpg"),
  "teta drogerie": require("../assets/offers/teta_offer.jpg"),
  Kaufland: require("../assets/offers/kaufland_offer.jpg"),
};

const CARD_TYPES: Record<string, "barcode" | "qr"> = {
  TESCO: "barcode",
  BILLA: "barcode",
  dm: "qr",
  "101 DROGERIA": "barcode",
  "teta drogerie": "barcode",
  Kaufland: "barcode",
};

const CARD_WEBSITES: Record<string, string> = {
  TESCO: "https://www.tesco.com",
  BILLA: "https://www.billa.sk",
  dm: "https://www.dm.sk",
  "101 DROGERIA": "https://101drogerie.sk",
  "teta drogerie": "https://www.tetadrogerie.sk",
  Kaufland: "https://www.kaufland.sk",
};

type OfferItem = {
  image: number;
  labelKey: string;
  dateKey: string;
  buttonTextKey: string;
  imageMode?: "cover" | "contain";
  imageBackgroundColor?: string;
};

const CARD_OFFERS: Record<string, OfferItem> = {
  TESCO: {
    image: OFFER_IMAGES.TESCO,
    labelKey: "cardsOfferCurrentOffer",
    dateKey: "cardsOfferDateTesco",
    buttonTextKey: "cardsView",
  },
  BILLA: {
    image: OFFER_IMAGES.BILLA,
    labelKey: "cardsOfferFreshWeek",
    dateKey: "cardsOfferDateBilla",
    buttonTextKey: "cardsView",
  },
  dm: {
    image: require("../assets/offers/dm_logo.webp"),
    labelKey: "cardsOfferCurrentOffer",
    dateKey: "cardsOfferDateDm",
    buttonTextKey: "cardsView",
    imageMode: "contain",
    imageBackgroundColor: "#F8D1CA",
  },
  "101 DROGERIA": {
    image: OFFER_IMAGES["101 DROGERIA"],
    labelKey: "cardsOfferDrogeriaDeal",
    dateKey: "cardsOfferDate101Drogeria",
    buttonTextKey: "cardsView",
  },
  "teta drogerie": {
    image: OFFER_IMAGES["teta drogerie"],
    labelKey: "cardsOfferCareSpecial",
    dateKey: "cardsOfferDateTeta",
    buttonTextKey: "cardsView",
  },
  Kaufland: {
    image: OFFER_IMAGES.Kaufland,
    labelKey: "cardsOfferWeeklyPrices",
    dateKey: "cardsOfferDateKaufland",
    buttonTextKey: "cardsView",
  },
};

interface RouteParams {
  cardName: string;
  cardNumber: string;
}

const resolveCardKey = (cardName: string): string => {
  if (cardName.toLowerCase().includes("101 dro")) {
    return "101 DROGERIA";
  }
  return cardName;
};

const formatCardTitle = (name: string): string =>
  name
    .split(" ")
    .map((word) => {
      if (word.toLowerCase() === "dm") {
        return "DM";
      }
      if (!word.length) {
        return word;
      }
      return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join(" ");

export default function LoyaltyCardDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = 16;

  const { cardName = "TESCO", cardNumber = "123 456 7890" } =
    (route.params as RouteParams) || {};

  const resolvedCardName = resolveCardKey(cardName);
  const codeType = CARD_TYPES[resolvedCardName] || "barcode";
  const cleanCardNumber = cardNumber.replace(/\s/g, "");
  const websiteUrl = CARD_WEBSITES[resolvedCardName] || CARD_WEBSITES.TESCO;
  const offer = CARD_OFFERS[resolvedCardName] || CARD_OFFERS.TESCO;

  const contentWidth = useMemo(
    () => Math.max(0, screenWidth - horizontalPadding * 2),
    [screenWidth, horizontalPadding]
  );
  const cardWidth = contentWidth;
  const sectionWidth = contentWidth;
  const qrSize = useMemo(() => {
    const preferred = cardWidth - 120;
    const maxAllowed = Math.max(120, cardWidth - 40);
    return Math.min(maxAllowed, Math.max(140, Math.min(240, preferred)));
  }, [cardWidth]);
  const qrCardHeight = useMemo(
    () => Math.max(264, Math.round(cardWidth * 0.92)),
    [cardWidth]
  );
  const barcodeCardHeight = useMemo(
    () => Math.max(210, Math.round(cardWidth * 0.705)),
    [cardWidth]
  );
  const barcodeWidth = useMemo(
    () => Math.min(312.48, cardWidth - 48),
    [cardWidth]
  );
  const barcodeHeight = useMemo(
    () => Math.max(88, Math.min(114.88, cardWidth * 0.318)),
    [cardWidth]
  );
  const barcodeFormat = useMemo(
    () =>
      /^\d+$/.test(cleanCardNumber) && cleanCardNumber.length % 2 === 0
        ? "CODE128C"
        : "CODE128",
    [cleanCardNumber]
  );
  const barcodeLineWidth = useMemo(
    () => (barcodeFormat === "CODE128C" ? 4 : 3),
    [barcodeFormat]
  );
  const isQrCard = codeType === "qr";
  const title = useMemo(() => formatCardTitle(cardName), [cardName]);
  const bottomPadding = useMemo(
    () => TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, TAB_BAR_MIN_INSET) + 12,
    [insets.bottom]
  );

  const handleVisitWebsite = useCallback(() => {
    Linking.openURL(websiteUrl).catch(() => {});
  }, [websiteUrl]);

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
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={30} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{title}</Text>

        <TouchableOpacity style={styles.iconButton} activeOpacity={0.75}>
          <Ionicons name="ellipsis-vertical" size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.codeCard,
          { width: cardWidth, height: isQrCard ? qrCardHeight : barcodeCardHeight },
        ]}
      >
        {isQrCard ? (
          <View style={styles.qrContent}>
            <QRCode
              value={cleanCardNumber}
              size={qrSize}
              backgroundColor="#FFFFFF"
              color="#000000"
            />
            <Text style={[styles.cardNumber, styles.qrCardNumber]}>{cardNumber}</Text>
          </View>
        ) : (
          <>
            <Barcode
              value={cleanCardNumber}
              format={barcodeFormat}
              width={barcodeLineWidth}
              maxWidth={barcodeWidth}
              height={barcodeHeight}
              lineColor="#000000"
              background="#FFFFFF"
              text=""
            />
            <Text style={styles.cardNumber}>{cardNumber}</Text>
          </>
        )}
      </View>

      <View
        style={[
          styles.recommendedSection,
          { width: sectionWidth, marginTop: isQrCard ? 26 : 24 },
        ]}
      >
        <Text style={styles.sectionTitle}>{t("cardsRecommended")}</Text>

        <View style={styles.offerCard}>
          <View
            style={[
              styles.offerImageFrame,
              offer.imageBackgroundColor
                ? { backgroundColor: offer.imageBackgroundColor }
                : null,
            ]}
          >
            <Image
              source={offer.image}
              style={
                offer.imageMode === "contain"
                  ? styles.offerImageContain
                  : styles.offerImage
              }
              resizeMode={offer.imageMode || "cover"}
            />
          </View>

          <View style={styles.offerContent}>
            <Text style={styles.offerLabel}>{t(offer.labelKey)}</Text>
            <Text style={styles.offerDate}>{t(offer.dateKey)}</Text>

            <TouchableOpacity style={styles.viewButton} activeOpacity={0.75}>
              <Text style={styles.viewButtonText}>{t(offer.buttonTextKey)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.bottomActions, { width: sectionWidth }]}>
        <TouchableOpacity
          style={styles.websiteButton}
          activeOpacity={0.85}
          onPress={handleVisitWebsite}
        >
          <Text style={styles.websiteButtonText}>{t("cardsVisitWebsite")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileButton} activeOpacity={0.85}>
          <Text style={styles.profileButtonText}>{t("cardsOpenProfile")}</Text>
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
    flexGrow: 1,
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 24,
  },
  iconButton: {
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
  codeCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  cardNumber: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    color: "#767676",
    textAlign: "center",
  },
  qrContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  qrCardNumber: {
    marginTop: 6,
  },
  recommendedSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 10,
  },
  offerCard: {
    height: 117,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  offerImageFrame: {
    width: 83,
    height: 83,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  offerImage: {
    width: "100%",
    height: "100%",
  },
  offerImageContain: {
    width: "72%",
    height: "72%",
  },
  offerContent: {
    flex: 1,
    marginLeft: 14,
  },
  offerLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "400",
    color: "#000000",
    marginBottom: 2,
  },
  offerDate: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
  },
  viewButton: {
    width: "100%",
    maxWidth: 195,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7D7D7",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  viewButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "600",
    color: "#18181B",
  },
  bottomActions: {
    marginTop: "auto",
  },
  websiteButton: {
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7D7D7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
    backgroundColor: "#FFFFFF",
  },
  websiteButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "700",
    color: "#000000",
  },
  profileButton: {
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  profileButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

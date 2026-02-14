/**
 * BranchCard.tsx
 * 
 * Karta pobočky zobrazovaná v zoznamoch.
 * Obsahuje obrázok, názov, hodnotenie, vzdialenosť a otváracie hodiny.
 * 
 * OPTIMALIZÁCIE:
 * - memo() zabraňuje zbytočným renderom keď sa zmení parent
 * - useMemo() pre dynamické štýly (imageSize)
 */

import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BranchCardProps, BranchData } from "../lib/interfaces";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

function BranchCard(props: BranchCardProps) {
  const { t } = useTranslation();
  // Rozbalíme všetky props
  const {
    title,
    image,
    images,
    rating,
    distance,
    hours,
    category,
    discount,
    offers,
    moreCount,
    cardPaddingBottom,
    badgePosition,
    badgeInlineOffset,
    badgeRowOffset,
    noElevation,
    address,
    phone,
    email,
    website,
    coordinates,
    onPress,
  } = props;

  // Šírka obrazovky pre responzívny obrázok
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();

  /**
   * Vypočítame veľkosť obrázka podľa šírky obrazovky
   * Minimum 80px, maximum 96px, inak 20% šírky obrazovky
   * useMemo zabezpečí, že sa prepočíta len keď sa zmení width
   */
  const scale = useMemo(() => Math.min(1, Math.max(0.82, width / 393)), [width]);
  const imageSize = useMemo(() => Math.round(80 * scale), [scale]);
  const cardHeight = useMemo(() => Math.round(112 * scale), [scale]);
  const cardPadding = useMemo(() => Math.round(16 * scale), [scale]);
  const baseCardPaddingBottom = useMemo(
    () => (typeof cardPaddingBottom === "number" ? cardPaddingBottom : 6),
    [cardPaddingBottom]
  );
  const cardPaddingBottomScaled = useMemo(
    () => Math.round(baseCardPaddingBottom * scale),
    [baseCardPaddingBottom, scale]
  );
  const cardRadius = useMemo(() => Math.round(14 * scale), [scale]);
  const imageRadius = useMemo(() => Math.round(6 * scale), [scale]);
  const fontBoost = 1;
  const titleSize = useMemo(() => Math.round(14 * scale) + fontBoost, [scale]);
  const metaSize = useMemo(() => Math.round(12 * scale) + fontBoost, [scale]);
  const badgeFontSize = useMemo(() => Math.round(10 * scale) + fontBoost, [scale]);
  const badgePaddingH = useMemo(() => Math.round(12 * scale), [scale]);
  const badgePaddingV = useMemo(() => Math.round(4 * scale), [scale]);
  const badgeGap = useMemo(() => Math.round(8 * scale), [scale]);
  const badgeInlineOffsetScaled = useMemo(() => {
    if (typeof badgeInlineOffset !== "number") return null;
    return Math.round(badgeInlineOffset * scale);
  }, [badgeInlineOffset, scale]);
  const badgeRowOffsetScaled = useMemo(() => {
    if (typeof badgeRowOffset !== "number") return null;
    return Math.round(badgeRowOffset * scale);
  }, [badgeRowOffset, scale]);

  const resolvedOffers = useMemo(() => {
    if (offers && offers.length > 0) return offers;
    return discount ? [discount] : [];
  }, [offers, discount]);
  const resolvedMoreCount = useMemo(() => {
    if (typeof moreCount === "number") return moreCount;
    return Math.max(0, resolvedOffers.length - (resolvedOffers.length > 0 ? 1 : 0));
  }, [moreCount, resolvedOffers.length]);
  /**
   * Štýl pre obrázok - kombinujeme základný štýl s dynamickou veľkosťou
   * useMemo zabezpečí, že sa nevytvára nový objekt pri každom renderi
   */
  const imageStyle = useMemo(
    () => [
      styles.branchImage,
      { width: imageSize, height: imageSize, borderRadius: imageRadius, marginRight: cardPadding },
    ],
    [imageSize, imageRadius, cardPadding]
  );

  const cardStyle = useMemo(
    () => [
      styles.branchCard,
      noElevation && styles.branchCardNoElevation,
      {
        height: cardHeight,
        paddingHorizontal: cardPadding,
        paddingTop: cardPadding,
        paddingBottom: cardPaddingBottomScaled,
        borderRadius: cardRadius,
      },
    ],
    [cardHeight, cardPadding, cardPaddingBottomScaled, cardRadius, noElevation]
  );

  /**
   * Handler pre kliknutie na kartu
   * Ak je poskytnutý vlastný onPress, použijeme ho
   * Inak navigujeme na detail pobočky
   */
  const handlePress = () => {
    // Vytvoríme objekt pobočky z props
    const branch: BranchData = {
      title,
      image,
      images,
      rating,
      distance,
      hours,
      category,
      discount,
      offers,
      moreCount: props.moreCount,
      address,
      phone,
      email,
      website,
      coordinates,
    };

    if (onPress) {
      onPress(branch);
    } else {
      navigation.navigate("BusinessDetailScreen", { branch });
    }
  };

  const inlineBadges = badgePosition === "inline";

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={cardStyle}
    >
      {/* Obrázok pobočky */}
      <Image source={image} style={imageStyle} resizeMode="cover" />

      {/* Obsah karty */}
      <View style={[styles.branchContent, inlineBadges && styles.branchContentInline]}>
        <View style={styles.topContent}>
          {/* Title */}
          <Text style={[styles.branchTitle, { fontSize: titleSize }]} numberOfLines={1}>
            {title}
          </Text>

          {/* Meta row */}
          <View style={[styles.metaRow, inlineBadges && styles.metaRowInline]}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={Math.round(13 * scale)} color="#FFD000" />
              <Text style={[styles.metaText, { fontSize: metaSize }]}>{rating}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={Math.round(13 * scale)} color="#7C7C7C" />
              <Text style={[styles.metaText, { fontSize: metaSize }]}>{distance}</Text>
            </View>
            <View style={styles.metaItemLast}>
              <Ionicons name="time-outline" size={Math.round(13 * scale)} color="#7C7C7C" />
              <Text style={[styles.metaText, { fontSize: metaSize }]}>{hours}</Text>
            </View>
          </View>
        </View>

        {/* Offers row */}
        {resolvedOffers.length > 0 && (
          <View
            style={[
              styles.badgeRow,
              { gap: badgeGap },
              inlineBadges && styles.badgeRowInline,
              inlineBadges && badgeInlineOffsetScaled !== null && { marginTop: badgeInlineOffsetScaled },
              !inlineBadges && badgeRowOffsetScaled !== null && { marginTop: badgeRowOffsetScaled },
            ]}
          >
            {resolvedOffers[0] ? (
              <View style={[styles.badge, styles.badgeShrink, { paddingHorizontal: badgePaddingH, paddingVertical: badgePaddingV }]}>
                <Text style={[styles.badgeText, { fontSize: badgeFontSize }]} numberOfLines={1}>
                  {t(resolvedOffers[0])}
                </Text>
              </View>
            ) : null}
            {resolvedMoreCount > 0 ? (
              <Text
                style={[styles.moreText, styles.moreTextFixed, { fontSize: metaSize }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                + {resolvedMoreCount} {t("more")}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// memo() zabraňuje zbytočným renderom - komponent sa prerenderuje len ak sa zmenia props
export default memo(BranchCard);

// === ŠTÝLY ===
const styles = StyleSheet.create({
  // Hlavný kontajner karty
  branchCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    // Tieň - rôzny pre web a native
    ...Platform.select({
      web: { boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,  // Android tieň
      },
    }),
    width: "100%",
  },
  branchCardNoElevation: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },

  // Obrázok pobočky
  branchImage: {
    borderRadius: 6,
  },

  // Obsahová časť (pravá strana)
  branchContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "flex-start",
  },
  branchContentInline: {
    minWidth: 0,
    justifyContent: "flex-start",
    gap: 0,
  },
  topContent: {
    flexShrink: 1,
  },

  // Názov pobočky
  branchTitle: {
    fontWeight: "700",
    marginBottom: 6,
    color: "#000",
  },

  // Riadok s metadátami (hviezdičky, vzdialenosť, čas)
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
    flexWrap: "nowrap",
  },
  metaRowInline: {
    marginBottom: 2,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingRight: 6,
    marginRight: 6,
    borderRightWidth: 0.8,
    borderRightColor: "#7C7C7C",
  },
  metaItemLast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  // Text metadát
  metaText: {
    color: "#7C7C7C",
  },

  // Spodný riadok (zľava, +X more)
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minWidth: 0,
    paddingRight: 4,
    overflow: "hidden",
  },
  badgeRowInline: {
    marginTop: 2,
  },

  // Badge so zľavou (oranžový)
  badge: {
    backgroundColor: "#EB8100",
    borderRadius: 9999,
  },

  // Text v badge
  badgeText: {
    color: "#fff",
    fontWeight: "600",
  },
  moreText: {
    color: "#000000",
    fontWeight: "500",
  },
  badgeShrink: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
  },
  moreTextFixed: {
    flexShrink: 0,
  },

  // Text "+X more"
});

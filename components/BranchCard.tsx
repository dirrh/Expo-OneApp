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

/**
 * BranchCard: Renderuje kompaktnú kartu podniku s kľúčovými metrikami a benefit badge.
 *
 * Prečo: Rovnaký card pattern v listoch drží prehľadné porovnanie podnikov na prvý pohľad.
 */
function BranchCard(props: BranchCardProps) {
  const { t } = useTranslation();
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
    cardMarginBottom,
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

  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();

  // Skalovanie drzi kartu citatelnu na mensich displejoch bez rozbitia layoutu na sirsich.
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
  // Stabilna referencia style objektu znizuje re-render overhead vo zoznamoch.
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
        ...(cardMarginBottom !== undefined && { marginBottom: cardMarginBottom }),
      },
    ],
    [cardHeight, cardPadding, cardPaddingBottomScaled, cardRadius, noElevation, cardMarginBottom]
  );

  // Jeden branch payload pre custom onPress aj default navigaciu drzi spravanie konzistentne.
  const handlePress = () => {
    const branch: BranchData = {
      id: props.id,
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
      menuItems: props.menuItems,
      menuLabelMode: props.menuLabelMode,
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
      <Image source={image} style={imageStyle} resizeMode="cover" />
      <View style={[styles.branchContent, inlineBadges && styles.branchContentInline]}>
        <View style={styles.topContent}>
          <Text style={[styles.branchTitle, { fontSize: titleSize }]} numberOfLines={1}>
            {title}
          </Text>
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

export default memo(BranchCard);

const styles = StyleSheet.create({
  branchCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    ...Platform.select({
      web: { boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
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

  branchImage: {
    borderRadius: 6,
  },

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

  branchTitle: {
    fontWeight: "700",
    marginBottom: 6,
    color: "#000",
  },

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
  metaText: {
    color: "#7C7C7C",
  },

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

  badge: {
    backgroundColor: "#EB8100",
    borderRadius: 9999,
  },

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

});

// HomeBranchGridCard: shared Home style card for horizontal and grid lists.
// Zodpovednost: render Home-like card layout for branch previews.
// Vstup/Vystup: BranchData + width, optional onPress callback.

import React, { memo, useCallback } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { BranchData } from "../../lib/interfaces";

interface HomeBranchGridCardProps {
  branch: BranchData;
  cardWidth: number;
  onPress?: (branch: BranchData) => void;
  compact?: boolean;
}

function HomeBranchGridCard({ branch, cardWidth, onPress, compact = false }: HomeBranchGridCardProps) {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(branch);
      return;
    }

    navigation.navigate("BusinessDetailScreen", { branch });
  }, [branch, navigation, onPress]);

  const moreLabel =
    typeof branch.moreCount === "number" && branch.moreCount > 0
      ? compact
        ? `+${branch.moreCount}`
        : `+${branch.moreCount} ${t("more")}`
      : "";
  const metaIconSize = compact ? 12 : 13;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, compact && styles.cardCompact, { width: cardWidth }]}
      onPress={handlePress}
      accessibilityLabel={branch.title}
    >
      <Image
        source={branch.image}
        style={[styles.image, compact && styles.imageCompact, { width: cardWidth }]}
        resizeMode="cover"
      />
      <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
        {branch.title}
      </Text>

      <View style={styles.metaRow}>
        <View style={[styles.metaItem, compact && styles.metaItemCompact]}>
          <Ionicons name="star" size={metaIconSize} color="#FFD000" />
          <Text style={[styles.metaText, compact && styles.metaTextCompact]}>{branch.rating.toFixed(1)}</Text>
        </View>
        <View style={[styles.metaItem, compact && styles.metaItemCompact]}>
          <Ionicons name="location-outline" size={metaIconSize} color="#7C7C7C" />
          <Text style={[styles.metaText, compact && styles.metaTextCompact]}>{branch.distance}</Text>
        </View>
        <View style={[styles.metaItemLast, compact && styles.metaItemLastCompact]}>
          <Ionicons name="time-outline" size={metaIconSize} color="#7C7C7C" />
          <Text style={[styles.metaText, compact && styles.metaTextCompact]}>{branch.hours}</Text>
        </View>
      </View>

      <View style={[styles.offerRow, compact && styles.offerRowCompact]}>
        {branch.discount ? (
          <View
            style={[
              styles.badge,
              styles.badgePrimary,
              compact && styles.badgeCompact,
              compact && styles.badgePrimaryCompact,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                styles.badgeTextShrink,
                compact && styles.badgeTextCompact,
              ]}
              numberOfLines={1}
            >
              {branch.discount}
            </Text>
          </View>
        ) : null}
        {branch.moreCount ? (
          <View
            style={[
              styles.badge,
              styles.badgeSecondary,
              compact && styles.badgeCompact,
              compact && styles.badgeSecondaryCompact,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                compact && styles.badgeTextCompact,
                compact && styles.badgeSecondaryTextCompact,
              ]}
              numberOfLines={1}
            >
              {moreLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default memo(HomeBranchGridCard);

const styles = StyleSheet.create({
  card: {
    gap: 6,
  },
  cardCompact: {
    gap: 5,
  },
  image: {
    height: 134,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  imageCompact: {
    height: 120,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    lineHeight: 20,
  },
  titleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingRight: 5,
    marginRight: 5,
    borderRightWidth: 0.8,
    borderRightColor: "#7C7C7C",
  },
  metaItemCompact: {
    gap: 4,
    paddingRight: 4,
    marginRight: 4,
  },
  metaItemLast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaItemLastCompact: {
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7C7C7C",
  },
  metaTextCompact: {
    fontSize: 11,
  },
  offerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "100%",
    minWidth: 0,
    minHeight: 24,
    overflow: "hidden",
  },
  offerRowCompact: {
    gap: 3,
    minHeight: 22,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: "#EB8100",
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePrimary: {
    flexShrink: 1,
    minWidth: 0,
  },
  badgePrimaryCompact: {
    maxWidth: "72%",
  },
  badgeSecondary: {
    flexShrink: 0,
  },
  badgeSecondaryCompact: {
    backgroundColor: "#FFF4E6",
    borderWidth: 1,
    borderColor: "#F3D2A8",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  badgeTextCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
  badgeSecondaryTextCompact: {
    color: "#C66A00",
    fontWeight: "700",
  },
  badgeTextShrink: {
    flexShrink: 1,
    minWidth: 0,
  },
});

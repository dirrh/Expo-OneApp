import React, { memo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";

type Props = {
  title: string;
  rating: number;
  ratingCount?: number;
  distance: string;
  hours: string;
  category?: string;
};

// memo() zabraňuje zbytočným renderom ak sa props nezmenia
export const HeroInfo = memo(function HeroInfo({ title, rating, ratingCount, distance, hours, category }: Props) {
  const badgeLabel = category || "Fitness";
  return (
    <View style={styles.container}>
      {/* TITLE + BADGE */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      </View>

      {/* META - rating, vzdialenosť, hodiny */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Image
            source={require("../../images/star.png")}
            style={styles.starIcon}
          />
          <Text style={styles.metaText}>
            {rating}{ratingCount ? ` (${ratingCount})` : ""}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Image
            source={require("../../images/pin_white.png")}
            style={styles.icon}
          />
          <Text style={styles.metaText}>{distance}</Text>
        </View>

        <View style={styles.metaItem}>
          <Image
            source={require("../../images/clock.png")}
            style={styles.icon}
          />
          <Text style={styles.metaText}>{hours}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 28,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 7,
  },
  title: {
    color: "#fff",
    fontSize: 25,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    textShadowColor: "rgba(0,0,0,0.78)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  badge: {
    backgroundColor: "#EB8100",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    lineHeight: 11,
    fontFamily: "Inter_600SemiBold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  icon: {
    width: 13,
    height: 13,
    tintColor: "#fff",
  },
  starIcon: {
    width: 13,
    height: 13,
    tintColor: "#FFD000",
  },
  metaText: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 14,
    fontFamily: "Inter_600SemiBold",
    textShadowColor: "rgba(0,0,0,0.72)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

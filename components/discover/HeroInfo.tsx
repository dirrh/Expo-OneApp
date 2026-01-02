import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

type Props = {
  title: string;
  rating: string;
  distance: string;
  hours: string;
};

export function HeroInfo({ title, rating, distance, hours }: Props) {
  return (
    <View style={styles.container}>
      {/* TITLE + BADGE */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Fitness</Text>
        </View>
      </View>

      {/* META */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Image
            source={require("../../images/star.png")}
            style={styles.icon}
          />
          <Text style={styles.metaText}>{rating}</Text>
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
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 14,
    right: 70,
    bottom: 26,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    backgroundColor: "#EB8100",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 14,
  },
  icon: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  metaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BranchCardProps } from "../lib/interfaces";
import BusinessDetail from "../screens/BusinessDetail";
import { Link, useNavigation } from "@react-navigation/native";


export default function BranchCard({
  title,
  image,
  rating,
  distance,
  hours,
  discount,
  moreCount,
  onPress,
}: BranchCardProps) {
  const { width } = useWindowDimensions();
  const imageSize = Math.min(96, Math.max(64, Math.floor(width * 0.18)));
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={()=> {navigation.navigate("BusinessDetail")}}
      style={styles.branchCard}
    >
      {/* IMAGE */}
      <Image
        source={image}
        style={[styles.branchImage, { width: imageSize, height: imageSize }]}
        resizeMode="cover"
      />

      {/* CONTENT */}
      <View style={styles.branchContent}>
        <Text style={styles.branchTitle}>{title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="star" size={14} color="#F5A623" />
          <Text style={styles.metaText}>{rating}</Text>

          <Ionicons name="location-outline" size={14} />
          <Text style={styles.metaText}>{distance}</Text>

          <Ionicons name="time-outline" size={14} />
          <Text style={styles.metaText}>{hours}</Text>
        </View>

        {(discount || moreCount) && (
          <View style={styles.bottomRow}>
            {discount && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{discount}</Text>
              </View>
            )}
            {moreCount && (
              <Text style={styles.moreText}>+{moreCount} more</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  branchCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",

    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    width: "100%",
  },

  branchImage: {
    borderRadius: 14,
    marginRight: 14,
  },

  branchContent: {
    flex: 1,
    justifyContent: "center",
  },

  branchTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
    flexWrap: "wrap",
  },

  metaText: {
    fontSize: 12,
    color: "#4B5563",
    marginRight: 8,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  badge: {
    backgroundColor: "#EB8100",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },

  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  moreText: {
    fontSize: 12,
    color: "#6B7280",
  },
});

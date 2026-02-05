import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import type { DiscoverMapMarker } from "../../lib/interfaces";

type Props = {
  sheetRef: React.RefObject<BottomSheet>;
  snapPoints: string[];
  selectedGroup: { items: DiscoverMapMarker[] } | null;
  categoryIcons: Record<string, any>;
  onClose: () => void;
};

const STAR_ICON = require("../../images/star_black.png");

export default function DiscoverGroupSheet({
  sheetRef,
  snapPoints,
  selectedGroup,
  categoryIcons,
  onClose,
}: Props) {
  if (!selectedGroup) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={(index) => {
        if (index === -1) {
          onClose();
        }
      }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Locations</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color="#111" />
          </TouchableOpacity>
        </View>

        {selectedGroup.items.map((item) => {
          const icon = item.category !== "Multi" ? categoryIcons[item.category] : null;
          return (
            <View key={item.id} style={styles.row}>
              <View style={styles.left}>
                {icon && <Image source={icon} style={styles.categoryIcon} />}
                <Text style={styles.title}>{item.title ?? item.id}</Text>
              </View>
              <View style={styles.right}>
                <Image source={STAR_ICON} style={styles.starIcon} />
                <Text style={styles.ratingText}>
                  {item.ratingFormatted ?? item.rating.toFixed(1)}
                </Text>
              </View>
            </View>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  starIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    color: "#111",
  },
});

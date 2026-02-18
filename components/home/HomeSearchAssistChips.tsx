import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HomeSearchAssistChipsProps {
  title: string;
  chips: string[];
  onPressChip: (chip: string) => void;
  onClear?: () => void;
  clearLabel?: string;
}

function HomeSearchAssistChips({
  title,
  chips,
  onPressChip,
  onClear,
  clearLabel,
}: HomeSearchAssistChipsProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onClear ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onClear}
            accessibilityLabel={clearLabel ?? "Clear"}
          >
            <Text style={styles.clearText}>{clearLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {chips.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={styles.chip}
            activeOpacity={0.85}
            onPress={() => onPressChip(chip)}
            accessibilityLabel={chip}
          >
            <Text style={styles.chipText}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default memo(HomeSearchAssistChips);

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C7C7C",
  },
  chipsRow: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
  },
});

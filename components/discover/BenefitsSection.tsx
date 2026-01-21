import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

type Props = {
  onActivate: () => void;
};

// memo() zabraňuje zbytočným renderom ak sa props nezmenia
export const BenefitsSection = memo(function BenefitsSection({ onActivate }: Props) {
  return (
    <View>
      {/* BENEFIT 1 - Activated */}
      <View style={styles.card}>
        <Text style={styles.title}>20% discount on first entry</Text>
        <Text style={styles.text}>
          Get 20% off your first visit to the fitness center and save on your first workout.
        </Text>

        <TouchableOpacity style={styles.disabledBtn} disabled>
          <Text style={styles.disabledText}>Activated</Text>
        </TouchableOpacity>
      </View>

      {/* BENEFIT 2 - Active */}
      <View style={[styles.card, styles.cardSpacing]}>
        <Text style={styles.title}>1 + 1 protein shake</Text>
        <Text style={styles.text}>
          Buy one protein shake and get a second one for free after your workout.
        </Text>

        <TouchableOpacity style={styles.activeBtn} onPress={onActivate}>
          <Text style={styles.activeText}>Activate Benefit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    padding: 16,
    backgroundColor: "#fff",
  },
  cardSpacing: {
    marginTop: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    lineHeight: 18,
    color: "#000",
    marginBottom: 8,
  },
  text: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    lineHeight: 14,
    color: "rgba(0, 0, 0, 0.5)",
    marginBottom: 16,
  },
  disabledBtn: {
    backgroundColor: "#E4E4E7",
    height: 40,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 17,
    color: "#585858",
    textAlign: "center",
  },
  activeBtn: {
    backgroundColor: "#EB8100",
    height: 40,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  activeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 17,
    color: "#FAFAFA",
    textAlign: "center",
  },
});

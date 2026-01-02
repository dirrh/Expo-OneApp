import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";

type Props = {
  onActivate: () => void;
};

export function BenefitsSection({ onActivate }: Props) {
  return (
    <View>
      {/* BENEFIT 1 */}
      <View style={styles.card}>
        <Text style={styles.title}>20% discount on first entry</Text>
        <Text style={styles.text}>Get 20% off your first visit.</Text>
        <TouchableOpacity style={styles.disabledBtn}>
          <Text style={styles.disabledText}>Activated</Text>
        </TouchableOpacity>
      </View>

      {/* BENEFIT 2 */}
      <View style={[styles.card, styles.cardSpacing]}>
        <Text style={styles.title}>1 + 1 protein shake</Text>
        <Text style={styles.text}>
          Buy one protein shake and get a second one free.
        </Text>
        <TouchableOpacity style={styles.activeBtn} onPress={onActivate}>
          <Text style={styles.activeText}>Activate Benefit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    padding: 20,
    backgroundColor: "#fff",
  },
  cardSpacing: {
    marginTop: 15,
  },
  title: {
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 6,
  },
  text: {
    fontSize: 13,
    marginBottom: 12,
  },
  disabledBtn: {
    backgroundColor: "#E4E4E7",
    paddingVertical: 10,
    borderRadius: 15,
  },
  disabledText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "500",
  },
  activeBtn: {
    backgroundColor: "orange",
    paddingVertical: 10,
    borderRadius: 15,
  },
  activeText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "600",
  },
});

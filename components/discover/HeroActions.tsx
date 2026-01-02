import React from "react";
import { View, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  topInset: number;
  onBack: () => void;
};

export function HeroActions({ topInset, onBack }: Props) {
  return (
    <>
      {/* Sipka späť */}
      <View style={[styles.topLeft, { top: topInset + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={40} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* srdiecko, zvoncek, zdielať */}
      <View style={[styles.topRight, { top: topInset + 25 }]}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="heart-outline" size={22} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="notifications-outline" size={22} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnLast}>
          <Ionicons name="share-social-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topLeft: {
    position: "absolute",
    left: 12,
  },
  topRight: {
    position: "absolute",
    right: 12,
  },
  backBtn: {

    borderRadius: 24,
    padding: 10,        
  },
  actionBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionBtnLast: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});

import React from "react";
import { View, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

type Props = {
  topInset: number;
  onBack: () => void;
};

export function HeroActions({ topInset, onBack }: Props) {
  const iconColor = "#111";
  const iconSize = 16;

  return (
    <>
      {/* Šípka späť */}
      <View style={[styles.topLeft, { top: topInset + 14 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" style={styles.backIcon} />
        </TouchableOpacity>
      </View>

      {/* Srdce, zvonček, zdieľať */}
      <View style={[styles.topRight, { top: topInset + 14 }]}>
        <TouchableOpacity style={styles.actionBtn}>
          <HeartIcon size={iconSize} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <BellIcon size={iconSize} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <ShareIcon size={iconSize} color={iconColor} />
        </TouchableOpacity>
      </View>
    </>
  );
}

type IconProps = { size: number; color: string };

const HeartIcon = ({ size, color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BellIcon = ({ size, color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 00-12 0v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ShareIcon = ({ size, color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7.217 10.907a2.25 2.25 0 10-2.187 3.456l5.218 3.04a2.25 2.25 0 10.79-1.83l-5.218-3.04a2.25 2.25 0 000-1.588l5.218-3.04a2.25 2.25 0 10-.79-1.83l-5.218 3.04z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const styles = StyleSheet.create({
  topLeft: {
    position: "absolute",
    left: 16,
  },
  topRight: {
    position: "absolute",
    right: 16,
    gap: 6,
  },
  backBtn: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  backIcon: {
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionBtn: {
    width: 30,
    height: 30,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

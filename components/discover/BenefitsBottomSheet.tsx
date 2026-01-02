import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import BottomSheet from "@gorhom/bottom-sheet";

type Props = {
  sheetRef: React.RefObject<BottomSheet>;
  snapPoints: string[];
  onLogin: () => void;
};

export function BenefitsBottomSheet({
  sheetRef,
  snapPoints,
  onLogin,
}: Props) {
  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
    >
      <View style={styles.container}>
        <Image
          source={require("../../images/diamond.png")}
          style={styles.image}
        />

        <Text style={styles.title}>
          Sign in to activate this benefit
        </Text>

        <Text style={styles.subtitle}>
          You need an account to redeem and track your benefits
        </Text>

        {/* SIGN IN */}
        <TouchableOpacity style={styles.loginBtn} onPress={onLogin}>
          <Text style={styles.loginText}>Sign in</Text>
        </TouchableOpacity>

        {/* NO THANKS */}
        <TouchableOpacity onPress={() => sheetRef.current?.close()}>
          <Text style={styles.noThanks}>No thanks</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: "center",
  },

  image: {
    marginBottom: 12,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 16,
  },

  loginBtn: {
    backgroundColor: "#000",
    width: 100,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  loginText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },

  noThanks: {
    fontSize: 14,
    color: "#374151",
  },
});

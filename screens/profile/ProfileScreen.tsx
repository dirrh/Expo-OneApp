import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

export default function ProfileScreen() {
  type SubscriptionType = "starter" | "medium" | "gold" | "none";

  const subscription: SubscriptionType = "gold";
  const navigation = useNavigation<any>();

  const { t } = useTranslation();


  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.avatar} />
        <Text style={styles.name}>Peter Novák</Text>
      </View>

      {/* STATY */}
      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t("saved")}</Text>
          <Text style={styles.cardValue}>15 €</Text>
        </View>

        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => navigation.navigate("SubscriptionActivation")}
        >
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              {subscription === "none"
                ? t("inactiveSubscription")
                : t("activeSubscription")}

            </Text>
            <Text style={styles.cardValue}>
              {subscription === "none"
                ? "Activate Now"
                : subscription.charAt(0).toUpperCase() +
                subscription.slice(1)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* MENU */}
      <View style={styles.menu}>
        <MenuItem icon="heart-outline" label={t("favoriteBranches")} onPress={() => navigation.navigate("FavoriteBranches")} />
        <MenuItem icon="settings-outline" label={t("settings")} onPress={() => navigation.navigate("Settings")} />
        <MenuItem icon="help-circle-outline" label={t("faq")} />
        <MenuItem
          icon="alert-circle-outline"
          label={t("reportProblem")}
        />
        <MenuItem
          icon="information-circle-outline"
          label={t("appInformation")}
          last
        />
      </View>
    </SafeAreaView>
  );
}
/* MENU ITEM */

function MenuItem({
  icon,
  label,
  last,
  onPress,
}: {
  icon: any;
  label: string;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.menuItem, last && { borderBottomWidth: 0 }]}
    >
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={20} color="#000" />
        <Text style={styles.menuText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#999" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ddd",
    marginBottom: 12,
  },
  name: {
    paddingLeft: 15,
    fontSize: 18,
    fontWeight: "600",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "600",
  },
  menu: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuText: {
    fontSize: 15,
  },
});
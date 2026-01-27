import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/AuthContext";
import { getFullNameFromEmail } from "../../lib/utils/userUtils";

import BranchCard from "../../components/BranchCard";

export default function ProfileScreen() {
  type SubscriptionType = "starter" | "medium" | "gold" | "none";

  const subscription: SubscriptionType = "gold" as SubscriptionType;
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [menuOpen, setMenuOpen] = useState(false);
  
  // Extrahujeme meno z emailu
  const userName = getFullNameFromEmail(user?.email);

  const handleLogout = async () => {
    Alert.alert(
      t("logOut") || "Logout",
      t("logoutConfirm") || "Are you sure you want to logout?",
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
          onPress: () => setMenuOpen(false),
        },
        {
          text: t("logOut") || "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              setMenuOpen(false);
              // Presmerovanie na Login screen
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            } catch (error: any) {
              console.error("Logout error:", error);
              Alert.alert(
                t("error") || "Error",
                error?.message || t("logoutError") || "Failed to logout"
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { marginTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar} />
          <Text style={styles.name}>{userName}</Text>
        </View>

        {/* HAMBURGER BUTTON */}
        <TouchableOpacity
          onPress={() => setMenuOpen(!menuOpen)}
          style={styles.iconButton}
        >
          <Ionicons name="menu" size={18} color="#111" />
        </TouchableOpacity>
      </View>

      {/* DROPDOWN MENU */}
      {menuOpen && (
        <View style={[styles.dropdown, { top: insets.top + 56, width: Math.min(240, screenWidth - 40) }]}>
          <DropdownItem
            icon="person-outline"
            label={t("userAccount")}
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("UserAccount");
            }}
          />

          <DropdownItem
            icon="card-outline"
            label={t("subscription")}
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("SubscriptionActivation");
            }}
          />

          <DropdownItem
            icon="bookmark-outline"
            label={t("savedLocations")}
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("SavedLocations");
            }}
          />

          <DropdownItem
            icon="language-outline"
            label={t("language")}
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("Language");
            }}
          />

          <DropdownItem
            icon="settings-outline"
            label={t("settings")}
            onPress={() => {
              setMenuOpen(false);
              navigation.navigate("Settings");
            }}
          />

          <View style={styles.divider} />

          <DropdownItem
            icon="log-out-outline"
            label={t("logOut")}
            danger
            onPress={handleLogout}
          />
        </View>
      )}

      {/* STATS */}
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
                ? t("activateNow")
                : subscription.charAt(0).toUpperCase() +
                  subscription.slice(1)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* FAVORITE BRANCHES HEADER */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("favoriteBranches")}</Text>

        {/* FILTER BUTTON */}
        <TouchableOpacity
          onPress={() => console.log("filter pressed")}
          style={styles.iconButton}
        >
          <Ionicons name="options-outline" size={18} color="#111" />
        </TouchableOpacity>
      </View>

      {/* FAVORITE BRANCHES LIST */}
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <BranchCard
          title="365 GYM Nitra"
          image={require("../../assets/365.jpg")}
          rating={4.6}
          distance="1.7 km"
          hours="9:00 - 21:00"
          discount="20% discount on first entry"
          moreCount={2}
          address="Chrenovská 16, Nitra"
          phone="+421 903 776 925"
          email="info@365gym.sk"
          website="https://365gym.sk"
          onPress={(branch) =>
            navigation.navigate("BusinessDetailScreen", { branch })
          }
        />

        <BranchCard
          title="RED ROYAL GYM"
          image={require("../../assets/royal.jpg")}
          rating={4.6}
          distance="1.7 km"
          hours="9:00 - 21:00"
          discount="20% discount on first entry"
          moreCount={3}
          address="Trieda Andreja Hlinku 3, Nitra"
          phone="+421 911 222 333"
          email="info@redroyal.sk"
          website="https://redroyal.sk"
          onPress={(branch) =>
            navigation.navigate("BusinessDetailScreen", { branch })
          }
        />

        <BranchCard
          title="GYM KLUB"
          image={require("../../assets/klub.jpg")}
          rating={4.6}
          distance="1.7 km"
          hours="9:00 - 21:00"
          discount="20% discount on first entry"
          moreCount={5}
          address="Mostná 42, Nitra"
          phone="+421 904 555 666"
          email="kontakt@gymklub.sk"
          website="https://gymklub.sk"
          onPress={(branch) =>
            navigation.navigate("BusinessDetailScreen", { branch })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* DROPDOWN ITEM */
function DropdownItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.dropdownItem}>
      <Ionicons
        name={icon}
        size={18}
        color={danger ? "#DC2626" : "#111"}
      />
      <Text style={[styles.dropdownText, danger && { color: "#DC2626" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ddd",
  },

  name: {
    fontSize: 18,
    fontWeight: "600",
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F1F3", // veľmi jemný outline
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.03,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 2,
          elevation: 1,
        }),
  },

  dropdown: {
    position: "absolute",
    top: 90,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    width: 200,
    zIndex: 100,
    paddingVertical: 6,
  },

  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  dropdownText: {
    fontSize: 14,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 6,
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    minHeight: 90,
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

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
});

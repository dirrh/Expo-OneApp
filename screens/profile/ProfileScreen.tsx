/**
 * ProfileScreen: Profilová obrazovka zobrazuje konto, nastavenia a navigáciu do profilových sekcií.
 *
 * Prečo: Centrálny profilový hub drží account akcie na jednom mieste a zjednodušuje orientáciu.
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  Image,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/AuthContext";
import { getFullNameFromEmail } from "../../lib/utils/userUtils";
import { LOGGED_OUT_UI_STATE_ENABLED } from "../../lib/constants/auth";
import type { UserBooking, UserVisit, BranchData } from "../../lib/interfaces";
import { useFavorites } from "../../lib/FavoritesContext";
import {
  DUMMY_FAVORITES,
  DUMMY_BOOKINGS,
  DUMMY_MOST_VISITED,
  DUMMY_LAST_VISITED,
} from "../../lib/fixtures/profileFixtures";

import SignInPromptSheet from "../../components/SignInPromptSheet";


// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<UserBooking["status"], { label: string; color: string; bg: string }> = {
  confirmed: { label: "Potvrdené", color: "#059669", bg: "#ECFDF5" },
  pending:   { label: "Čaká",      color: "#D97706", bg: "#FFFBEB" },
  cancelled: { label: "Zrušené",   color: "#DC2626", bg: "#FEF2F2" },
  completed: { label: "Hotovo",    color: "#71717A", bg: "#F4F4F5" },
};

// ---------------------------------------------------------------------------
// Unified ActivityCard  –  connected-row style (like search results)
// ---------------------------------------------------------------------------

const CARD_IMG = 76;
const CARD_PH  = 14; // paddingHorizontal
const CARD_PV  = 13; // paddingVertical
const CARD_GAP = 13; // gap between image and content

type ActivityCardVariant =
  | { type: "favorite";    branch: BranchData; offerLabel?: string }
  | { type: "booking";     booking: UserBooking }
  | { type: "mostVisited"; visit: UserVisit }
  | { type: "lastVisited"; visit: UserVisit };

function ActivityCard({
  variant,
  onPress,
}: {
  variant: ActivityCardVariant;
  onPress?: () => void;
}) {
  const branch =
    variant.type === "booking"    ? variant.booking.branch
    : variant.type === "favorite" ? variant.branch
    : variant.visit.branch;

  // Right badge — only for booking and favorite variants
  let badge: React.ReactNode = null;
  if (variant.type === "booking") {
    const cfg = STATUS_CONFIG[variant.booking.status];
    badge = (
      <View style={[acStyles.badge, { backgroundColor: cfg.bg }]}>
        <Text style={[acStyles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    );
  } else if (variant.type === "favorite") {
    badge = (
      <View style={acStyles.favIcon}>
        <Ionicons name="heart" size={12} color="#EB8100" />
      </View>
    );
  }

  // Bottom chip
  let chip: React.ReactNode;
  if (variant.type === "booking") {
    chip = (
      <View style={acStyles.chipGray}>
        <Ionicons name="calendar-outline" size={11} color="#71717A" />
        <Text style={acStyles.chipText} numberOfLines={1}>
          {variant.booking.date}  ·  {variant.booking.time}
        </Text>
      </View>
    );
  } else if (variant.type === "mostVisited") {
    chip = (
      <View style={acStyles.chipOrange}>
        <Ionicons name="flame-outline" size={11} color="#EB8100" />
        <Text style={[acStyles.chipText, { color: "#EB8100" }]}>{variant.visit.visitCount}× navštívené</Text>
      </View>
    );
  } else if (variant.type === "lastVisited") {
    chip = (
      <View style={acStyles.chipGray}>
        <Ionicons name="time-outline" size={11} color="#71717A" />
        <Text style={acStyles.chipText} numberOfLines={1}>{variant.visit.visitedAt}</Text>
      </View>
    );
  } else {
    chip = variant.offerLabel ? (
      <View style={acStyles.chipOrange}>
        <Text style={[acStyles.chipText, { color: "#EB8100" }]} numberOfLines={1}>{variant.offerLabel}</Text>
      </View>
    ) : (
      <View style={acStyles.chipGray}>
        <Ionicons name="heart-outline" size={11} color="#71717A" />
        <Text style={acStyles.chipText}>Uložené miesto</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={acStyles.row}
    >
      <Image source={branch.image} style={acStyles.image} resizeMode="cover" />

      <View style={acStyles.content}>
        <View style={acStyles.topRow}>
          <Text style={acStyles.title} numberOfLines={1}>{branch.title}</Text>
          {badge}
        </View>

        <View style={acStyles.metaRow}>
          <Ionicons name="star" size={11} color="#FFD000" />
          <Text style={acStyles.metaText}>{branch.rating.toFixed(1)}</Text>
          <View style={acStyles.dot} />
          <Ionicons name="location-outline" size={11} color="#9CA3AF" />
          <Text style={acStyles.metaText}>{branch.distance}</Text>
          <View style={acStyles.dot} />
          <Ionicons name="time-outline" size={11} color="#9CA3AF" />
          <Text style={acStyles.metaText}>{branch.hours}</Text>
        </View>

        <View style={acStyles.chipRow}>{chip}</View>
      </View>

      <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

const acStyles = StyleSheet.create({
  // Group container: single border + rounded corners, clips child images
  group: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    overflow: "hidden",
    marginBottom: 20,
  },
  // Hairline separator indented to align with text content (skips image column)
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E4E4E7",
    marginLeft: CARD_PH + CARD_IMG + CARD_GAP,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: CARD_PH,
    paddingVertical: CARD_PV,
    gap: CARD_GAP,
  },
  image: {
    width: CARD_IMG,
    height: CARD_IMG,
    borderRadius: 12,
    backgroundColor: "#E4E4E7",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
  },
  badge: {
    height: 22,
    borderRadius: 999,
    paddingHorizontal: 8,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
  favIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFF4E5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 15,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chipOrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF4E5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  chipGray: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F4F4F5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#71717A",
    lineHeight: 14,
  },
});

// ---------------------------------------------------------------------------
// Tabs – underline style (full-width, 4 equal columns)
// ---------------------------------------------------------------------------

type ProfileTab = "favorites" | "bookings" | "mostVisited" | "lastVisited";

const TABS: { key: ProfileTab; label: string; icon: string }[] = [
  { key: "favorites",   label: "Obľúbené",   icon: "heart-outline" },
  { key: "bookings",    label: "Rezervácie",  icon: "calendar-outline" },
  { key: "mostVisited", label: "Navštívené",  icon: "flame-outline" },
  { key: "lastVisited", label: "Naposledy",   icon: "time-outline" },
];

// ---------------------------------------------------------------------------
// ProfileScreen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  type SubscriptionType = "starter" | "medium" | "gold" | "none";

  const subscription: SubscriptionType = "none" as SubscriptionType;
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const isLoggedOut = LOGGED_OUT_UI_STATE_ENABLED && !user;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const contentPadding = 16;
  const topPadding = Math.max(12, insets.top + 8);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("favorites");
  const { favorites } = useFavorites();

  // Merge: real favorites first, then defaults not yet in favorites (no duplicates)
  const displayFavorites = useMemo(() => {
    const realIds = new Set(favorites.map((b) => b.id));
    const defaults = DUMMY_FAVORITES.filter((b) => !realIds.has(b.id));
    return [...favorites, ...defaults];
  }, [favorites]);

  const userName = user ? getFullNameFromEmail(user.email) : "Martin Novák";

  const handleCloseAuthPrompt = () => setShowAuthPrompt(false);
  const handleOpenAuthPrompt = () => { setMenuOpen(false); setShowAuthPrompt(true); };
  const handleSignIn = () => { setMenuOpen(false); setShowAuthPrompt(false); navigation.navigate("Login"); };

  const handleSubscriptionPress = () => {
    if (isLoggedOut) { handleOpenAuthPrompt(); return; }
    navigation.navigate("SubscriptionActivation");
  };

  const handleLogout = async () => {
    Alert.alert(
      t("logOut") || "Logout",
      t("logoutConfirm") || "Are you sure you want to logout?",
      [
        { text: t("cancel") || "Cancel", style: "cancel", onPress: () => setMenuOpen(false) },
        {
          text: t("logOut") || "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              setMenuOpen(false);
              navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            } catch (error: any) {
              console.error("Logout error:", error);
              Alert.alert(t("error") || "Error", error?.message || t("logoutError") || "Failed to logout");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* DROPDOWN MENU */}
      {menuOpen && (
        <>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
          <View
            style={[
              styles.dropdown,
              { top: topPadding + 56, right: contentPadding, width: Math.min(240, screenWidth - contentPadding * 2) },
            ]}
          >
            <DropdownItem icon="person-outline" label={t("userAccount")}
              onPress={() => { setMenuOpen(false); navigation.navigate("UserAccount"); }} />
            <DropdownItem icon="card-outline" label={t("subscription")}
              onPress={() => { setMenuOpen(false); handleSubscriptionPress(); }} />
            <DropdownItem icon="gift-outline" label={t("Benefits")}
              onPress={() => { setMenuOpen(false); navigation.navigate("Benefits"); }} />
            <DropdownItem icon="bookmark-outline" label={t("savedLocations")}
              onPress={() => { setMenuOpen(false); navigation.navigate("SavedLocations"); }} />
            <DropdownItem icon="language-outline" label={t("language")}
              onPress={() => { setMenuOpen(false); navigation.navigate("Language"); }} />
            <DropdownItem icon="settings-outline" label={t("settings")}
              onPress={() => { setMenuOpen(false); navigation.navigate("Settings"); }} />
            <View style={styles.divider} />
            {isLoggedOut ? (
              <DropdownItem icon="log-in-outline" label={t("signIn")} onPress={handleSignIn} />
            ) : (
              <DropdownItem icon="log-out-outline" label={t("logOut")} danger onPress={handleLogout} />
            )}
          </View>
        </>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingHorizontal: contentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar} />
            <Text style={styles.name}>{userName}</Text>
          </View>
          <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={styles.iconButton}>
            <Ionicons name="menu" size={18} color="#111" />
          </TouchableOpacity>
        </View>

        {/* STATS */}
        <View style={styles.cardsRow}>
          <View style={styles.statCard}>
            <Text style={styles.cardLabel}>{t("saved")}</Text>
            <Text style={styles.cardValue}>0 €</Text>
          </View>
          <TouchableOpacity style={styles.statCard} onPress={handleSubscriptionPress} activeOpacity={0.85}>
            <Text style={styles.cardLabel}>
              {subscription === "none" ? t("inactiveSubscription") : t("activeSubscription")}
            </Text>
            <Text style={styles.cardValue}>
              {subscription === "none"
                ? t("activateNow")
                : subscription.charAt(0).toUpperCase() + subscription.slice(1)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SECTION: Môj prehľad */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Môj prehľad</Text>
        </View>

        {/* UNDERLINE TABS */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={isActive ? "#EB8100" : "#9CA3AF"}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabUnderline, isActive && styles.tabUnderlineActive]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB CONTENT */}
        <View style={styles.tabContent}>

          {activeTab === "favorites" && displayFavorites.map((branch, i) => (
            <ActivityCard
              key={branch.id ?? branch.title}
              variant={{ type: "favorite", branch, offerLabel: branch.offers?.[0] ? t(branch.offers[0]) : undefined }}
              isFirst={i === 0}
              isLast={i === displayFavorites.length - 1}
              onPress={() => navigation.navigate("BusinessDetailScreen", { branch })}
            />
          ))}

          {activeTab === "bookings" && DUMMY_BOOKINGS.map((booking, i) => (
            <ActivityCard
              key={booking.id}
              variant={{ type: "booking", booking }}
              isFirst={i === 0}
              isLast={i === DUMMY_BOOKINGS.length - 1}
              onPress={() => navigation.navigate("BusinessDetailScreen", { branch: booking.branch })}
            />
          ))}

          {activeTab === "mostVisited" && DUMMY_MOST_VISITED.map((visit, i) => (
            <ActivityCard
              key={visit.id}
              variant={{ type: "mostVisited", visit }}
              isFirst={i === 0}
              isLast={i === DUMMY_MOST_VISITED.length - 1}
              onPress={() => navigation.navigate("BusinessDetailScreen", { branch: visit.branch })}
            />
          ))}

          {activeTab === "lastVisited" && DUMMY_LAST_VISITED.map((visit, i) => (
            <ActivityCard
              key={visit.id}
              variant={{ type: "lastVisited", visit }}
              isFirst={i === 0}
              isLast={i === DUMMY_LAST_VISITED.length - 1}
              onPress={() => navigation.navigate("BusinessDetailScreen", { branch: visit.branch })}
            />
          ))}

        </View>
      </ScrollView>

      <SignInPromptSheet
        visible={LOGGED_OUT_UI_STATE_ENABLED && showAuthPrompt}
        onClose={handleCloseAuthPrompt}
        onSignIn={handleSignIn}
      />
    </SafeAreaView>
  );
}

/* DROPDOWN ITEM */
function DropdownItem({
  icon, label, onPress, danger,
}: { icon: any; label: string; onPress?: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.dropdownItem}>
      <Ionicons name={icon} size={18} color={danger ? "#DC2626" : "#111"} />
      <Text style={[styles.dropdownText, danger && { color: "#DC2626" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    paddingBottom: 32,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#D9D9D9",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdown: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    zIndex: 100,
    elevation: 8,
    paddingVertical: 6,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
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
    backgroundColor: "#F0F0F0",
    marginVertical: 6,
  },

  cardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    rowGap: 12,
    marginBottom: 22,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 150,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: 10,
    lineHeight: 13,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  // --- Underline tab bar ---
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    textAlign: "center",
  },
  tabLabelActive: {
    color: "#EB8100",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  tabUnderlineActive: {
    backgroundColor: "#EB8100",
  },

  tabContent: {
    paddingBottom: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});

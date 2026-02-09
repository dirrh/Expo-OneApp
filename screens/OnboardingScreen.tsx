import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { DiscoverCategory, BranchData, PlanId } from "../lib/interfaces";
import BranchCard from "../components/BranchCard";
import SelectableCard from "../components/SelectableCard";
import { useDataSource } from "../lib/data/useDataSource";
import { DUMMY_BRANCH } from "../lib/constants/discover";

/* ---------- KONŠTANTY ---------- */

type OnboardingStep = "services" | "branches" | "subscription";

const STEPS: OnboardingStep[] = ["services", "branches", "subscription"];
const TOTAL_STEPS = STEPS.length;

const CATEGORIES: DiscoverCategory[] = ["Fitness", "Beauty", "Gastro", "Relax"];

const CATEGORY_ICONS: Record<DiscoverCategory, keyof typeof Ionicons.glyphMap> = {
  Fitness: "barbell-outline",
  Beauty: "sparkles-outline",
  Gastro: "restaurant-outline",
  Relax: "water-outline",
};

const CATEGORY_SERVICES: Record<DiscoverCategory, string[]> = {
  Fitness: ["Gym", "Personal Training", "Group Classes", "Yoga"],
  Beauty: ["Haircut", "Manicure", "Pedicure", "Facial", "Massage"],
  Gastro: ["Restaurant", "Cafe", "Fast Food", "Bar"],
  Relax: ["Spa", "Wellness", "Massage", "Sauna"],
};

const SUBSCRIPTION_PLANS: Array<{ id: PlanId; title: string; price: string; popular?: boolean }> = [
  { id: "starter", title: "Starter", price: "5.99" },
  { id: "medium", title: "Medium", price: "9.99", popular: true },
  { id: "gold", title: "Gold", price: "15.99" },
];

/* ---------- KOMPONENT ---------- */

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { getBranches } = useDataSource();

  const [stepIndex, setStepIndex] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<DiscoverCategory>>(new Set());
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / TOTAL_STEPS) * 100;
  const horizontalPadding = Math.min(24, Math.max(16, Math.round(width * 0.06)));
  const contentMaxWidth = 520;
  const contentWidth = Math.min(width - horizontalPadding * 2, contentMaxWidth);
  const branchCardWidth = Math.max(240, Math.min(340, contentWidth));
  const titleFontSize = Math.min(28, Math.max(24, Math.round(width * 0.07)));
  const subtitleFontSize = Math.min(15, Math.max(13, Math.round(width * 0.038)));
  const gridGap = Math.min(16, Math.max(10, Math.round(contentWidth * 0.04)));
  const categoryCardWidth = (contentWidth - gridGap) / 2;
  const canContinue = step !== "services" || selectedCategories.size > 0;

  const selectedCategoriesArray = Array.from(selectedCategories);
  const categoriesText = selectedCategoriesArray.map((c) => t(c)).join(", ");


  useEffect(() => {
    if (step === "branches" && selectedCategories.size > 0) {
      loadBranches();
    }
  }, [step, selectedCategories]);

  /* ---------- LOGIKA ---------- */

  const loadBranches = async () => {
    try {
      const allBranches = await getBranches();
      setBranches(
        allBranches.filter((b) =>
          selectedCategories.has(b.category as DiscoverCategory)
        )
      );
    } catch (error) {
      console.error("Error loading branches:", error);
    }
  };

  const toggleCategory = (category: DiscoverCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  };

  const nextStep = () => {
    if (stepIndex < TOTAL_STEPS - 1) {
      setStepIndex((i) => i + 1);
    } else {
      finishOnboarding();
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem("onboarding_completed", "true");

    if (selectedCategories.size > 0) {
      await AsyncStorage.setItem(
        "user_preferred_categories",
        JSON.stringify(Array.from(selectedCategories))
      );
    }

    navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
  };

  const handleContinue = () => {
    if (step === "services" && selectedCategories.size === 0) {
      finishOnboarding();
    } else {
      nextStep();
    }
  };

  const handleSkip = () => {
    step === "branches" ? prevStep() : finishOnboarding();
  };

  /* ---------- UI ---------- */

  const sectionStyle = {
    width: "100%" as const,
    maxWidth: contentMaxWidth,
    alignSelf: "center" as const,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* PROGRESS */}
      <View
        style={[
          styles.progressContainer,
          { paddingHorizontal: horizontalPadding, paddingTop: Math.max(16, insets.top + 8) },
        ]}
      >
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {t("onboardingStep")} {stepIndex + 1} / {TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------- SERVICES STEP ---------- */}
        {step === "services" && (
          <View style={sectionStyle}>
            <Text style={[styles.title, { fontSize: titleFontSize }]}>{t("onboardingTitle")}</Text>
            <Text
              style={[
                styles.subtitle,
                { fontSize: subtitleFontSize, lineHeight: Math.round(subtitleFontSize * 1.45) },
              ]}
            >
              {t("onboardingSubtitle")}
            </Text>

            <View style={[styles.categoriesContainer, { gap: gridGap }]}>
              {CATEGORIES.map((category) => {
                const isSelected = selectedCategories.has(category);

                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryCard,
                      { width: categoryCardWidth, height: categoryCardWidth * 0.85 },
                      isSelected && styles.categoryCardSelected,
                    ]}
                    onPress={() => toggleCategory(category)}
                  >
                    <Ionicons
                      name={CATEGORY_ICONS[category]}
                      size={40}
                      color={isSelected ? "#f57c00" : "#666"}
                    />

                    <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                      {t(category)}
                    </Text>

                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedCategoriesArray.length > 0 && (
              <View style={styles.servicesList}>
                {selectedCategoriesArray.map((category) => (
                  <View key={category} style={styles.servicesCategory}>
                    <Text style={styles.servicesCategoryTitle}>{t(category)}</Text>

                    <View style={styles.servicesRow}>
                      {CATEGORY_SERVICES[category].map((service) => (
                        <View key={service} style={styles.serviceTag}>
                          <Text style={styles.serviceTagText}>{t(service)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ---------- BRANCHES STEP ---------- */}
        {step === "branches" && (
          <View style={sectionStyle}>
            <Text style={[styles.title, { fontSize: titleFontSize }]}>{t("onboardingBranchesTitle")}</Text>
            <Text
              style={[
                styles.subtitle,
                { fontSize: subtitleFontSize, lineHeight: Math.round(subtitleFontSize * 1.45) },
              ]}
            >
              {t("onboardingBranchesSubtitle", {
                count: branches.length,
                categories: categoriesText,
              })}
            </Text>

            {branches.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>{t("onboardingNoBranches")}</Text>
              </View>
            ) : (
              <View style={styles.branchesContainer}>
                {branches.slice(0, 6).map((branch) => (
                  <View key={branch.id || branch.title} style={{ width: branchCardWidth }}>
                    <BranchCard
                      {...branch}
                      onPress={() =>
                        navigation.navigate("BusinessDetailScreen", { branch: DUMMY_BRANCH })
                      }
                    />
                  </View>
                ))}

                {branches.length > 6 && (
                  <Text style={styles.moreBranches}>
                    {t("onboardingMoreBranches", { count: branches.length - 6 })}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ---------- SUBSCRIPTION STEP ---------- */}
        {step === "subscription" && (
          <View style={sectionStyle}>
            <Text style={[styles.title, { fontSize: titleFontSize }]}>
              {t("onboardingSubscriptionTitle")}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { fontSize: subtitleFontSize, lineHeight: Math.round(subtitleFontSize * 1.45) },
              ]}
            >
              {t("onboardingSubscriptionSubtitle")}
            </Text>

            {SUBSCRIPTION_PLANS.map((plan) => (
              <SelectableCard
                key={plan.id}
                id={plan.id}
                title={t(plan.id)}
                price={plan.price}
                description={t(`${plan.id}Desc`)}
                popular={plan.popular}
                selected={selectedPlan === plan.id}
                onPress={setSelectedPlan}
              />
            ))}

            <Text style={styles.subscriptionNote}>{t("onboardingSubscriptionNote")}</Text>
          </View>
        )}
      </ScrollView>

      {/* ---------- BOTTOM NAV ---------- */}
      <View
        style={[
          styles.bottomContainer,
          { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(12, insets.bottom + 8) },
        ]}
      >
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>
            {step === "subscription" ? t("skip") : t("back")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueText}>
            {step === "subscription" ? t("finish") : t("continue")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  progressContainer: {
    paddingBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#eee",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#f57c00",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: "#000",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 24,
    lineHeight: 22,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
  },
  categoryCard: {
    borderWidth: 2,
    borderColor: "#eee",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    position: "relative",
  },
  categoryCardSelected: {
    borderColor: "#f57c00",
    backgroundColor: "#FFF7ED",
  },
  categoryIconContainer: {
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  categoryTextSelected: {
    color: "#f57c00",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f57c00",
    alignItems: "center",
    justifyContent: "center",
  },
  servicesList: {
    marginTop: 8,
  },
  servicesCategory: {
    marginBottom: 16,
  },
  servicesCategoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#000",
  },
  servicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceTag: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  serviceTagText: {
    fontSize: 13,
    color: "#666",
  },
  branchesContainer: {
    gap: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: "#999",
    marginTop: 16,
  },
  moreBranches: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  subscriptionNote: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
  bottomContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  continueButton: {
    flex: 2,
    backgroundColor: "#f57c00",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});

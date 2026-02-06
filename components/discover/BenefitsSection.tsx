import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  onActivate: () => void;
};

type BenefitStatus = "activated" | "available" | "locked" | "expired";

type Benefit = {
  id: string;
  title: string;
  description: string;
  status: BenefitStatus;
};

const DUMMY_BENEFITS: Benefit[] = [
  { id: "benefit-1", title: "benefit1Title", description: "benefit1Desc", status: "activated" },
  { id: "benefit-2", title: "benefit2Title", description: "benefit2Desc", status: "available" },
  { id: "benefit-3", title: "benefit3Title", description: "benefit3Desc", status: "available" },
  { id: "benefit-4", title: "benefit4Title", description: "benefit4Desc", status: "available" },
  { id: "benefit-5", title: "benefit5Title", description: "benefit5Desc", status: "available" },
  { id: "benefit-6", title: "benefit6Title", description: "benefit6Desc", status: "locked" },
  { id: "benefit-7", title: "benefit7Title", description: "benefit7Desc", status: "available" },
  { id: "benefit-8", title: "benefit8Title", description: "benefit8Desc", status: "available" },
  { id: "benefit-9", title: "benefit9Title", description: "benefit9Desc", status: "expired" },
];

const CTA_LABEL_KEYS: Record<BenefitStatus, string> = {
  activated: "statusActivated",
  available: "statusActivateBenefit",
  locked: "statusUpgradeToUnlock",
  expired: "statusExpired",
};

const styles = StyleSheet.create({
  list: {
    paddingBottom: 10,
  },
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
    fontSize: 12,
    lineHeight: 16,
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

// memo() zabranuje zbytocnym renderom ak sa props nezmenia
export const BenefitsSection = memo(function BenefitsSection({ onActivate }: Props) {
  const { t } = useTranslation();
  
  return (
    <View style={styles.list}>
      {DUMMY_BENEFITS.map((benefit, index) => {
        const isActive = benefit.status === "available";
        const isDisabled = benefit.status !== "available";

        return (
          <View key={benefit.id} style={[styles.card, index > 0 && styles.cardSpacing]}>
            <Text style={styles.title}>{t(benefit.title)}</Text>
            <Text style={styles.text}>{t(benefit.description)}</Text>

            <TouchableOpacity
              style={isActive ? styles.activeBtn : styles.disabledBtn}
              onPress={isActive ? onActivate : undefined}
              disabled={isDisabled}
            >
              <Text style={isActive ? styles.activeText : styles.disabledText}>
                {t(CTA_LABEL_KEYS[benefit.status])}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
});

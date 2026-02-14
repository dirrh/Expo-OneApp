import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  type ImageSourcePropType,
} from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  onActivate: () => void;
  limit?: number;
  onShowAll?: () => void;
};

type BenefitStatus = "activated" | "available" | "locked" | "expired";

type Benefit = {
  id: string;
  title: string;
  description: string;
  status: BenefitStatus;
  image: ImageSourcePropType;
};

const DUMMY_BENEFITS: Benefit[] = [
  {
    id: "benefit-1",
    title: "benefit1Title",
    description: "benefit1Desc",
    status: "activated",
    image: require("../../assets/benefits/benefit_1.png"),
  },
  {
    id: "benefit-2",
    title: "benefit2Title",
    description: "benefit2Desc",
    status: "available",
    image: require("../../assets/benefits/benefit_2.png"),
  },
  {
    id: "benefit-3",
    title: "benefit3Title",
    description: "benefit3Desc",
    status: "available",
    image: require("../../assets/benefits/benefit_3.png"),
  },
  {
    id: "benefit-4",
    title: "benefit4Title",
    description: "benefit4Desc",
    status: "available",
    image: require("../../assets/benefits/benefit_4.png"),
  },
  {
    id: "benefit-5",
    title: "benefit5Title",
    description: "benefit5Desc",
    status: "available",
    image: require("../../assets/benefits/benefit_5.png"),
  },
  {
    id: "benefit-6",
    title: "benefit6Title",
    description: "benefit6Desc",
    status: "locked",
    image: require("../../assets/benefits/benefit_6.png"),
  },
  {
    id: "benefit-7",
    title: "benefit7Title",
    description: "benefit7Desc",
    status: "available",
    image: require("../../assets/benefits/benefit_7.png"),
  },
  {
    id: "benefit-8",
    title: "benefit8Title",
    description: "benefit8Desc",
    status: "available",
    image: require("../../assets/benefits/benefit_8.png"),
  },
  {
    id: "benefit-9",
    title: "benefit9Title",
    description: "benefit9Desc",
    status: "expired",
    image: require("../../assets/benefits/benefit_9.png"),
  },
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
    minHeight: 144,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    padding: 16,
    backgroundColor: "#fff",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }),
  },
  cardSpacing: {
    marginTop: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  visual: {
    width: 104.48,
    height: 104.48,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#D9D9D9",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  visualImage: {
    width: "74%",
    height: "74%",
  },
  content: {
    flex: 1,
    marginLeft: 18.43,
    minHeight: 104.48,
    justifyContent: "space-between",
  },
  copyWrap: {
    marginBottom: 8,
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
  },
  btnBase: {
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  disabledBtn: {
    backgroundColor: "#E4E4E7",
  },
  activeBtn: {
    backgroundColor: "#EB8100",
  },
  disabledText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 17,
    color: "#585858",
    textAlign: "center",
  },
  activeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 17,
    color: "#FAFAFA",
    textAlign: "center",
  },
  showAllWrapper: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 6,
  },
  showAllText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 15,
    color: "#7C7C7C",
  },
});

// memo() zabranuje zbytocnym renderom ak sa props nezmenia
export const BenefitsSection = memo(function BenefitsSection({
  onActivate,
  limit,
  onShowAll,
}: Props) {
  const { t } = useTranslation();
  const showAllRaw = t("showAll");
  const showAllLabel =
    showAllRaw === "showAll" || showAllRaw === "Show All" ? "Show all" : showAllRaw;
  const visibleBenefits = typeof limit === "number" ? DUMMY_BENEFITS.slice(0, limit) : DUMMY_BENEFITS;
  const canShowMore = typeof limit === "number" && DUMMY_BENEFITS.length > limit && Boolean(onShowAll);

  return (
    <View style={styles.list}>
      {visibleBenefits.map((benefit, index) => {
        const isAvailable = benefit.status === "available";
        const isDisabled = benefit.status !== "available";
        const buttonStyle = isAvailable ? styles.activeBtn : styles.disabledBtn;
        const buttonTextStyle = isAvailable ? styles.activeText : styles.disabledText;

        return (
          <View key={benefit.id} style={[styles.card, index > 0 && styles.cardSpacing]}>
            <View style={styles.cardRow}>
              <View style={styles.visual}>
                <Image source={benefit.image} style={styles.visualImage} resizeMode="contain" />
              </View>

              <View style={styles.content}>
                <View style={styles.copyWrap}>
                  <Text style={styles.title}>{t(benefit.title)}</Text>
                  <Text style={styles.text}>{t(benefit.description)}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.btnBase, buttonStyle]}
                  onPress={isAvailable ? onActivate : undefined}
                  disabled={isDisabled}
                  activeOpacity={0.85}
                >
                  <Text style={buttonTextStyle} numberOfLines={1}>
                    {t(CTA_LABEL_KEYS[benefit.status])}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}

      {canShowMore && (
        <TouchableOpacity style={styles.showAllWrapper} onPress={onShowAll}>
          <Text style={styles.showAllText}>{showAllLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, type ImageSourcePropType } from "react-native";
import { useTranslation } from "react-i18next";

import { BenefitsSection } from "./BenefitsSection";
import { CategoryMenuSection } from "./CategoryMenuSection";
import { NewsSection } from "./NewsSection";

type Props = {
  title: string;
  branchImage?: ImageSourcePropType;
  category?: string;
  onActivateBenefit: () => void;
  onShowAllBenefits: () => void;
};

const resolveLabel = (translated: string, key: string, fallback: string): string =>
  translated === key ? fallback : translated;

export const HomeSection = memo(function HomeSection({
  title,
  branchImage,
  category,
  onActivateBenefit,
  onShowAllBenefits,
}: Props) {
  const { t } = useTranslation();

  const bestOffersLabel = useMemo(
    () => resolveLabel(t("bestOffers"), "bestOffers", "Best offers"),
    [t]
  );
  const latestFeedLabel = useMemo(
    () => resolveLabel(t("latestFeed"), "latestFeed", "Latest feed"),
    [t]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{bestOffersLabel}</Text>
      <BenefitsSection onActivate={onActivateBenefit} limit={2} onShowAll={onShowAllBenefits} />

      <CategoryMenuSection category={category} />

      <Text style={styles.headingLatest}>{latestFeedLabel}</Text>
      <NewsSection title={title} branchImage={branchImage} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  heading: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    lineHeight: 24,
    color: "#000",
    marginBottom: 14,
  },
  headingLatest: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    lineHeight: 24,
    color: "#000",
    marginTop: 6,
    marginBottom: 10,
  },
});

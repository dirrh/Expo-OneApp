import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useTranslation } from "react-i18next";

import type { BranchMenuItem, BranchMenuLabelMode } from "../../lib/interfaces";

type Props = {
  menuItems?: BranchMenuItem[];
  labelMode?: BranchMenuLabelMode;
};

const resolveLabel = (translated: string, key: string, fallback: string): string =>
  translated === key ? fallback : translated;

/**
 * BusinessMenuSection: Textová sekcia Menu/Cenník so zoznamom položiek bez obrázkov.
 *
 * Prečo: Jednoduchý zoznam je čitateľný, rýchly na skenovanie a funguje konzistentne naprieč kategóriami.
 */
export const BusinessMenuSection = memo(function BusinessMenuSection({
  menuItems,
  labelMode = "menu",
}: Props) {
  const { t } = useTranslation();

  const headingKey = labelMode === "menu" ? "businessMenuTitle" : "businessPricelistTitle";
  const headingFallback = labelMode === "menu" ? "Menu" : "Cenník";
  const heading = useMemo(
    () => resolveLabel(t(headingKey), headingKey, headingFallback),
    [headingKey, headingFallback, t]
  );

  const emptyLabel = useMemo(
    () => resolveLabel(t("businessMenuEmpty"), "businessMenuEmpty", "Žiadne položky."),
    [t]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{heading}</Text>

      <View style={styles.card}>
        {!menuItems || menuItems.length === 0 ? (
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        ) : (
          menuItems.map((item, index) => {
            const isLast = index === menuItems.length - 1;
            const nameText = resolveLabel(t(item.name), item.name, item.name);
            const detailsText = item.details
              ? resolveLabel(t(item.details), item.details, item.details)
              : null;

            return (
              <View key={item.id} style={[styles.row, !isLast && styles.rowDivider]}>
                <View style={styles.rowLeft}>
                  <Text style={styles.name} numberOfLines={2}>{nameText}</Text>
                  {detailsText ? (
                    <Text style={styles.details} numberOfLines={2}>{detailsText}</Text>
                  ) : null}
                </View>
                {item.price ? (
                  <View style={styles.priceWrap}>
                    <Text style={styles.price} numberOfLines={1}>{item.price}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
});

const SEPARATOR = Platform.OS === "android" ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  heading: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    lineHeight: 24,
    color: "#000",
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: SEPARATOR,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowDivider: {
    borderBottomWidth: SEPARATOR,
    borderBottomColor: "#E4E4E7",
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
    color: "#111827",
  },
  details: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: "#71717A",
  },
  priceWrap: {
    flexShrink: 0,
    backgroundColor: "#FFF4E5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  price: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    lineHeight: 17,
    color: "#EB8100",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#71717A",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});

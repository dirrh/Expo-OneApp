import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useTranslation } from "react-i18next";

import type { BranchMenuItem, BranchMenuLabelMode } from "../../lib/interfaces";

type Props = {
  menuItems?: BranchMenuItem[];
  labelMode?: BranchMenuLabelMode;
};

type MenuGroup = {
  id: string;
  title?: string;
  items: BranchMenuItem[];
};

const resolveLabel = (translated: string, key: string, fallback: string): string =>
  translated === key ? fallback : translated;

const CARD_SHADOW =
  Platform.OS === "web"
    ? { boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)" }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
      };

const SEPARATOR = Platform.OS === "android" ? StyleSheet.hairlineWidth : 0.5;

/**
 * BusinessMenuSection: Sekcia menu/cennika rozdelena na bloky (nadpis + karta) podla navrhu detailu prevadzky.
 *
 * Preco: Skupinove karty su citatelnejsie, skratia skenovanie cien a drzia konzistentny vzhlad napriec typmi prevadzok.
 */
export const BusinessMenuSection = memo(function BusinessMenuSection({
  menuItems,
  labelMode = "menu",
}: Props) {
  const { t } = useTranslation();

  const headingKey = labelMode === "menu" ? "businessMenuTitle" : "businessPricelistTitle";
  const headingFallback = labelMode === "menu" ? "Menu" : "Prices";
  const heading = useMemo(
    () => resolveLabel(t(headingKey), headingKey, headingFallback),
    [headingKey, headingFallback, t]
  );

  const emptyLabel = useMemo(
    () => resolveLabel(t("businessMenuEmpty"), "businessMenuEmpty", "Ziadne polozky."),
    [t]
  );

  const groupedMenuItems = useMemo<MenuGroup[]>(() => {
    if (!menuItems || menuItems.length === 0) {
      return [];
    }

    const groups: MenuGroup[] = [];
    const indexByKey = new Map<string, number>();

    menuItems.forEach((item, itemIndex) => {
      const rawGroupTitle = item.groupTitle?.trim();
      const groupKey = rawGroupTitle && rawGroupTitle.length > 0 ? rawGroupTitle : "__default";
      const translatedGroupTitle = rawGroupTitle
        ? resolveLabel(t(rawGroupTitle), rawGroupTitle, rawGroupTitle)
        : undefined;

      const existingGroupIndex = indexByKey.get(groupKey);
      if (existingGroupIndex === undefined) {
        indexByKey.set(groupKey, groups.length);
        groups.push({
          id: `group-${groups.length + 1}-${itemIndex + 1}`,
          title: translatedGroupTitle,
          items: [item],
        });
        return;
      }

      groups[existingGroupIndex].items.push(item);
    });

    return groups;
  }, [menuItems, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{heading}</Text>

      {!menuItems || menuItems.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      ) : (
        <View style={styles.groupList}>
          {groupedMenuItems.map((group) => (
            <View key={group.id} style={styles.groupBlock}>
              {group.title ? <Text style={styles.groupTitle}>{group.title}</Text> : null}

              <View style={styles.card}>
                {group.items.map((item, index) => {
                  const nameText = resolveLabel(t(item.name), item.name, item.name);

                  return (
                    <View key={`${group.id}-${item.id}-${index}`} style={[styles.row, index > 0 && styles.rowSpacing]}>
                      <Text style={styles.name} numberOfLines={1}>
                        {nameText}
                      </Text>
                      {item.price ? (
                        <Text style={styles.price} numberOfLines={1}>
                          {item.price}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
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
    color: "#000000",
    marginBottom: 12,
  },
  groupList: {
    gap: 20,
  },
  groupBlock: {
    gap: 10,
  },
  groupTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 18,
    color: "#000000",
  },
  card: {
    borderRadius: 20,
    borderWidth: SEPARATOR,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
    ...CARD_SHADOW,
  },
  row: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowSpacing: {
    marginTop: 22,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(0, 0, 0, 0.5)",
  },
  price: {
    flexShrink: 0,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 17,
    color: "#000000",
    textAlign: "right",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#71717A",
  },
});

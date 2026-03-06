import React, { memo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";

export interface TabMenuItem {
  key: string;
  labelKey?: string;
  fallbackLabel?: string;
}

type Props = {
  items: TabMenuItem[];
  active: string;
  onChange: (val: string) => void;
  width?: number;
  minItemWidth?: number;
};

const FALLBACK_LABELS: Record<string, string> = {
  home: "Home",
  benefits: "Benefits",
  menu: "Menu",
  pricelist: "Prices",
  info: "Info",
  reviews: "Reviews",
};

const resolveLabel = (
  t: (value: string) => string,
  item: TabMenuItem
) => {
  const labelKey = item.labelKey ?? `tab_${item.key}`;
  const translated = t(labelKey);
  if (translated !== labelKey) {
    return translated;
  }

  return item.fallbackLabel ?? FALLBACK_LABELS[item.key] ?? item.key;
};

/**
 * TabMenu: Horizontálne menu tabov pre detail prevádzky s aktívnym stavom a prepínaním sekcií.
 *
 * Prečo: Jednotné prepínanie sekcií udrží orientáciu aj pri väčšom počte tabov.
 */
export const TabMenu = memo(function TabMenu({
  items,
  active,
  onChange,
  width,
  minItemWidth = 82,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.frame}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => {
          const isActive = active === item.key;
          const label = resolveLabel(t, item);
          const hasExplicitWidth = typeof width === "number" && width > 0;

          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onChange(item.key)}
              style={[
                styles.tab,
                !isActive && styles.tabIdle,
                hasExplicitWidth ? { width } : { minWidth: minItemWidth },
                isActive && styles.tabActive,
              ]}
              activeOpacity={0.85}
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    height: 50,
    borderRadius: 22,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    justifyContent: "center",
    overflow: "hidden",
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 5,
    gap: 6,
  },
  tab: {
    height: 40,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  tabIdle: {
    backgroundColor: "#FFFFFF",
  },
  tabActive: {
    backgroundColor: "#EB8100",
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 16,
    color: "#3F3F46",
    textAlign: "center",
  },
  tabTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});

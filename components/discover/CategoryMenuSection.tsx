import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Image, type ImageSourcePropType } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  category?: string;
};

type MenuCategory = "Gastro" | "Relax" | "Beauty";

type MenuItem = {
  id: string;
  nameKey: string;
  nameFallback: string;
  image: ImageSourcePropType;
  price: string;
};

type MenuGroup = {
  id: string;
  titleKey: string;
  titleFallback: string;
  items: MenuItem[];
};

type MenuConfig = {
  sectionTitleKey: string;
  sectionTitleFallback: string;
  ctaKey: string;
  ctaFallback: string;
  groups: MenuGroup[];
};

const resolveLabel = (translated: string, key: string, fallback: string): string =>
  translated === key ? fallback : translated;

const normalizeCategory = (value?: string): MenuCategory | null => {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();

  if (key === "gastro") return "Gastro";
  if (key === "relax") return "Relax";
  if (key === "beauty") return "Beauty";
  return null;
};

const MENU_BY_CATEGORY: Record<MenuCategory, MenuConfig> = {
  Gastro: {
    sectionTitleKey: "businessMenuTitle",
    sectionTitleFallback: "Menu",
    ctaKey: "businessShowFullMenu",
    ctaFallback: "Show full menu",
    groups: [
      {
        id: "g-mains",
        titleKey: "businessMenuGroupMains",
        titleFallback: "Mains",
        items: [
          {
            id: "g-1",
            nameKey: "businessMenuGastroItem3Name",
            nameFallback: "Ramen miso",
            image: require("../../assets/gallery/gastro/gastro_1.jpg"),
            price: "6.90 EUR",
          },
          {
            id: "g-2",
            nameKey: "businessMenuGastroItem2Name",
            nameFallback: "Poke bowl salmon",
            image: require("../../assets/gallery/gastro/gastro_2.jpg"),
            price: "8.20 EUR",
          },
          {
            id: "g-3",
            nameKey: "businessMenuGastroItem1Name",
            nameFallback: "Sushi set premium",
            image: require("../../assets/gallery/gastro/gastro_3.jpg"),
            price: "11.90 EUR",
          },
        ],
      },
      {
        id: "g-salads",
        titleKey: "businessMenuGroupSalads",
        titleFallback: "Salads",
        items: [
          {
            id: "g-4",
            nameKey: "businessMenuGastroItem4Name",
            nameFallback: "Dessert combo",
            image: require("../../assets/gallery/gastro/gastro_4.jpg"),
            price: "6.90 EUR",
          },
          {
            id: "g-5",
            nameKey: "businessMenuGastroItem2Name",
            nameFallback: "Poke bowl salmon",
            image: require("../../assets/gallery/gastro/gastro_1.jpg"),
            price: "7.40 EUR",
          },
        ],
      },
    ],
  },
  Relax: {
    sectionTitleKey: "businessPricelistTitle",
    sectionTitleFallback: "Price list",
    ctaKey: "businessShowFullPricelist",
    ctaFallback: "Show full price list",
    groups: [
      {
        id: "r-massage",
        titleKey: "businessPriceGroupMassage",
        titleFallback: "Massages",
        items: [
          {
            id: "r-1",
            nameKey: "businessMenuRelaxItem1Name",
            nameFallback: "Classic massage",
            image: require("../../assets/gallery/relax/relax_1.jpg"),
            price: "39 EUR",
          },
          {
            id: "r-2",
            nameKey: "businessMenuRelaxItem4Name",
            nameFallback: "Aroma ritual",
            image: require("../../assets/gallery/relax/relax_2.jpg"),
            price: "24 EUR",
          },
          {
            id: "r-3",
            nameKey: "businessMenuRelaxItem2Name",
            nameFallback: "Sauna entry",
            image: require("../../assets/gallery/relax/relax_3.jpg"),
            price: "18 EUR",
          },
        ],
      },
      {
        id: "r-wellness",
        titleKey: "businessPriceGroupWellness",
        titleFallback: "Wellness",
        items: [
          {
            id: "r-4",
            nameKey: "businessMenuRelaxItem3Name",
            nameFallback: "Wellness pass",
            image: require("../../assets/gallery/relax/relax_4.jpg"),
            price: "29 EUR",
          },
          {
            id: "r-5",
            nameKey: "businessMenuRelaxItem2Name",
            nameFallback: "Sauna entry",
            image: require("../../assets/gallery/relax/relax_1.jpg"),
            price: "20 EUR",
          },
        ],
      },
    ],
  },
  Beauty: {
    sectionTitleKey: "businessPricelistTitle",
    sectionTitleFallback: "Price list",
    ctaKey: "businessShowFullPricelist",
    ctaFallback: "Show full price list",
    groups: [
      {
        id: "b-hair",
        titleKey: "businessPriceGroupHair",
        titleFallback: "Hair",
        items: [
          {
            id: "b-1",
            nameKey: "businessMenuBeautyItem1Name",
            nameFallback: "Haircut + styling",
            image: require("../../assets/gallery/beauty/beauty_1.jpg"),
            price: "26 EUR",
          },
          {
            id: "b-2",
            nameKey: "businessMenuBeautyItem4Name",
            nameFallback: "Brows and lashes",
            image: require("../../assets/gallery/beauty/beauty_2.jpg"),
            price: "29 EUR",
          },
          {
            id: "b-3",
            nameKey: "businessMenuBeautyItem3Name",
            nameFallback: "Facial treatment",
            image: require("../../assets/gallery/beauty/beauty_3.jpg"),
            price: "35 EUR",
          },
        ],
      },
      {
        id: "b-nails",
        titleKey: "businessPriceGroupNailsSkin",
        titleFallback: "Nails & skin",
        items: [
          {
            id: "b-4",
            nameKey: "businessMenuBeautyItem2Name",
            nameFallback: "Gel manicure",
            image: require("../../assets/gallery/beauty/beauty_4.jpg"),
            price: "24 EUR",
          },
          {
            id: "b-5",
            nameKey: "businessMenuBeautyItem3Name",
            nameFallback: "Facial treatment",
            image: require("../../assets/gallery/beauty/beauty_1.jpg"),
            price: "32 EUR",
          },
        ],
      },
    ],
  },
};

export const CategoryMenuSection = memo(function CategoryMenuSection({ category }: Props) {
  const { t } = useTranslation();

  const config = useMemo(() => {
    const normalized = normalizeCategory(category);
    if (!normalized) {
      return null;
    }
    return MENU_BY_CATEGORY[normalized];
  }, [category]);

  if (!config) {
    return null;
  }

  const sectionTitle = resolveLabel(
    t(config.sectionTitleKey),
    config.sectionTitleKey,
    config.sectionTitleFallback
  );
  const ctaLabel = resolveLabel(t(config.ctaKey), config.ctaKey, config.ctaFallback);

  return (
    <View style={styles.container}>
      <View style={styles.separatorTop} />
      <Text style={styles.heading}>{sectionTitle}</Text>

      <View style={styles.list}>
        {config.groups.map((group, groupIndex) => {
          const groupTitle = resolveLabel(t(group.titleKey), group.titleKey, group.titleFallback);

          return (
            <View key={group.id} style={groupIndex > 0 ? styles.groupSpacing : null}>
              <Text style={styles.groupTitle}>{groupTitle}</Text>

              {group.items.map((item, itemIndex) => {
                const itemName = resolveLabel(t(item.nameKey), item.nameKey, item.nameFallback);

                return (
                  <View key={item.id} style={[styles.menuRow, itemIndex > 0 && styles.menuRowSpacing]}>
                    <View style={styles.menuRowStart}>
                      <Image source={item.image} style={styles.menuImage} resizeMode="cover" />
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {itemName}
                      </Text>
                    </View>
                    <Text style={styles.priceText} numberOfLines={1}>
                      {item.price}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <Text style={styles.showAllText}>{ctaLabel}</Text>
      <View style={styles.separatorBottom} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 2,
    marginBottom: 10,
  },
  separatorTop: {
    height: 1,
    backgroundColor: "#E4E4E7",
    marginTop: 2,
    marginBottom: 22,
  },
  separatorBottom: {
    height: 1,
    backgroundColor: "#E4E4E7",
    marginTop: 14,
  },
  heading: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    lineHeight: 24,
    color: "#000",
    marginBottom: 12,
  },
  list: {
    paddingBottom: 0,
  },
  groupSpacing: {
    marginTop: 14,
  },
  groupTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 18,
    color: "#000",
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
  },
  menuRowSpacing: {
    marginTop: 8,
  },
  menuRowStart: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 12,
    gap: 14,
  },
  menuImage: {
    width: 53.91,
    height: 53.91,
    borderRadius: 999,
    backgroundColor: "#D9D9D9",
  },
  itemTitle: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 18,
    color: "#000",
  },
  priceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 18,
    color: "#111",
  },
  showAllText: {
    marginTop: 14,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 15,
    color: "#7C7C7C",
    textAlign: "center",
  },
});

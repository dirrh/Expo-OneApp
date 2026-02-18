// homeCategoryConfig: zdielany config Home kategorii pre Home/ShowMore flow.
// Zodpovednost: centralne typy, chips a normalizacia kategorii.
// Vstup/Vystup: export type + helpery pre UI a filtering.

import { Ionicons } from "@expo/vector-icons";
import type { DiscoverCategory } from "../interfaces";

export type HomeCategoryFilter = "All" | DiscoverCategory;

export interface HomeCategoryChipConfig {
  key: HomeCategoryFilter;
  iconName?: keyof typeof Ionicons.glyphMap;
  labelKey: string;
}

export const HOME_CATEGORY_CHIPS: HomeCategoryChipConfig[] = [
  { key: "All", labelKey: "showAll" },
  { key: "Fitness", iconName: "barbell-outline", labelKey: "Fitness" },
  { key: "Gastro", iconName: "restaurant-outline", labelKey: "Gastro" },
  { key: "Beauty", iconName: "sparkles-outline", labelKey: "Beauty" },
  { key: "Relax", iconName: "leaf-outline", labelKey: "Relax" },
];

export const normalizeHomeCategory = (value?: string | null): HomeCategoryFilter | null => {
  if (!value) {
    return null;
  }

  const key = value.trim().toLowerCase();
  if (key === "fitness" || key === "fitnes") return "Fitness";
  if (key === "gastro" || key === "food" || key === "jedlo") return "Gastro";
  if (key === "beauty" || key === "krasa" || key === "kozmetika") return "Beauty";
  if (key === "relax" || key === "wellness") return "Relax";
  if (key === "all") return "All";
  return null;
};


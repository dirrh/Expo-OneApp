// mockBranchSearchMetadata: doplnkove search metadata pre mock katalog.
// Zodpovednost: centralizuje tagy/menu/aliasy pre Home Search V2.
// Vstup/Vystup: vracia search metadata podla branch ID s category fallbackom.

import type { DiscoverCategory } from "../../interfaces";
import { normalizeId } from "../utils/id";

export interface BranchSearchMetadata {
  searchTags?: string[];
  searchMenuItems?: string[];
  searchAliases?: string[];
}

type MetadataMap = Record<string, BranchSearchMetadata>;

const MOCK_BRANCH_SEARCH_METADATA: MetadataMap = {
  gym_365: {
    searchTags: ["fitness", "gym", "workout", "training"],
    searchMenuItems: ["personal training", "group classes"],
    searchAliases: ["365 gym", "fitko"],
  },
  royal_gym: {
    searchTags: ["fitness", "gym", "workout", "strength"],
    searchMenuItems: ["open gym", "trainer"],
    searchAliases: ["red royal gym"],
  },
  gym_klub: {
    searchTags: ["fitness", "gym", "strength", "cardio"],
    searchMenuItems: ["cardio zone", "weight room"],
    searchAliases: ["gym club"],
  },
  diamond_gym: {
    searchTags: ["fitness", "gym", "workout"],
    searchMenuItems: ["functional training"],
    searchAliases: ["diamond fitness"],
  },
  diamond_barber: {
    searchTags: ["beauty", "barber", "haircut"],
    searchMenuItems: ["fade", "beard trim"],
    searchAliases: ["diamond barbershop"],
  },
  bc_burger: {
    searchTags: ["gastro", "burger", "fast food"],
    searchMenuItems: ["burger", "hamburger", "fries"],
    searchAliases: ["burger bistro", "burger place"],
  },
  pizza_nitra: {
    searchTags: ["gastro", "pizza", "italian"],
    searchMenuItems: ["pizza", "pizzeria", "margherita"],
    searchAliases: ["pizza place"],
  },
  kebab_bistro_chrenovska: {
    searchTags: ["gastro", "kebab", "fast food"],
    searchMenuItems: ["kebab", "doner", "durum"],
    searchAliases: ["doner bistro"],
  },
  coffee_tree_friends: {
    searchTags: ["relax", "coffee", "cafe"],
    searchMenuItems: ["coffee", "espresso", "latte"],
    searchAliases: ["kava", "kaviaren"],
  },
  caffe_comfort_nitra: {
    searchTags: ["relax", "coffee", "cafe"],
    searchMenuItems: ["coffee", "cappuccino", "dessert"],
    searchAliases: ["kava", "cafe comfort"],
  },
  cafe_bistro_medic: {
    searchTags: ["gastro", "coffee", "cafe", "bistro"],
    searchMenuItems: ["coffee", "cappuccino", "brunch"],
    searchAliases: ["kava", "medic cafe"],
  },
  media_cafe_restaurant: {
    searchTags: ["gastro", "restaurant", "coffee", "cafe"],
    searchMenuItems: ["coffee", "lunch menu", "burger"],
    searchAliases: ["media cafe"],
  },
  sakura_nitra_central: {
    searchTags: ["gastro", "sushi", "asian"],
    searchMenuItems: ["sushi", "maki", "ramen"],
    searchAliases: ["sakura sushi"],
  },
  riverside_nitra: {
    searchTags: ["gastro", "restaurant", "wellness"],
    searchMenuItems: ["brunch", "burger", "steak"],
    searchAliases: ["riverside restaurant"],
  },
};

const CATEGORY_FALLBACK_TAGS: Record<DiscoverCategory, string[]> = {
  Fitness: ["fitness", "gym", "workout"],
  Gastro: ["gastro", "food", "restaurant"],
  Relax: ["relax", "wellness", "spa", "coffee"],
  Beauty: ["beauty", "salon", "care"],
};

const toSearchArray = (value?: string[] | null): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => item.length > 0);

  if (items.length === 0) {
    return undefined;
  }

  return Array.from(new Set(items));
};

const mergeSearchMetadata = (
  primary?: BranchSearchMetadata,
  secondary?: BranchSearchMetadata
): BranchSearchMetadata => {
  const searchTags = toSearchArray([...(primary?.searchTags ?? []), ...(secondary?.searchTags ?? [])]);
  const searchMenuItems = toSearchArray([
    ...(primary?.searchMenuItems ?? []),
    ...(secondary?.searchMenuItems ?? []),
  ]);
  const searchAliases = toSearchArray([
    ...(primary?.searchAliases ?? []),
    ...(secondary?.searchAliases ?? []),
  ]);

  return { searchTags, searchMenuItems, searchAliases };
};

export const getMockBranchSearchMetadata = (
  id?: string | null,
  category?: DiscoverCategory | null,
  title?: string | null
): BranchSearchMetadata => {
  const normalizedId = normalizeId(id ?? "");
  const byId = normalizedId ? MOCK_BRANCH_SEARCH_METADATA[normalizedId] : undefined;
  const fallbackByCategory = category
    ? {
        searchTags: CATEGORY_FALLBACK_TAGS[category],
      }
    : undefined;
  const titleAlias =
    typeof title === "string" && title.trim().length > 0
      ? { searchAliases: [title.trim()] }
      : undefined;

  return mergeSearchMetadata(mergeSearchMetadata(byId, fallbackByCategory), titleAlias);
};

export const HOME_SEARCH_POPULAR_QUERIES = [
  "burger",
  "pizza",
  "sushi",
  "kebab",
  "kava",
  "wellness",
] as const;

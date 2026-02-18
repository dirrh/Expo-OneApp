// showMoreUtils: shared pure helpers pre ShowMore data pipeline.
// Zodpovednost: section sorting + category filtering + route defaults.
// Vstup/Vystup: ciste funkcie pouzitelne v UI aj testoch.

import type { BranchData } from "../interfaces";
import type { HomeCategoryFilter } from "./homeCategoryConfig";
import { normalizeHomeCategory } from "./homeCategoryConfig";

export type ShowMoreSection = "openNearYou" | "trending" | "topRated";

const compareTitle = (a: BranchData, b: BranchData) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: "base" });

export const getShowMoreSectionBranches = (
  branches: BranchData[],
  section: ShowMoreSection
): BranchData[] => {
  if (section === "topRated") {
    return [...branches].sort((a, b) => {
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }

      return compareTitle(a, b);
    });
  }

  return branches;
};

export const filterShowMoreByCategory = (
  branches: BranchData[],
  category: HomeCategoryFilter
): BranchData[] => {
  if (category === "All") {
    return branches;
  }

  return branches.filter((branch) => normalizeHomeCategory(branch.category) === category);
};

export const resolveInitialShowMoreCategory = (
  value?: string | null,
  fallback: HomeCategoryFilter = "All"
): HomeCategoryFilter => {
  const normalized = normalizeHomeCategory(value);
  return normalized ?? fallback;
};


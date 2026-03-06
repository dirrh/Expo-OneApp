/**
 * businessDetailUtils: Združuje čisté helper funkcie pre Business Detail flow (taby, scroll správanie a recenzie).
 *
 * Prečo: Oddelenie business pravidiel od UI komponentov drží obrazovku čitateľnú a jednoduchšie testovateľnú.
 */

import type { BranchMenuLabelMode } from "../interfaces";
import type { ReviewPhotoDraft } from "../reviews/types";

export type BusinessDetailTabKey = "home" | "benefits" | "menu" | "info" | "reviews";

export interface BusinessDetailTabConfigItem {
  key: BusinessDetailTabKey;
  labelKey: string;
  fallbackLabel: string;
}

export const buildBusinessDetailTabConfig = (
  businessDetailV2Enabled: boolean,
  menuLabelMode: BranchMenuLabelMode = "menu"
): BusinessDetailTabConfigItem[] => {
  const base: BusinessDetailTabConfigItem[] = [
    { key: "home", labelKey: "tab_home", fallbackLabel: "Home" },
    { key: "benefits", labelKey: "tab_benefits", fallbackLabel: "Benefits" },
  ];

  if (businessDetailV2Enabled) {
    base.push({
      key: "menu",
      labelKey: menuLabelMode === "menu" ? "tab_menu" : "tab_pricelist",
      fallbackLabel: menuLabelMode === "menu" ? "Menu" : "Prices",
    });
  }

  base.push(
    { key: "info", labelKey: "tab_info", fallbackLabel: "Info" },
    { key: "reviews", labelKey: "tab_reviews", fallbackLabel: "Reviews" }
  );

  return base;
};

export const resolveTabScrollOffset = (savedOffset?: number): number =>
  typeof savedOffset === "number" && Number.isFinite(savedOffset) ? savedOffset : 0;

export const normalizeReviewPhotos = (
  photos?: ReviewPhotoDraft[],
  limit = 3
): ReviewPhotoDraft[] => {
  if (!Array.isArray(photos) || photos.length === 0 || limit <= 0) {
    return [];
  }

  const uniqueByUri = new Map<string, ReviewPhotoDraft>();
  photos.forEach((photo) => {
    if (!photo || typeof photo.uri !== "string" || photo.uri.trim().length === 0) {
      return;
    }
    if (!uniqueByUri.has(photo.uri)) {
      uniqueByUri.set(photo.uri, photo);
    }
  });

  return Array.from(uniqueByUri.values()).slice(0, limit);
};


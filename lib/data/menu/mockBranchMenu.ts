/**
 * mockBranchMenu: Menu modul mock Branch Menu poskytuje fallback polozky menu alebo cennika pre detail podniku.
 *
 * Preco: Fallback obsah v mockBranchMenu drzi konzistentny zazitok aj pri nekompletnych backend datach.
 */

import type { DiscoverCategory, BranchMenuLabelMode } from "../../interfaces";
import type { BranchMenuItemDto } from "../models";

const normalizeCategory = (value?: string | null): DiscoverCategory => {
  const key = String(value ?? "").trim().toLowerCase();
  if (key === "gastro" || key === "food" || key === "jedlo") return "Gastro";
  if (key === "relax" || key === "wellness") return "Relax";
  if (key === "beauty" || key === "krasa" || key === "kozmetika") return "Beauty";
  return "Fitness";
};

const FITNESS_MENU: BranchMenuItemDto[] = [
  {
    id: "f-e-1",
    groupTitle: "businessMenuGroupFitnessOneTime",
    name: "businessMenuFitnessPriceItem1Name",
    price: "6.00 EUR",
  },
  {
    id: "f-e-2",
    groupTitle: "businessMenuGroupFitnessOneTime",
    name: "businessMenuFitnessPriceItem2Name",
    price: "4.50 EUR",
  },
  {
    id: "f-e-3",
    groupTitle: "businessMenuGroupFitnessOneTime",
    name: "businessMenuFitnessPriceItem3Name",
    price: "4.50 EUR",
  },
  {
    id: "f-s-1",
    groupTitle: "businessMenuGroupFitnessSeason",
    name: "businessMenuFitnessPriceItem4Name",
    price: "49.00 EUR",
  },
  {
    id: "f-s-2",
    groupTitle: "businessMenuGroupFitnessSeason",
    name: "businessMenuFitnessPriceItem5Name",
    price: "39.00 EUR",
  },
  {
    id: "f-s-3",
    groupTitle: "businessMenuGroupFitnessSeason",
    name: "businessMenuFitnessPriceItem6Name",
    price: "49.00 EUR",
  },
];

const GASTRO_MENU: BranchMenuItemDto[] = [
  {
    id: "g-1",
    groupTitle: "businessMenuGroupGastroTopPicks",
    name: "businessMenuGastroPriceItem1Name",
    price: "6.90 EUR",
  },
  {
    id: "g-2",
    groupTitle: "businessMenuGroupGastroTopPicks",
    name: "businessMenuGastroPriceItem2Name",
    price: "8.90 EUR",
  },
  {
    id: "g-3",
    groupTitle: "businessMenuGroupGastroTopPicks",
    name: "businessMenuGastroPriceItem3Name",
    price: "6.90 EUR",
  },
  {
    id: "g-4",
    groupTitle: "businessMenuGroupGastroTopPicks",
    name: "businessMenuGastroPriceItem4Name",
    price: "9.90 EUR",
  },
  {
    id: "g-5",
    groupTitle: "businessMenuGroupGastroChefSpecials",
    name: "businessMenuGastroPriceItem5Name",
    price: "9.90 EUR",
  },
  {
    id: "g-6",
    groupTitle: "businessMenuGroupGastroChefSpecials",
    name: "businessMenuGastroPriceItem6Name",
    price: "10.90 EUR",
  },
  {
    id: "g-7",
    groupTitle: "businessMenuGroupGastroChefSpecials",
    name: "businessMenuGastroPriceItem7Name",
    price: "14.90 EUR",
  },
  {
    id: "g-8",
    groupTitle: "businessMenuGroupGastroChefSpecials",
    name: "businessMenuGastroPriceItem8Name",
    price: "11.90 EUR",
  },
];

const RELAX_MENU: BranchMenuItemDto[] = [
  {
    id: "r-e-1",
    groupTitle: "businessMenuGroupRelaxSingleEntry",
    name: "businessMenuRelaxPriceItem1Name",
    price: "18.00 EUR",
  },
  {
    id: "r-e-2",
    groupTitle: "businessMenuGroupRelaxSingleEntry",
    name: "businessMenuRelaxPriceItem2Name",
    price: "24.00 EUR",
  },
  {
    id: "r-e-3",
    groupTitle: "businessMenuGroupRelaxSingleEntry",
    name: "businessMenuRelaxPriceItem3Name",
    price: "12.00 EUR",
  },
  {
    id: "r-p-1",
    groupTitle: "businessMenuGroupRelaxPackages",
    name: "businessMenuRelaxPriceItem4Name",
    price: "49.00 EUR",
  },
  {
    id: "r-p-2",
    groupTitle: "businessMenuGroupRelaxPackages",
    name: "businessMenuRelaxPriceItem5Name",
    price: "79.00 EUR",
  },
  {
    id: "r-p-3",
    groupTitle: "businessMenuGroupRelaxPackages",
    name: "businessMenuRelaxPriceItem6Name",
    price: "59.00 EUR",
  },
];

const BEAUTY_MENU: BranchMenuItemDto[] = [
  {
    id: "b-s-1",
    groupTitle: "businessMenuGroupBeautySingleService",
    name: "businessMenuBeautyPriceItem1Name",
    price: "26.00 EUR",
  },
  {
    id: "b-s-2",
    groupTitle: "businessMenuGroupBeautySingleService",
    name: "businessMenuBeautyPriceItem2Name",
    price: "24.00 EUR",
  },
  {
    id: "b-s-3",
    groupTitle: "businessMenuGroupBeautySingleService",
    name: "businessMenuBeautyPriceItem3Name",
    price: "29.00 EUR",
  },
  {
    id: "b-p-1",
    groupTitle: "businessMenuGroupBeautyPackages",
    name: "businessMenuBeautyPriceItem4Name",
    price: "49.00 EUR",
  },
  {
    id: "b-p-2",
    groupTitle: "businessMenuGroupBeautyPackages",
    name: "businessMenuBeautyPriceItem5Name",
    price: "79.00 EUR",
  },
  {
    id: "b-p-3",
    groupTitle: "businessMenuGroupBeautyPackages",
    name: "businessMenuBeautyPriceItem6Name",
    price: "59.00 EUR",
  },
];

const MENU_BY_CATEGORY: Record<DiscoverCategory, BranchMenuItemDto[]> = {
  Fitness: FITNESS_MENU,
  Gastro: GASTRO_MENU,
  Relax: RELAX_MENU,
  Beauty: BEAUTY_MENU,
};

export const resolveBranchMenuLabelMode = (category?: string | null): BranchMenuLabelMode =>
  normalizeCategory(category) === "Gastro" ? "menu" : "pricelist";

export const getMockBranchMenuItems = (category?: string | null): BranchMenuItemDto[] =>
  MENU_BY_CATEGORY[normalizeCategory(category)];

/**
 * normalizers.ts
 * 
 * Pomocné funkcie pre normalizáciu a formátovanie dát.
 * Obsahuje funkcie používané naprieč celou aplikáciou.
 */

import { ImageSourcePropType } from "react-native";
import { DUMMY_BRANCH } from "../constants/discover";
import type { BranchData, DiscoverCategory } from "../interfaces";

// Placeholder obrázky pre jednotlivé kategórie
const CATEGORY_PLACEHOLDERS: Record<DiscoverCategory, ImageSourcePropType> = {
  Fitness: require("../../assets/365.jpg"),
  Gastro: require("../../assets/royal.jpg"),
  Relax: require("../../assets/klub.jpg"),
  Beauty: require("../../assets/royal.jpg"),
};

// Možné hodnoty hodnotenia (4.1 - 5.0)
const RATING_VALUES = [4.1, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0];

/**
 * Vygeneruje deterministické hodnotenie na základe ID
 * 
 * Prečo deterministické? Aby rovnaké ID malo vždy rovnaké hodnotenie.
 * Používame jednoduchú hash funkciu, ktorá z reťazca vytvorí číslo.
 * 
 * @param id - identifikátor (napr. "gym_365")
 * @returns číslo od 4.1 do 5.0
 * 
 * Príklad:
 * getRatingForId("gym_365") -> 4.6 (vždy rovnaké)
 */
export const getRatingForId = (id: string): number => {
  let hash = 0;
  
  // Prejdeme každý znak a vytvoríme hash
  for (let i = 0; i < id.length; i += 1) {
    // Vynásobíme 31 (prvočíslo) a pridáme ASCII hodnotu znaku
    // >>> 0 zabezpečí, že výsledok je vždy kladné číslo
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  
  // Vezmeme zvyšok po delení počtom hodnôt
  return RATING_VALUES[hash % RATING_VALUES.length];
};

/**
 * Preformátuje ID na čitateľný názov
 * 
 * Nahradí podčiarkovníky a pomlčky medzerami a každé slovo začne veľkým písmenom.
 * 
 * @param id - identifikátor s podčiarkovníkmi/pomlčkami
 * @returns naformátovaný názov
 * 
 * Príklady:
 * "gym_365" -> "Gym 365"
 * "diamond-gym" -> "Diamond Gym"
 * "top_sport_gym" -> "Top Sport Gym"
 */
export const formatTitleFromId = (id: string): string =>
  id
    .replace(/[_-]+/g, " ")     // nahradíme _ a - medzerou
    .split(" ")                  // rozdelíme na slová
    .filter(Boolean)             // odstránime prázdne reťazce
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))  // prvé písmeno veľké
    .join(" ");                  // spojíme späť medzerami

/**
 * Normalizuje čiastočné dáta pobočky na kompletný BranchData objekt
 * 
 * Doplní chýbajúce hodnoty z DUMMY_BRANCH alebo kategórie.
 * Používame keď máme len čiastočné dáta (napr. z markera).
 * 
 * @param input - čiastočné dáta pobočky
 * @returns kompletný BranchData objekt
 */
export const normalizeBranch = (input: Partial<BranchData> & { id?: string }): BranchData => {
  // Určíme kategóriu - z inputu alebo default
  const category =
    input.category && input.category !== "Multi"
      ? (input.category as DiscoverCategory)
      : (DUMMY_BRANCH.category as DiscoverCategory) ?? "Fitness";

  // Určíme obrázok - z inputu, placeholder pre kategóriu, alebo default
  const image =
    input.image ??
    (category ? CATEGORY_PLACEHOLDERS[category] : undefined) ??
    DUMMY_BRANCH.image;

  // Určíme ID
  const rawId = input.id ?? input.title ?? DUMMY_BRANCH.title;
  
  // Určíme názov - z inputu alebo vygenerujeme z ID
  const baseTitle = input.title ?? formatTitleFromId(rawId);
  
  // Ak názov stále obsahuje _ alebo -, preformátujeme ho
  const title =
    baseTitle.includes("_") || baseTitle.includes("-") 
      ? formatTitleFromId(baseTitle) 
      : baseTitle;

  // Vrátime kompletný objekt s doplnenými hodnotami
  return {
    ...DUMMY_BRANCH,      // základné hodnoty
    ...input,             // hodnoty z inputu (prepíšu default)
    id: rawId,
    title,
    category,
    image,
    rating: typeof input.rating === "number" ? input.rating : DUMMY_BRANCH.rating,
    distance: input.distance ?? DUMMY_BRANCH.distance,
    hours: input.hours ?? DUMMY_BRANCH.hours,
  };
};

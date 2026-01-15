/**
 * mockSource.ts
 * 
 * Mock dátový zdroj pre vývoj a testovanie.
 * Poskytuje statické dáta bez nutnosti pripojenia k API/databáze.
 * 
 * OPTIMALIZÁCIE:
 * - Všetky dáta sú pred-vypočítané pri štarte (nie pri každom volaní)
 * - Používame Map pre O(1) lookup namiesto O(n) find()
 * - Pole pobočiek je cachované (nevytvárame nové pri každom volaní)
 */

import { ImageSourcePropType } from "react-native";
import type { DataSource } from "./source";
import type { BranchData, DiscoverMapMarker, DiscoverCategory } from "../interfaces";
import { branchesFixture } from "../fixtures/branches";
import { coords } from "../data/coords";
import { normalizeBranch, formatTitleFromId, getRatingForId } from "./normalizers";

// Ikonky pre jednotlivé kategórie (bez hodnotenia - základný pin)
const MARKER_ICONS: Record<DiscoverCategory, ImageSourcePropType> = {
  Fitness: require("../../images/icons/fitness/fitness_without_review.png"),
  Gastro: require("../../images/icons/gastro/gastro_without_rating.png"),
  Relax: require("../../images/icons/relax/relax_without_rating.png"),
  Beauty: require("../../images/icons/beauty/beauty_without_rating.png"),
};

// === PRED-VÝPOČET POBOČIEK ===
// Vytvoríme Map pre rýchle vyhľadávanie podľa ID - O(1) namiesto O(n)
const branchMap = new Map<string, BranchData>();
branchesFixture.forEach((b) => {
  const normalized = normalizeBranch(b);
  branchMap.set(normalized.id ?? normalized.title, normalized);
});

// Cachujeme pole pobočiek - vyhne sa Array.from() pri každom volaní getBranches()
const branchesArray = Array.from(branchMap.values());

// === PRED-VÝPOČET MARKEROV ===
// Transformujeme súradnice na markery s ikonkami a hodnotením
const markers: DiscoverMapMarker[] = coords.map((c) => ({
  id: c.id,
  title: formatTitleFromId(c.id),       // "gym_365" -> "Gym 365"
  groupId: c.groupId,                    // pre multi-piny (viac pobočiek na jednom mieste)
  coord: { lng: c.lng, lat: c.lat },
  category: c.category,
  rating: getRatingForId(c.id),          // deterministické hodnotenie z ID
  icon: MARKER_ICONS[c.category],
}));

// Map pre rýchle vyhľadávanie markerov - O(1) namiesto O(n) find()
const markerMap = new Map(markers.map((m) => [m.id, m]));

/**
 * Mock implementácia DataSource rozhrania
 * Všetky metódy sú async pre kompatibilitu s reálnym API/Supabase
 */
export const mockSource: DataSource = {
  /**
   * Vráti všetky pobočky
   * Vďaka cache vracia vždy rovnaké pole (žiadna alokácia pamäte)
   */
  async getBranches() {
    return branchesArray;
  },

  /**
   * Vráti pobočku podľa ID
   * Najprv hľadá v cache, ak nenájde, vytvorí z markera
   * 
   * @param id - ID pobočky
   * @returns pobočka alebo null ak neexistuje
   */
  async getBranchById(id: string) {
    // Skúsime nájsť v cache
    const cached = branchMap.get(id);
    if (cached) return cached;

    // Ak nie je v cache, skúsime vytvoriť z markera
    const marker = markerMap.get(id);  // O(1) lookup
    if (!marker) return null;

    // Vytvoríme pobočku z markera a uložíme do cache
    const normalized = normalizeBranch({
      id,
      title: id,
      category: marker.category,
      rating: marker.rating,
    });
    branchMap.set(id, normalized);
    
    return normalized;
  },

  /**
   * Vráti všetky markery pre mapu
   */
  async getMarkers() {
    return markers;
  },
};

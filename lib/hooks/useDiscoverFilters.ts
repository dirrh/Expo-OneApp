/**
 * useDiscoverFilters.ts
 * 
 * Tento hook spravuje všetky filtre na Discover obrazovke.
 * Obsahuje logiku pre filtrovanie podľa kategórie, hodnotenia a vyhľadávania.
 */

import { useState, useMemo, useCallback } from "react";
import type { BranchData, DiscoverMapMarker } from "../interfaces";

const parseNumericRating = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveRating = (
  ratingValue: unknown,
  formattedValue?: string
): number | null => {
  const parsedRating = parseNumericRating(ratingValue);
  if (parsedRating !== null) {
    return parsedRating;
  }

  if (typeof formattedValue === "string") {
    return parseNumericRating(formattedValue);
  }

  return null;
};


/**
 * Typ pre návratovú hodnotu hooku - definuje čo všetko hook vracia
 */
export interface UseDiscoverFiltersReturn {
  // === STAV FILTROV ===
  filter: string;                                                    // aktuálne vybraná kategória (napr. "Gastro")
  setFilter: React.Dispatch<React.SetStateAction<string>>;          // funkcia na zmenu kategórie
  appliedFilters: Set<string>;                                      // aktívne kategórie (prázdne = žiadny)
  setAppliedFilters: React.Dispatch<React.SetStateAction<Set<string>>>;

  // === STAV PODKATEGÓRIÍ ===
  sub: Set<string>;                                                  // vybrané podkategórie (napr. "Vegan", "Pizza")
  setSub: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleSubcategory: (name: string) => void;                        // prepne podkategóriu (zapne/vypne)

  // === STAV HODNOTENIA ===
  ratingFilter: Set<string>;                                         // vybrané hodnotenia v sheete
  setRatingFilter: React.Dispatch<React.SetStateAction<Set<string>>>;
  appliedRatings: Set<string>;                                       // skutočne aplikované hodnotenia
  setAppliedRatings: React.Dispatch<React.SetStateAction<Set<string>>>;

  // === VYPOČÍTANÉ HODNOTY ===
  hasActiveFilter: boolean;                                          // či je nejaký filter aktívny
  filterCount: number;                                               // počet aktívnych filtrov (pre badge)
  ratingThreshold: number | null;                                    // minimálne hodnotenie pre filter

  // === FILTROVACIE FUNKCIE ===
  filterBranches: (branches: BranchData[], query: string) => BranchData[];
  filterMarkers: (markers: DiscoverMapMarker[]) => DiscoverMapMarker[];
}

/**
 * Hook na správu všetkých filtrov na Discover obrazovke
 * 
 * @param defaultFilter - predvolená kategória (default: "Gastro")
 * @returns objekt so stavom filtrov a funkciami na ich ovládanie
 * 
 * Príklad použitia:
 * const filters = useDiscoverFilters("Fitness");
 * const filtered = filters.filterBranches(branches, searchText);
 */
export const useDiscoverFilters = (
  defaultFilter: string = "Gastro"
): UseDiscoverFiltersReturn => {
  
  // Stav pre kategóriu (Fitness, Gastro, Relax, Beauty)
  const [filter, setFilter] = useState(defaultFilter);
  const [appliedFilters, setAppliedFilters] = useState<Set<string>>(() => new Set());

  // Stav pre podkategórie (Vegan, Pizza, atď.) - používame Set pre rýchle vyhľadávanie
  const [sub, setSub] = useState<Set<string>>(() => new Set());

  // Stav pre filter podľa hodnotenia
  const [ratingFilter, setRatingFilter] = useState<Set<string>>(() => new Set());
  const [appliedRatings, setAppliedRatings] = useState<Set<string>>(() => new Set());

  /**
   * Prepne podkategóriu - ak je vybraná, odstráni ju, ak nie je, pridá ju
   * useCallback zabezpečí, že sa funkcia nevytvára znova pri každom renderovaní
   */
  const toggleSubcategory = useCallback((name: string) => {
    setSub((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);  // ak už je vybraná, odstránime
      } else {
        next.add(name);     // ak nie je vybraná, pridáme
      }
      return next;
    });
  }, []);

  /**
   * Či je nejaký filter aktívny - používame na zobrazenie/skrytie uložených lokácií
   * useMemo zabezpečí, že sa hodnota prepočíta len keď sa zmení appliedFilters alebo appliedRatings
   */
  const hasActiveFilter = useMemo(
    () => appliedFilters.size > 0 || appliedRatings.size > 0,
    [appliedFilters, appliedRatings]
  );

  /**
   * Celkový počet filtrov - zobrazujeme na badge tlačidla filtra
   */
  const filterCount = useMemo(
    () => sub.size + ratingFilter.size,
    [sub.size, ratingFilter.size]
  );

  /**
   * Minimálne hodnotenie pre filter
   * Napr. ak user vyberie 4.5 a 4.8, vezmeme maximum (4.8) - zobrazia sa len 4.8+
   */
  const ratingThreshold = useMemo(() => {
    // Prevedieme Set na pole čísel
    const values = Array.from(appliedRatings)
      .map((value) => parseNumericRating(value))
      .filter((value): value is number => value !== null);
    
    // Ak nie je vybraté žiadne hodnotenie, vrátime null
    if (values.length === 0) {
      return null;
    }
    
    // Vrátime najvyššiu hodnotu
    return Math.max(...values);
  }, [appliedRatings]);

  /**
   * Filtruje pobočky podľa kategórie, hodnotenia a vyhľadávacieho textu
   * 
   * @param branches - pole všetkých pobočiek
   * @param query - vyhľadávací text
   * @returns prefiltrované pole pobočiek
   */
  const filterBranches = useCallback(
    (branches: BranchData[], query: string): BranchData[] => {
      // Normalizujeme vyhľadávací text (malé písmená, bez medzier na krajoch)
      const normalizedQuery = query.trim().toLowerCase();

      // Krok 1: Aplikujeme filter hodnotenia
      let filtered =
        ratingThreshold === null
          ? branches
          : branches.filter((branch) => {
              const numericRating = resolveRating(branch.rating);
              return numericRating !== null && numericRating >= ratingThreshold;
            });

      // Krok 2: Aplikujeme filter kategórie
      if (appliedFilters.size > 0) {
        filtered = filtered.filter((branch) => {
          const category = branch.category;
          return typeof category === "string" && appliedFilters.has(category);
        });
      }

      // Krok 3: Aplikujeme vyhľadávanie v názve
      if (normalizedQuery) {
        filtered = filtered.filter((branch) =>
          branch.title.toLowerCase().includes(normalizedQuery)
        );
      }

      return filtered;
    },
    [appliedFilters, ratingThreshold]
  );

  /**
   * Filtruje markery na mape podľa kategórie a hodnotenia
   * Podobné ako filterBranches, ale bez vyhľadávania (markery nemajú search)
   */
  const filterMarkers = useCallback(
    (markers: DiscoverMapMarker[]): DiscoverMapMarker[] => {
      // Krok 1: Filter podľa hodnotenia
      let filtered =
        ratingThreshold === null
          ? markers
          : markers.filter((item) => {
              const numericRating = resolveRating(item.rating, item.ratingFormatted);
              return numericRating !== null && numericRating >= ratingThreshold;
            });

      // Krok 2: Filter podľa kategórie
      if (appliedFilters.size > 0) {
        filtered = filtered.filter((item) => appliedFilters.has(item.category));
      }

      return filtered;
    },
    [appliedFilters, ratingThreshold]
  );

  // Vrátime všetky hodnoty a funkcie, ktoré komponenty potrebujú
  return {
    filter,
    setFilter,
    appliedFilters,
    setAppliedFilters,
    sub,
    setSub,
    toggleSubcategory,
    ratingFilter,
    setRatingFilter,
    appliedRatings,
    setAppliedRatings,
    hasActiveFilter,
    filterCount,
    ratingThreshold,
    filterBranches,
    filterMarkers,
  };
};

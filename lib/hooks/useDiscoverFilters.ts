/**
 * useDiscoverFilters: Hook use Discover Filters zapúzdruje stav a udalosti pre svoju časť aplikačného flowu.
 *
 * Prečo: Presun stavovej logiky do hooku useDiscoverFilters znižuje komplexitu obrazoviek a uľahčuje opakované použitie.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BranchData, DiscoverMapMarker } from "../interfaces";
import {
  branchMatchesDiscoverQueryTokens,
  tokenizeDiscoverSearchQuery,
} from "../discover/discoverSearchUtils";

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

const resolveRating = (ratingValue: unknown, formattedValue?: string): number | null => {
  const parsedRating = parseNumericRating(ratingValue);
  if (parsedRating !== null) {
    return parsedRating;
  }

  if (typeof formattedValue === "string") {
    return parseNumericRating(formattedValue);
  }

  return null;
};

type SharedDiscoverFilterState = {
  initialized: boolean;
  filter: string;
  appliedFilters: Set<string>;
  sub: Set<string>;
  ratingFilter: Set<string>;
  appliedRatings: Set<string>;
};

const sharedState: SharedDiscoverFilterState = {
  initialized: false,
  filter: "Gastro",
  appliedFilters: new Set<string>(),
  sub: new Set<string>(),
  ratingFilter: new Set<string>(),
  appliedRatings: new Set<string>(),
};

const listeners = new Set<() => void>();

const cloneSet = (value: Set<string>): Set<string> => new Set(value);

const resolveStateAction = <T,>(current: T, next: React.SetStateAction<T>): T => {
  if (typeof next === "function") {
    return (next as (prev: T) => T)(current);
  }
  return next;
};

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export interface UseDiscoverFiltersReturn {
  filter: string;
  setFilter: React.Dispatch<React.SetStateAction<string>>;
  appliedFilters: Set<string>;
  setAppliedFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  sub: Set<string>;
  setSub: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleSubcategory: (name: string) => void;
  ratingFilter: Set<string>;
  setRatingFilter: React.Dispatch<React.SetStateAction<Set<string>>>;
  appliedRatings: Set<string>;
  setAppliedRatings: React.Dispatch<React.SetStateAction<Set<string>>>;
  hasActiveFilter: boolean;
  filterCount: number;
  ratingThreshold: number | null;
  filterBranches: (branches: BranchData[], query: string) => BranchData[];
  filterMarkers: (markers: DiscoverMapMarker[]) => DiscoverMapMarker[];
}

export const useDiscoverFilters = (
  defaultFilter: string = "Gastro"
): UseDiscoverFiltersReturn => {
  if (!sharedState.initialized) {
    sharedState.initialized = true;
    sharedState.filter = defaultFilter;
  }

  const [filter, setFilterState] = useState<string>(sharedState.filter);
  const [appliedFilters, setAppliedFiltersState] = useState<Set<string>>(
    () => cloneSet(sharedState.appliedFilters)
  );
  const [sub, setSubState] = useState<Set<string>>(() => cloneSet(sharedState.sub));
  const [ratingFilter, setRatingFilterState] = useState<Set<string>>(
    () => cloneSet(sharedState.ratingFilter)
  );
  const [appliedRatings, setAppliedRatingsState] = useState<Set<string>>(
    () => cloneSet(sharedState.appliedRatings)
  );

  const syncFromShared = useCallback(() => {
    setFilterState(sharedState.filter);
    setAppliedFiltersState(cloneSet(sharedState.appliedFilters));
    setSubState(cloneSet(sharedState.sub));
    setRatingFilterState(cloneSet(sharedState.ratingFilter));
    setAppliedRatingsState(cloneSet(sharedState.appliedRatings));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe(syncFromShared);
    return () => {
      unsubscribe();
    };
  }, [syncFromShared]);

  const setFilter = useCallback<React.Dispatch<React.SetStateAction<string>>>((next) => {
    sharedState.filter = resolveStateAction(sharedState.filter, next);
    emitChange();
  }, []);

  const setAppliedFilters = useCallback<
    React.Dispatch<React.SetStateAction<Set<string>>>
  >((next) => {
    const resolved = resolveStateAction(sharedState.appliedFilters, next);
    sharedState.appliedFilters = cloneSet(resolved);
    emitChange();
  }, []);

  const setSub = useCallback<React.Dispatch<React.SetStateAction<Set<string>>>>((next) => {
    const resolved = resolveStateAction(sharedState.sub, next);
    sharedState.sub = cloneSet(resolved);
    emitChange();
  }, []);

  const setRatingFilter = useCallback<
    React.Dispatch<React.SetStateAction<Set<string>>>
  >((next) => {
    const resolved = resolveStateAction(sharedState.ratingFilter, next);
    sharedState.ratingFilter = cloneSet(resolved);
    emitChange();
  }, []);

  const setAppliedRatings = useCallback<
    React.Dispatch<React.SetStateAction<Set<string>>>
  >((next) => {
    const resolved = resolveStateAction(sharedState.appliedRatings, next);
    sharedState.appliedRatings = cloneSet(resolved);
    emitChange();
  }, []);

  const toggleSubcategory = useCallback(
    (name: string) => {
      setSub((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
        } else {
          next.add(name);
        }
        return next;
      });
    },
    [setSub]
  );

  const hasActiveFilter = useMemo(
    () => appliedFilters.size > 0 || appliedRatings.size > 0,
    [appliedFilters, appliedRatings]
  );

  const filterCount = useMemo(
    () => sub.size + ratingFilter.size,
    [sub.size, ratingFilter.size]
  );

  const ratingThreshold = useMemo(() => {
    const values = Array.from(appliedRatings)
      .map((value) => parseNumericRating(value))
      .filter((value): value is number => value !== null);

    if (values.length === 0) {
      return null;
    }

    return Math.max(...values);
  }, [appliedRatings]);

  const filterBranches = useCallback(
    (branches: BranchData[], query: string): BranchData[] => {
      const queryTokens = tokenizeDiscoverSearchQuery(query);

      let filtered =
        ratingThreshold === null
          ? branches
          : branches.filter((branch) => {
              const numericRating = resolveRating(branch.rating);
              return numericRating !== null && numericRating >= ratingThreshold;
            });

      if (appliedFilters.size > 0) {
        filtered = filtered.filter((branch) => {
          const category = branch.category;
          return typeof category === "string" && appliedFilters.has(category);
        });
      }

      if (queryTokens.length > 0) {
        filtered = filtered.filter((branch) =>
          branchMatchesDiscoverQueryTokens(branch, queryTokens)
        );
      }

      return filtered;
    },
    [appliedFilters, ratingThreshold]
  );

  const filterMarkers = useCallback(
    (markers: DiscoverMapMarker[]): DiscoverMapMarker[] => {
      let filtered =
        ratingThreshold === null
          ? markers
          : markers.filter((item) => {
              const numericRating = resolveRating(item.rating, item.ratingFormatted);
              return numericRating !== null && numericRating >= ratingThreshold;
            });

      if (appliedFilters.size > 0) {
        filtered = filtered.filter((item) => appliedFilters.has(item.category));
      }

      return filtered;
    },
    [appliedFilters, ratingThreshold]
  );

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

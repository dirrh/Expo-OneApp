// useHomeSearch: stav a orchestrace Home Search V2.
// Zodpovednost: query/scope/history + napojenie na Home search engine.
// Vstup/Vystup: vracia UI-friendly API pre HomeSearchOverlay.

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BranchData, DiscoverCategory } from "../interfaces";
import { HOME_SEARCH_SCORE_THRESHOLD, buildHomeSearchIndex, searchHomeBranches } from "../search/homeSearch";
import type { HomeSearchResult, HomeSearchScope } from "../search/homeSearchTypes";
import { HOME_SEARCH_POPULAR_QUERIES } from "../data/search/mockBranchSearchMetadata";

const HOME_SEARCH_HISTORY_STORAGE_KEY = "home_search_history_v1";
const HOME_SEARCH_HISTORY_LIMIT = 8;
const HOME_SEARCH_DEBOUNCE_MS = 80;

const normalizeQuery = (value: string) => value.trim();

const parseHistoryPayload = (payload: string | null): string[] => {
  if (!payload) {
    return [];
  }

  try {
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => (typeof item === "string" ? normalizeQuery(item) : ""))
      .filter((item): item is string => item.length > 0)
      .slice(0, HOME_SEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
};

const toHomeScope = (category: "All" | DiscoverCategory): HomeSearchScope => category;

const SCOPE_OPTIONS: HomeSearchScope[] = ["All", "Fitness", "Gastro", "Beauty", "Relax"];

export interface UseHomeSearchOptions {
  branches: BranchData[];
  selectedCategory: "All" | DiscoverCategory;
  isVisible: boolean;
  localeKey: string;
  enabled: boolean;
}

export interface UseHomeSearchReturn {
  query: string;
  setQuery: (value: string) => void;
  scope: HomeSearchScope;
  setScope: (value: HomeSearchScope) => void;
  scopeOptions: HomeSearchScope[];
  history: string[];
  clearHistory: () => void;
  applySuggestionQuery: (value: string) => void;
  rememberQuery: (value: string) => void;
  results: HomeSearchResult[];
  isSearchActive: boolean;
  popularQueries: string[];
  resetSearch: () => void;
}

export const useHomeSearch = ({
  branches,
  selectedCategory,
  isVisible,
  localeKey,
  enabled,
}: UseHomeSearchOptions): UseHomeSearchReturn => {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<HomeSearchScope>("All");
  const [history, setHistory] = useState<string[]>([]);
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const wasVisibleRef = useRef(isVisible);

  useEffect(() => {
    const shouldSyncScopeOnOpen = isVisible && !wasVisibleRef.current;
    if (shouldSyncScopeOnOpen) {
      setScope(toHomeScope(selectedCategory));
    }
    wasVisibleRef.current = isVisible;
  }, [isVisible, selectedCategory]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(deferredQuery);
    }, HOME_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [deferredQuery]);

  useEffect(() => {
    let isActive = true;

    void AsyncStorage.getItem(HOME_SEARCH_HISTORY_STORAGE_KEY)
      .then((payload) => {
        if (!isActive) {
          return;
        }
        setHistory(parseHistoryPayload(payload));
        setHistoryHydrated(true);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        setHistory([]);
        setHistoryHydrated(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!historyHydrated) {
      return;
    }
    void AsyncStorage.setItem(HOME_SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history, historyHydrated]);

  const index = useMemo(() => buildHomeSearchIndex(branches), [branches, localeKey]);

  const results = useMemo(() => {
    if (!enabled || !isVisible) {
      return [];
    }

    return searchHomeBranches(index, debouncedQuery, {
      scope,
      threshold: HOME_SEARCH_SCORE_THRESHOLD,
    });
  }, [debouncedQuery, enabled, index, isVisible, scope]);

  const rememberQuery = useCallback((value: string) => {
    const normalized = normalizeQuery(value);
    if (!normalized) {
      return;
    }

    setHistory((prev) => [
      normalized,
      ...prev.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase()),
    ].slice(0, HOME_SEARCH_HISTORY_LIMIT));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const applySuggestionQuery = useCallback((value: string) => {
    const normalized = normalizeQuery(value);
    setQuery(normalized);
  }, []);

  const resetSearch = useCallback(() => {
    setQuery("");
  }, []);

  return {
    query,
    setQuery,
    scope,
    setScope,
    scopeOptions: SCOPE_OPTIONS,
    history,
    clearHistory,
    applySuggestionQuery,
    rememberQuery,
    results,
    isSearchActive: normalizeQuery(query).length > 0,
    popularQueries: [...HOME_SEARCH_POPULAR_QUERIES],
    resetSearch,
  };
};

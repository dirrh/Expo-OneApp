/**
 * discoverSearchUtils: Shared helpers for Discover search.
 *
 * Why: Keeping normalization, indexing, and filtering in one place gives
 * consistent behavior across Discover surfaces.
 */

import type { BranchData, DiscoverFavoritePlace, Location } from "../interfaces";
import { NITRA_CENTER } from "../constants/discoverUi";

interface BuildDiscoverFavoritePlacesOptions {
  locations: Location[];
  userCoord: [number, number] | null;
  t: (key: string) => string;
}

export interface DiscoverBranchSearchIndexEntry {
  branch: BranchData;
  searchableText: string;
}

export interface DiscoverBranchSearchIndex {
  entries: DiscoverBranchSearchIndexEntry[];
  branches: BranchData[];
}

const DIACRITIC_REGEX = /[\u0300-\u036f]/g;
const NON_ALNUM_REGEX = /[^a-z0-9]+/g;
const WHITESPACE_REGEX = /\s+/g;
const branchSearchTextCache = new WeakMap<BranchData, string>();

const isValidCoord = (coord?: [number, number] | null): coord is [number, number] =>
  Array.isArray(coord) &&
  coord.length === 2 &&
  Number.isFinite(coord[0]) &&
  Number.isFinite(coord[1]);

const resolveLabel = (label: string, t: (key: string) => string): string => {
  const translated = t(label);
  if (typeof translated === "string" && translated.trim().length > 0 && translated !== label) {
    return translated;
  }
  return label;
};

const dedupeFavorites = (items: DiscoverFavoritePlace[]): DiscoverFavoritePlace[] => {
  const seen = new Set<string>();
  const deduped: DiscoverFavoritePlace[] = [];

  items.forEach((item) => {
    const key = `${item.label.toLowerCase()}|${item.coord[0].toFixed(6)}|${item.coord[1].toFixed(6)}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(item);
  });

  return deduped;
};

export const normalizeDiscoverSearchText = (value?: string | null): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(DIACRITIC_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(WHITESPACE_REGEX, " ");
};

export const tokenizeDiscoverSearchQuery = (query: string): string[] => {
  const normalizedQuery = normalizeDiscoverSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  return normalizedQuery
    .split(NON_ALNUM_REGEX)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
};

const collectBranchSearchTerms = (branch: BranchData): string[] => [
  branch.title,
  branch.address ?? "",
  ...(branch.searchAliases ?? []),
  ...(branch.searchTags ?? []),
  ...(branch.searchMenuItems ?? []),
];

export const buildDiscoverBranchSearchText = (branch: BranchData): string => {
  const cached = branchSearchTextCache.get(branch);
  if (cached) {
    return cached;
  }

  const uniqueTerms = Array.from(
    new Set(
      collectBranchSearchTerms(branch)
        .map((item) => normalizeDiscoverSearchText(item))
        .filter((item) => item.length > 0)
    )
  );

  const searchableText = uniqueTerms.join(" ");
  branchSearchTextCache.set(branch, searchableText);
  return searchableText;
};

const matchesQueryTokens = (searchableText: string, queryTokens: readonly string[]): boolean => {
  if (queryTokens.length === 0) {
    return true;
  }

  if (!searchableText.includes(queryTokens[0])) {
    return false;
  }

  for (let index = 1; index < queryTokens.length; index += 1) {
    if (!searchableText.includes(queryTokens[index])) {
      return false;
    }
  }

  return true;
};

export const branchMatchesDiscoverQueryTokens = (
  branch: BranchData,
  queryTokens: readonly string[]
): boolean => matchesQueryTokens(buildDiscoverBranchSearchText(branch), queryTokens);

export const buildDiscoverFavoritePlaces = ({
  locations,
  userCoord,
  t,
}: BuildDiscoverFavoritePlacesOptions): DiscoverFavoritePlace[] => {
  const savedPlaces = locations
    .filter((item) => item.isSaved && isValidCoord(item.coord))
    .map((item, index) => ({
      id: `saved-${index}-${item.label}`,
      label: item.label,
      coord: item.coord as [number, number],
      isSaved: true,
    }));

  if (savedPlaces.length > 0) {
    return dedupeFavorites(savedPlaces);
  }

  const fallback: DiscoverFavoritePlace[] = [];

  if (isValidCoord(userCoord)) {
    fallback.push({
      id: "favorite-your-location",
      label: resolveLabel("yourLocation", t),
      coord: userCoord,
      isSaved: false,
    });
  }

  const nitraFromLocations = locations.find((item) => item.label === "nitra");
  const nitraCoord = isValidCoord(nitraFromLocations?.coord) ? nitraFromLocations.coord : NITRA_CENTER;
  fallback.push({
    id: "favorite-nitra",
    label: resolveLabel("nitra", t),
    coord: nitraCoord,
    isSaved: false,
  });

  return dedupeFavorites(fallback);
};

const compareBranchesForSearchOrder = (a: BranchData, b: BranchData): number => {
  const aDistance = parseDistanceKm(a.distance);
  const bDistance = parseDistanceKm(b.distance);
  if (aDistance !== bDistance) {
    return aDistance - bDistance;
  }

  if (a.rating !== b.rating) {
    return b.rating - a.rating;
  }

  return a.title.localeCompare(b.title);
};

export const buildDiscoverBranchSearchIndex = (
  branches: BranchData[]
): DiscoverBranchSearchIndex => {
  const sortedBranches = [...branches].sort(compareBranchesForSearchOrder);

  const entries = sortedBranches.map((branch) => ({
    branch,
    searchableText: buildDiscoverBranchSearchText(branch),
  }));

  return {
    entries,
    branches: sortedBranches,
  };
};

export const filterDiscoverBranchSearchIndex = (
  index: DiscoverBranchSearchIndex,
  query: string
): BranchData[] => {
  const queryTokens = tokenizeDiscoverSearchQuery(query);
  if (queryTokens.length === 0) {
    return index.branches;
  }

  return index.entries
    .filter((entry) => matchesQueryTokens(entry.searchableText, queryTokens))
    .map((entry) => entry.branch);
};

export const filterDiscoverBranchesByQuery = (
  branches: BranchData[],
  query: string
): BranchData[] =>
  filterDiscoverBranchSearchIndex(buildDiscoverBranchSearchIndex(branches), query);

export const sortByNearestDistance = <T extends { distanceKm: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.distanceKm - b.distanceKm);

const parseDistanceKm = (distance: string | undefined): number => {
  if (typeof distance !== "string") {
    return Number.POSITIVE_INFINITY;
  }

  const normalized = distance.replace(",", ".").trim().toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

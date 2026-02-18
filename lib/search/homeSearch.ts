// homeSearch: fulltext-like scoring engine pre Home Search V2.
// Zodpovednost: stavia index a pocita relevance score vysledkov.
// Vstup/Vystup: buildHomeSearchIndex + searchHomeBranches.

import type { BranchData } from "../interfaces";
import { normalizeId } from "../data/utils/id";
import { getMockBranchSearchMetadata } from "../data/search/mockBranchSearchMetadata";
import type {
  HomeSearchIndex,
  HomeSearchIndexEntry,
  HomeSearchMatchReason,
  HomeSearchResult,
  HomeSearchScope,
  SearchHomeBranchesOptions,
} from "./homeSearchTypes";

const DIACRITIC_REGEX = /[\u0300-\u036f]/g;
const NON_ALNUM_REGEX = /[^a-z0-9]+/g;
const DISTANCE_REGEX = /(\d+(?:[.,]\d+)?)/;

const SCORE_NAME_EXACT = 120;
const SCORE_NAME_PREFIX = 90;
const SCORE_TAG_MENU_ALIAS_EXACT = 80;
const SCORE_TAG_MENU_ALIAS_PREFIX = 55;
const SCORE_CATEGORY = 25;
const SCORE_OFFER = 20;

const DISTANCE_BOOST_MAX = 20;
const DISTANCE_BOOST_COEF = 4;
const RATING_BOOST_COEF = 2;

export const HOME_SEARCH_SCORE_THRESHOLD = 40;

const REASON_PRIORITY: HomeSearchMatchReason[] = [
  "name",
  "menu",
  "tag",
  "alias",
  "category",
  "offer",
];

const SYNONYM_MAP: Record<string, string[]> = {
  burger: ["hamburger"],
  hamburger: ["burger"],
  kava: ["coffee", "cafe", "caffe"],
  coffee: ["kava", "cafe", "caffe"],
  kebab: ["doner"],
  doner: ["kebab"],
  pizza: ["pizzeria"],
  pizzeria: ["pizza"],
};

const normalizeSearchText = (value?: string | null): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(DIACRITIC_REGEX, "")
    .toLowerCase()
    .trim();
};

const tokenize = (value?: string | null): string[] => {
  const normalized = normalizeSearchText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(NON_ALNUM_REGEX)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
};

const toTokenSet = (terms: string[]): Set<string> => {
  const tokens = terms.flatMap((term) => tokenize(term));
  return new Set(tokens);
};

const parseDistanceKm = (distance?: string): number => {
  if (typeof distance !== "string") {
    return Number.POSITIVE_INFINITY;
  }

  const match = distance.match(DISTANCE_REGEX);
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const toTermArray = (value?: string[] | string): string[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
};

const mergeTerms = (...values: Array<string[] | string | undefined>): string[] => {
  const merged = values
    .flatMap((value) => toTermArray(value))
    .map((item) => normalizeSearchText(item))
    .filter((item) => item.length > 0);

  return Array.from(new Set(merged));
};

const expandTokensWithSynonyms = (tokens: string[]): string[] => {
  if (tokens.length === 0) {
    return [];
  }

  const expanded = new Set<string>();
  tokens.forEach((token) => {
    expanded.add(token);
    const synonyms = SYNONYM_MAP[token];
    if (!synonyms) {
      return;
    }
    synonyms.forEach((synonym) => expanded.add(normalizeSearchText(synonym)));
  });

  return Array.from(expanded).filter((token) => token.length > 0);
};

const resolveDiscoverCategory = (
  value?: string
): "Fitness" | "Gastro" | "Relax" | "Beauty" | undefined => {
  const normalized = normalizeSearchText(value);
  if (normalized === "fitness" || normalized === "fitnes") return "Fitness";
  if (normalized === "gastro" || normalized === "food" || normalized === "jedlo") return "Gastro";
  if (normalized === "relax" || normalized === "wellness") return "Relax";
  if (normalized === "beauty" || normalized === "krasa" || normalized === "kozmetika") {
    return "Beauty";
  }
  return undefined;
};

const toScopeCategory = (scope: HomeSearchScope): string => normalizeSearchText(scope);

const getPrimaryReason = (reasons: Set<HomeSearchMatchReason>): HomeSearchMatchReason => {
  for (const reason of REASON_PRIORITY) {
    if (reasons.has(reason)) {
      return reason;
    }
  }
  return "name";
};

const hasPrefixMatch = (tokens: Set<string>, token: string): boolean => {
  if (token.length === 0) {
    return false;
  }
  for (const item of tokens) {
    if (item.startsWith(token)) {
      return true;
    }
  }
  return false;
};

const hasSubstringMatch = (terms: string[], token: string): boolean => {
  if (token.length === 0) {
    return false;
  }
  return terms.some((term) => term.includes(token));
};

const scoreEntryByToken = (
  entry: HomeSearchIndexEntry,
  token: string,
  reasons: Set<HomeSearchMatchReason>
): number => {
  let score = 0;

  if (entry.titleTokenSet.has(token)) {
    score += SCORE_NAME_EXACT;
    reasons.add("name");
  } else if (hasPrefixMatch(entry.titleTokenSet, token)) {
    score += SCORE_NAME_PREFIX;
    reasons.add("name");
  }

  if (entry.menuTokenSet.has(token)) {
    score += SCORE_TAG_MENU_ALIAS_EXACT;
    reasons.add("menu");
  } else if (
    hasPrefixMatch(entry.menuTokenSet, token) ||
    hasSubstringMatch(entry.menuTerms, token)
  ) {
    score += SCORE_TAG_MENU_ALIAS_PREFIX;
    reasons.add("menu");
  }

  if (entry.tagTokenSet.has(token)) {
    score += SCORE_TAG_MENU_ALIAS_EXACT;
    reasons.add("tag");
  } else if (
    hasPrefixMatch(entry.tagTokenSet, token) ||
    hasSubstringMatch(entry.tagTerms, token)
  ) {
    score += SCORE_TAG_MENU_ALIAS_PREFIX;
    reasons.add("tag");
  }

  if (entry.aliasTokenSet.has(token)) {
    score += SCORE_TAG_MENU_ALIAS_EXACT;
    reasons.add("alias");
  } else if (
    hasPrefixMatch(entry.aliasTokenSet, token) ||
    hasSubstringMatch(entry.aliasTerms, token)
  ) {
    score += SCORE_TAG_MENU_ALIAS_PREFIX;
    reasons.add("alias");
  }

  if (entry.categoryTokenSet.has(token) || entry.categoryTerm.includes(token)) {
    score += SCORE_CATEGORY;
    reasons.add("category");
  }

  if (entry.offerTokenSet.has(token) || hasSubstringMatch(entry.offerTerms, token)) {
    score += SCORE_OFFER;
    reasons.add("offer");
  }

  return score;
};

const buildIndexEntry = (branch: BranchData): HomeSearchIndexEntry => {
  const categoryTerm = normalizeSearchText(branch.category);
  const discoverCategory = resolveDiscoverCategory(branch.category);
  const mockMetadata = getMockBranchSearchMetadata(
    branch.id,
    discoverCategory,
    branch.title
  );

  const idAlias = normalizeId(String(branch.id ?? ""));
  const titleAlias = normalizeSearchText(branch.title);

  const tagTerms = mergeTerms(branch.searchTags, mockMetadata.searchTags);
  const menuTerms = mergeTerms(branch.searchMenuItems, mockMetadata.searchMenuItems);
  const aliasTerms = mergeTerms(
    branch.searchAliases,
    mockMetadata.searchAliases,
    idAlias ? idAlias.replace(/_/g, " ") : undefined,
    titleAlias
  );
  const offerTerms = mergeTerms(branch.offers);
  const titleTokens = tokenize(branch.title);

  return {
    branch,
    dedupeKey: normalizeId(String(branch.id ?? branch.title)),
    titleTokens,
    titleTokenSet: new Set(titleTokens),
    tagTerms,
    tagTokenSet: toTokenSet(tagTerms),
    menuTerms,
    menuTokenSet: toTokenSet(menuTerms),
    aliasTerms,
    aliasTokenSet: toTokenSet(aliasTerms),
    offerTerms,
    offerTokenSet: toTokenSet(offerTerms),
    categoryTerm,
    categoryTokenSet: new Set(tokenize(categoryTerm)),
    distanceKm: parseDistanceKm(branch.distance),
  };
};

export const buildHomeSearchIndex = (branches: BranchData[]): HomeSearchIndex => {
  const deduped = new Map<string, BranchData>();

  branches.forEach((branch) => {
    const dedupeKey = normalizeId(String(branch.id ?? branch.title));
    if (!dedupeKey || deduped.has(dedupeKey)) {
      return;
    }
    deduped.set(dedupeKey, branch);
  });

  return {
    entries: Array.from(deduped.values()).map((branch) => buildIndexEntry(branch)),
  };
};

export const searchHomeBranches = (
  index: HomeSearchIndex,
  query: string,
  options: SearchHomeBranchesOptions = {}
): HomeSearchResult[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  const queryTokens = expandTokensWithSynonyms(tokenize(normalizedQuery));
  if (queryTokens.length === 0) {
    return [];
  }

  const scope = options.scope ?? "All";
  const threshold = options.threshold ?? HOME_SEARCH_SCORE_THRESHOLD;
  const scopeCategory = scope === "All" ? null : toScopeCategory(scope);

  const ranked = index.entries
    .filter((entry) => {
      if (!scopeCategory) {
        return true;
      }
      return entry.categoryTerm === scopeCategory;
    })
    .map<HomeSearchResult | null>((entry) => {
      const reasons = new Set<HomeSearchMatchReason>();
      const baseScore = queryTokens.reduce(
        (sum, token) => sum + scoreEntryByToken(entry, token, reasons),
        0
      );

      if (baseScore <= 0) {
        return null;
      }

      const distanceBoost = Number.isFinite(entry.distanceKm)
        ? Math.max(0, DISTANCE_BOOST_MAX - entry.distanceKm * DISTANCE_BOOST_COEF)
        : 0;
      const ratingBoost = Number.isFinite(entry.branch.rating)
        ? entry.branch.rating * RATING_BOOST_COEF
        : 0;
      const totalScore = baseScore + distanceBoost + ratingBoost;

      if (totalScore < threshold) {
        return null;
      }

      return {
        branch: entry.branch,
        score: totalScore,
        distanceKm: entry.distanceKm,
        reasons: Array.from(reasons),
        primaryReason: getPrimaryReason(reasons),
      };
    })
    .filter((result): result is HomeSearchResult => Boolean(result))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }

      if (b.branch.rating !== a.branch.rating) {
        return b.branch.rating - a.branch.rating;
      }

      return a.branch.title.localeCompare(b.branch.title);
    });

  if (typeof options.limit === "number" && Number.isFinite(options.limit) && options.limit > 0) {
    return ranked.slice(0, Math.floor(options.limit));
  }

  return ranked;
};

import type { BranchData } from "../lib/interfaces";
import { mockSource } from "../lib/data/mockSource";
import { normalizeId } from "../lib/data/utils/id";
import { buildHomeSearchIndex, searchHomeBranches } from "../lib/search/homeSearch";

const fail = (message: string): never => {
  throw new Error(`[home-search] ${message}`);
};

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    fail(message);
  }
};

const toTitleFromId = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");

const dummyImage = 1 as unknown as BranchData["image"];

const loadBranches = async (): Promise<BranchData[]> => {
  const [branchDtos, markerDtos] = await Promise.all([
    mockSource.getBranches(),
    mockSource.getMarkers(),
  ]);

  const branchesById = new Map<string, BranchData>();

  branchDtos.forEach((dto) => {
    const id = String(dto.id);
    const key = normalizeId(id || dto.title || "");
    if (!key) {
      return;
    }

    branchesById.set(key, {
      id,
      title: dto.title ?? toTitleFromId(id),
      image: dummyImage,
      rating: dto.rating ?? 4.5,
      distance: dto.distance ?? "1.7 km",
      hours: dto.hours ?? "9:00 - 21:00",
      category: dto.category ?? "Fitness",
      searchTags: dto.searchTags ?? undefined,
      searchMenuItems: dto.searchMenuItems ?? undefined,
      searchAliases: dto.searchAliases ?? undefined,
    });
  });

  markerDtos.forEach((marker) => {
    if (marker.category === "Multi") {
      return;
    }

    const key = normalizeId(marker.id);
    if (!key || branchesById.has(key)) {
      return;
    }

    branchesById.set(key, {
      id: marker.id,
      title: marker.title ?? toTitleFromId(marker.id),
      image: dummyImage,
      rating: marker.rating ?? 4.5,
      distance: "1.7 km",
      hours: "9:00 - 21:00",
      category: marker.category,
    });
  });

  return Array.from(branchesById.values());
};

const getId = (branch: BranchData) => String(branch.id ?? branch.title);

const testBurgerQuery = (branches: BranchData[]) => {
  const index = buildHomeSearchIndex(branches);
  const results = searchHomeBranches(index, "burger", { scope: "All" });
  assert(results.length > 0, "query 'burger' should return results");

  const hasBurgerRelevantResult = results.some((item) => {
    const title = item.branch.title.toLowerCase();
    const menu = (item.branch.searchMenuItems ?? []).join(" ").toLowerCase();
    const tags = (item.branch.searchTags ?? []).join(" ").toLowerCase();
    return title.includes("burger") || menu.includes("burger") || tags.includes("burger");
  });

  assert(hasBurgerRelevantResult, "query 'burger' should match name/tag/menu");
};

const testDiacriticsAndSynonyms = (branches: BranchData[]) => {
  const index = buildHomeSearchIndex(branches);
  const withDiacritics = searchHomeBranches(index, "k\u00E1va");
  const withoutDiacritics = searchHomeBranches(index, "kava");

  assert(withDiacritics.length > 0, "query with diacritics should return results");
  assert(withoutDiacritics.length > 0, "query 'kava' should return results");

  const topDiacriticIds = new Set(withDiacritics.slice(0, 6).map((item) => getId(item.branch)));
  const overlap = withoutDiacritics
    .slice(0, 6)
    .some((item) => topDiacriticIds.has(getId(item.branch)));
  assert(overlap, "diacritic and non-diacritic queries should overlap in top results");

  const hasCoffeeLikeResult = withoutDiacritics.some((item) => {
    const haystack = [
      item.branch.title,
      ...(item.branch.searchTags ?? []),
      ...(item.branch.searchAliases ?? []),
      ...(item.branch.searchMenuItems ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes("coffee") || haystack.includes("cafe") || haystack.includes("caffe");
  });

  assert(hasCoffeeLikeResult, "query 'kava' should match coffee/cafe style results");
};

const testCategoryScope = (branches: BranchData[]) => {
  const index = buildHomeSearchIndex(branches);
  const scoped = searchHomeBranches(index, "burger", { scope: "Gastro" });
  assert(scoped.length > 0, "query 'burger' scoped to Gastro should return results");
  assert(
    scoped.every((item) => item.branch.category === "Gastro"),
    "Gastro scope should only include Gastro branches"
  );
};

const testDistanceRankingTieBreak = () => {
  const dummyImage = 1 as unknown as BranchData["image"];
  const branches: BranchData[] = [
    {
      id: "burger_near",
      title: "Burger Near",
      image: dummyImage,
      rating: 4.2,
      distance: "0.6 km",
      hours: "9:00 - 21:00",
      category: "Gastro",
      searchTags: ["burger"],
    },
    {
      id: "burger_far",
      title: "Burger Far",
      image: dummyImage,
      rating: 4.9,
      distance: "3.1 km",
      hours: "9:00 - 21:00",
      category: "Gastro",
      searchTags: ["burger"],
    },
  ];

  const results = searchHomeBranches(buildHomeSearchIndex(branches), "burger", { scope: "All" });
  assert(results.length >= 2, "distance ranking test requires 2 results");
  assert(
    getId(results[0].branch) === "burger_near",
    "nearer branch should rank above farther one when relevance is equal"
  );
};

const testEmptyStateQuery = (branches: BranchData[]) => {
  const index = buildHomeSearchIndex(branches);
  const results = searchHomeBranches(index, "zzzxxyyqqq");
  assert(results.length === 0, "nonsense query should return no results");
};

const run = async () => {
  const branches = await loadBranches();
  testBurgerQuery(branches);
  testDiacriticsAndSynonyms(branches);
  testCategoryScope(branches);
  testDistanceRankingTieBreak();
  testEmptyStateQuery(branches);
  console.log("[home-search] all tests passed");
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[home-search] failed:", message);
  process.exitCode = 1;
});

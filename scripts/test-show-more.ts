import type { BranchData } from "../lib/interfaces";
import {
  filterShowMoreByCategory,
  getShowMoreSectionBranches,
  resolveInitialShowMoreCategory,
} from "../lib/home/showMoreUtils";

const fail = (message: string): never => {
  throw new Error(`[show-more] ${message}`);
};

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    fail(message);
  }
};

const dummyImage = 1 as unknown as BranchData["image"];

const makeBranch = (
  id: string,
  title: string,
  rating: number,
  category: string
): BranchData => ({
  id,
  title,
  image: dummyImage,
  rating,
  distance: "1.0 km",
  hours: "9:00 - 21:00",
  category,
});

const branches: BranchData[] = [
  makeBranch("a", "Alpha Gym", 4.5, "Fitness"),
  makeBranch("b", "Bravo Burger", 4.7, "Gastro"),
  makeBranch("c", "Charlie Spa", 4.7, "Relax"),
  makeBranch("d", "Delta Beauty", 4.1, "Beauty"),
  makeBranch("e", "Echo Food", 4.0, "food"),
];

const testTopRatedSort = () => {
  const sorted = getShowMoreSectionBranches(branches, "topRated");
  assert(sorted.length === branches.length, "topRated should keep list length");
  assert(sorted[0].rating >= sorted[1].rating, "topRated should sort by rating DESC");
  assert(sorted[1].rating >= sorted[2].rating, "topRated should keep rating DESC order");
  assert(
    sorted[0].title === "Bravo Burger" && sorted[1].title === "Charlie Spa",
    "topRated tie should use title ASC"
  );
};

const testCategoryFiltering = () => {
  const gastroOnly = filterShowMoreByCategory(branches, "Gastro");
  assert(gastroOnly.length === 2, "Gastro filter should include both direct and alias category");
  assert(
    gastroOnly.every((item) => item.title.includes("Burger") || item.title.includes("Food")),
    "Gastro filter should return only Gastro-mapped branches"
  );

  const allItems = filterShowMoreByCategory(branches, "All");
  assert(allItems.length === branches.length, "All filter should return all branches");
};

const testInitialCategoryResolve = () => {
  assert(
    resolveInitialShowMoreCategory("gastro") === "Gastro",
    "initial category should normalize alias to Gastro"
  );
  assert(
    resolveInitialShowMoreCategory("all") === "All",
    "initial category should normalize all"
  );
  assert(
    resolveInitialShowMoreCategory(undefined) === "All",
    "missing initial category should fallback to All"
  );
};

const run = () => {
  testTopRatedSort();
  testCategoryFiltering();
  testInitialCategoryResolve();
  console.log("[show-more] all tests passed");
};

run();


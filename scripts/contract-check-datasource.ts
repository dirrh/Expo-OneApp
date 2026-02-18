import { mockSource } from "../lib/data/mockSource";
import { apiSource } from "../lib/data/apiSource";
import { supabaseSource } from "../lib/data/supabaseSource";
import type { BranchDto, MarkerDto } from "../lib/data/models";
import type { DataSource } from "../lib/data/source";
import { normalizeId } from "../lib/data/utils/id";

// Lightweight kontrakt check pre mock/api/supabase datasource.
type SourceEntry = {
  name: "mock" | "api" | "supabase";
  source: DataSource;
};

const SOURCES: SourceEntry[] = [
  { name: "mock", source: mockSource },
  { name: "api", source: apiSource },
  { name: "supabase", source: supabaseSource },
];

const isString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isOptionalString = (value: unknown) =>
  value === undefined || value === null || typeof value === "string";

const isOptionalNumber = (value: unknown) =>
  value === undefined || value === null || (typeof value === "number" && Number.isFinite(value));

const isOptionalStringArray = (value: unknown) =>
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.every((item) => typeof item === "string"));

const fail = (message: string): never => {
  throw new Error(message);
};

const validateBranch = (sourceName: string, branch: BranchDto, index: number) => {
  if (!isString(branch.id)) {
    fail(`[${sourceName}] branch[${index}] has invalid id`);
  }

  if (!normalizeId(branch.id)) {
    fail(`[${sourceName}] branch[${index}] id cannot be canonicalized: ${branch.id}`);
  }

  if (!isOptionalString(branch.title)) {
    fail(`[${sourceName}] branch[${index}] title must be string/null`);
  }

  if (!isOptionalNumber(branch.rating)) {
    fail(`[${sourceName}] branch[${index}] rating must be finite number/null`);
  }

  if (!isOptionalString(branch.distance)) {
    fail(`[${sourceName}] branch[${index}] distance must be string/null`);
  }

  if (!isOptionalString(branch.hours)) {
    fail(`[${sourceName}] branch[${index}] hours must be string/null`);
  }

  if (!isOptionalStringArray(branch.searchTags)) {
    fail(`[${sourceName}] branch[${index}] searchTags must be string[]/null`);
  }

  if (!isOptionalStringArray(branch.searchMenuItems)) {
    fail(`[${sourceName}] branch[${index}] searchMenuItems must be string[]/null`);
  }

  if (!isOptionalStringArray(branch.searchAliases)) {
    fail(`[${sourceName}] branch[${index}] searchAliases must be string[]/null`);
  }

  if (
    branch.coordinates !== undefined &&
    branch.coordinates !== null &&
    (!Array.isArray(branch.coordinates) ||
      branch.coordinates.length !== 2 ||
      !Number.isFinite(branch.coordinates[0]) ||
      !Number.isFinite(branch.coordinates[1]))
  ) {
    fail(`[${sourceName}] branch[${index}] coordinates must be [lng, lat] numbers`);
  }
};

const validateMarker = (sourceName: string, marker: MarkerDto, index: number) => {
  if (!isString(marker.id)) {
    fail(`[${sourceName}] marker[${index}] has invalid id`);
  }

  if (!normalizeId(marker.id)) {
    fail(`[${sourceName}] marker[${index}] id cannot be canonicalized: ${marker.id}`);
  }

  if (!marker.coord || !Number.isFinite(marker.coord.lng) || !Number.isFinite(marker.coord.lat)) {
    fail(`[${sourceName}] marker[${index}] has invalid coordinates`);
  }

  if (!isString(marker.category)) {
    fail(`[${sourceName}] marker[${index}] category must be non-empty string`);
  }

  if (!isOptionalNumber(marker.rating)) {
    fail(`[${sourceName}] marker[${index}] rating must be finite number/null`);
  }

  if (!isOptionalString(marker.title)) {
    fail(`[${sourceName}] marker[${index}] title must be string/null`);
  }
};

const descriptorForBranch = (branch: BranchDto) => ({
  id: typeof branch.id,
  title: typeof branch.title,
  category: typeof branch.category,
  rating: typeof branch.rating,
  coord: Array.isArray(branch.coordinates) ? "array" : typeof branch.coordinates,
  hours: typeof branch.hours,
  distance: typeof branch.distance,
  searchTags: Array.isArray(branch.searchTags) ? "array" : typeof branch.searchTags,
  searchMenuItems: Array.isArray(branch.searchMenuItems) ? "array" : typeof branch.searchMenuItems,
  searchAliases: Array.isArray(branch.searchAliases) ? "array" : typeof branch.searchAliases,
});

const descriptorForMarker = (marker: MarkerDto) => ({
  id: typeof marker.id,
  title: typeof marker.title,
  category: typeof marker.category,
  rating: typeof marker.rating,
  coord: typeof marker.coord,
  lng: typeof marker.coord?.lng,
  lat: typeof marker.coord?.lat,
  groupId: typeof marker.groupId,
});

const stableStringify = (value: unknown) => JSON.stringify(value, Object.keys(value as object).sort());

const compareDescriptors = (
  typeName: "branch" | "marker",
  baselineSource: string,
  baselineValue: string,
  candidateSource: string,
  candidateValue: string
) => {
  if (baselineValue !== candidateValue) {
    fail(
      `Shape mismatch for ${typeName}: baseline=${baselineSource}(${baselineValue}) vs ${candidateSource}(${candidateValue})`
    );
  }
};

const checkSource = async ({ name, source }: SourceEntry) => {
  const [branches, markers] = await Promise.all([
    source.getBranches(),
    source.getMarkers(),
  ]);

  if (!Array.isArray(branches)) {
    fail(`[${name}] getBranches() did not return an array`);
  }
  if (!Array.isArray(markers)) {
    fail(`[${name}] getMarkers() did not return an array`);
  }
  if (markers.length === 0) {
    fail(`[${name}] getMarkers() returned an empty array`);
  }

  branches.forEach((branch, index) => validateBranch(name, branch, index));
  markers.forEach((marker, index) => validateMarker(name, marker, index));

  const sampleIds = Array.from(
    new Set([
      ...markers.slice(0, 8).map((marker) => marker.id),
      "Diamond gym",
      "diamond_gym",
    ])
  );

  for (const sampleId of sampleIds) {
    const branch = await source.getBranchById(sampleId);
    if (branch) {
      validateBranch(name, branch, -1);
    }
  }

  return {
    name,
    branchCount: branches.length,
    markerCount: markers.length,
    branchDescriptor: stableStringify(descriptorForBranch(branches[0] ?? { id: "" })),
    markerDescriptor: stableStringify(descriptorForMarker(markers[0])),
  };
};

const run = async () => {
  const results = [] as Awaited<ReturnType<typeof checkSource>>[];

  for (const sourceEntry of SOURCES) {
    results.push(await checkSource(sourceEntry));
  }

  const baseline = results[0];
  results.slice(1).forEach((result) => {
    compareDescriptors(
      "branch",
      baseline.name,
      baseline.branchDescriptor,
      result.name,
      result.branchDescriptor
    );
    compareDescriptors(
      "marker",
      baseline.name,
      baseline.markerDescriptor,
      result.name,
      result.markerDescriptor
    );
  });

  console.log("[contracts] datasource contract check passed");
  results.forEach((result) => {
    console.log(
      `[contracts] ${result.name}: branches=${result.branchCount}, markers=${result.markerCount}`
    );
  });
};

run().catch((error) => {
  console.error("[contracts] datasource contract check failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

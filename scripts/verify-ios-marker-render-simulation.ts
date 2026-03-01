import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { loadImage } from "canvas";
import type { DiscoverMapMarker } from "../lib/interfaces";
import type * as IOSV3DatasetModule from "../components/discover/map/ios_v3/buildIOSV3Dataset";

type MarkerCategory = "Fitness" | "Gastro" | "Relax" | "Beauty" | "Multi";

type MarkerLike = {
  id: string;
  lat: number;
  lng: number;
  category: MarkerCategory;
  groupId?: string;
  markerSpriteKey?: string;
};

type ImageSize = {
  width: number;
  height: number;
};

type SimulatedSingleMarker = {
  id: string;
  groupKey: string;
  size: ImageSize;
  sourcePath: string;
  sourceKind: "full" | "labeled" | "compact";
};

type TextMode = "dynamic" | "always" | "off";

const ROOT_DIR = path.resolve(__dirname, "..");

const DEFAULT_POOL_SIZE = 48;
const MIN_POOL_SIZE = 16;
const MAX_POOL_SIZE = 96;
const EXPECTED_IOS_SINGLE_MARKER_CANVAS_SIZE = "402x172";
const VIEWPORT_SIZE = { width: 390, height: 844 } as const;
const RENDER_ZOOM = 18;
const FULL_PATH_SEGMENT = "/full-markers/";
const LABELED_PATH_SEGMENT = "/labeled-pins/";
const COMPACT_PATH_SEGMENT = "/compact-pins/";
const KNOWN_TEXT_CAPABLE_IDS = [
  "gym_365",
  "diamond_gym",
  "bodyworld_fitness",
  "fit_bar_nitra",
  "kelo_gym",
  "fit_club_olympia",
  "for_sport_nitra",
  "intersport_mlyny_nitra",
  "intersport_promenada_nitra",
  "top_sport_gym",
] as const;

const resolvePoolSize = () => {
  const raw = process.env.EXPO_PUBLIC_MAP_IOS_POOL_SIZE;
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_POOL_SIZE;
  }
  return Math.max(MIN_POOL_SIZE, Math.min(MAX_POOL_SIZE, parsed));
};

const resolveTextMode = (): TextMode => {
  const normalized = process.env.EXPO_PUBLIC_MAP_IOS_TEXT_MODE?.trim().toLowerCase();
  if (normalized === "off") {
    return "off";
  }
  if (normalized === "always") {
    return "always";
  }
  return "dynamic";
};

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const loadDatasetModule = async (): Promise<typeof IOSV3DatasetModule> => {
  const nodeRequire = createRequire(import.meta.url) as NodeJS.Require & {
    extensions?: Record<
      string,
      (module: { exports: unknown }, filename: string) => void
    >;
  };

  if (nodeRequire.extensions && !nodeRequire.extensions[".png"]) {
    nodeRequire.extensions[".png"] = (module, filename) => {
      module.exports = filename;
    };
  }

  return import("../components/discover/map/ios_v3/buildIOSV3Dataset");
};

const getImageSizeCached = (() => {
  const cache = new Map<string, ImageSize>();
  return async (sourcePath: string) => {
    const cached = cache.get(sourcePath);
    if (cached) {
      return cached;
    }
    const image = await loadImage(sourcePath);
    const next = { width: image.width, height: image.height };
    cache.set(sourcePath, next);
    return next;
  };
})();

const summarizeBySize = (markers: SimulatedSingleMarker[]) => {
  const counts = new Map<string, { count: number; sampleIds: string[] }>();
  markers.forEach((marker) => {
    const sizeKey = `${marker.size.width}x${marker.size.height}`;
    const entry = counts.get(sizeKey);
    if (entry) {
      entry.count += 1;
      if (entry.sampleIds.length < 5) {
        entry.sampleIds.push(marker.id);
      }
      return;
    }
    counts.set(sizeKey, { count: 1, sampleIds: [marker.id] });
  });
  return Array.from(counts.entries())
    .map(([size, info]) => ({ size, ...info }))
    .sort((left, right) => right.count - left.count);
};

const verifyUniformAssetDirectory = async (
  relativeDirectory: string,
  label: string
) => {
  const absoluteDirectory = path.join(ROOT_DIR, relativeDirectory);
  const entries = fs
    .readdirSync(absoluteDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(absoluteDirectory, entry.name));
  assert(entries.length > 0, `[${label}] directory is empty: ${relativeDirectory}`);

  const sizeSet = new Set<string>();
  for (const entry of entries) {
    const size = await getImageSizeCached(entry);
    sizeSet.add(`${size.width}x${size.height}`);
  }

  assert(
    sizeSet.size === 1,
    `[${label}] assets are not uniform: ${Array.from(sizeSet).join(", ")}`
  );
};

const toDiscoverMapMarker = (marker: MarkerLike): DiscoverMapMarker => ({
  id: marker.id,
  title: marker.id,
  markerSpriteKey: marker.markerSpriteKey ?? marker.id,
  coord: { lng: marker.lng, lat: marker.lat },
  icon: 1,
  rating: 4.2,
  ratingFormatted: "4.2",
  category: marker.category,
});

const createSimulationMarkers = (): DiscoverMapMarker[] => {
  const knownMarkers = KNOWN_TEXT_CAPABLE_IDS.map((id, index) =>
    toDiscoverMapMarker({
      id,
      markerSpriteKey: id,
      lat: 48.3069 + index * 0.00015,
      lng: 18.091 + index * 0.00015,
      category: "Fitness",
    })
  );
  const compactOnlyMarkers = Array.from({ length: 20 }, (_, index) =>
    toDiscoverMapMarker({
      id: `compact-only-${index}`,
      markerSpriteKey: `compact-only-${index}`,
      lat: 48.31 + index * 0.0002,
      lng: 18.095 + index * 0.0002,
      category: "Fitness",
    })
  );
  return [...knownMarkers, ...compactOnlyMarkers];
};

const resolveDynamicTextBudget = (
  _singleOnlyGroupCount: number,
  _isMapFullyIdle: boolean
) => {
  return { maxTextMarkers: 8, maxFullMarkers: 8 };
};

const createTextBudget = (
  textMode: TextMode,
  singleOnlyGroupCount: number,
  isMapFullyIdle: boolean
) => {
  if (textMode === "off") {
    return { maxTextMarkers: 0, maxFullMarkers: 0 };
  }
  if (textMode === "always") {
    return { maxTextMarkers: 8, maxFullMarkers: 8 };
  }
  return resolveDynamicTextBudget(singleOnlyGroupCount, isMapFullyIdle);
};

const isSourceKind = (sourcePath: string, segment: string) =>
  sourcePath.replace(/\\/g, "/").includes(segment);

const summarizeKinds = (markers: SimulatedSingleMarker[]) => ({
  fullCount: markers.filter((item) => isSourceKind(item.sourcePath, FULL_PATH_SEGMENT)).length,
  labeledCount: markers.filter((item) => isSourceKind(item.sourcePath, LABELED_PATH_SEGMENT)).length,
  compactCount: markers.filter((item) => isSourceKind(item.sourcePath, COMPACT_PATH_SEGMENT)).length,
});

const run = async () => {
  const poolSize = resolvePoolSize();
  const textMode = resolveTextMode();
  const { buildIOSV3Dataset, groupIOSV3MarkersByLocation } = await loadDatasetModule();

  await verifyUniformAssetDirectory("images/icons/cluster", "cluster");
  await verifyUniformAssetDirectory("images/icons/cluster_orange", "cluster_orange");
  await verifyUniformAssetDirectory("images/icons/stacked", "stacked");
  await verifyUniformAssetDirectory(
    "images/icons/ios-scaled/full-markers",
    "full-markers"
  );
  await verifyUniformAssetDirectory(
    "images/icons/ios-scaled/labeled-pins",
    "labeled-pins"
  );
  await verifyUniformAssetDirectory(
    "images/icons/ios-scaled/compact-pins",
    "compact-pins"
  );

  const discoverMarkers = createSimulationMarkers();
  const grouped = groupIOSV3MarkersByLocation(discoverMarkers);
  const center: [number, number] = [18.091, 48.3069];
  const createSimulatedSingles = async (
    groups: Awaited<ReturnType<typeof groupIOSV3MarkersByLocation>>,
    scenarioTextMode: TextMode,
    isMapFullyIdle: boolean
  ) => {
    const renderedSingles = buildIOSV3Dataset({
      mode: "single",
      groups,
      clusteredFeatures: [],
      hasActiveFilter: false,
      cameraCenter: center,
      renderZoom: RENDER_ZOOM,
      viewportSize: VIEWPORT_SIZE,
      poolSize,
      textBudget: createTextBudget(scenarioTextMode, groups.length, isMapFullyIdle),
    });
    const simulatedSingles: SimulatedSingleMarker[] = [];
    for (const item of renderedSingles) {
      const sourcePath = String(item.image);
      const size = await getImageSizeCached(sourcePath);
      simulatedSingles.push({
        id: item.id,
        groupKey: item.id,
        size,
        sourcePath,
        sourceKind: isSourceKind(sourcePath, FULL_PATH_SEGMENT)
          ? "full"
          : isSourceKind(sourcePath, LABELED_PATH_SEGMENT)
            ? "labeled"
            : "compact",
      });
    }
    return simulatedSingles;
  };

  const lowDensityGroups = grouped.slice(0, 12);
  const highDensityGroups = grouped.slice(0, 30);
  assert(lowDensityGroups.length === 12, "expected 12 low-density groups in simulation");
  assert(highDensityGroups.length === 30, "expected 30 high-density groups in simulation");

  const lowDensityDynamic = await createSimulatedSingles(lowDensityGroups, "dynamic", true);
  const lowDensitySummary = summarizeKinds(lowDensityDynamic);
  const highDensityDynamic = await createSimulatedSingles(highDensityGroups, "dynamic", true);
  const highDensitySummary = summarizeKinds(highDensityDynamic);
  const gestureDynamic = await createSimulatedSingles(lowDensityGroups, "dynamic", false);
  const gestureSummary = summarizeKinds(gestureDynamic);
  const envModeSingles = await createSimulatedSingles(highDensityGroups, textMode, true);

  const simulatedSingles = envModeSingles;

  const sizeSummary = summarizeBySize(simulatedSingles);
  const { fullCount, labeledCount, compactCount } = summarizeKinds(simulatedSingles);

  if (sizeSummary.length > 1) {
    const details = sizeSummary
      .slice(0, 6)
      .map(
        (entry) =>
          `${entry.size} -> count=${entry.count}, sample=${entry.sampleIds.join(", ")}`
      )
      .join(" | ");
    throw new Error(
      `[verify-ios-marker-render-simulation] FAIL: pooled single markers are not uniform in iOS simulation. variants=${sizeSummary.length}, full=${fullCount}, labeled=${labeledCount}, compact=${compactCount}. ${details}`
    );
  }

  const onlySize = sizeSummary[0]?.size ?? "";
  assert(
    onlySize === EXPECTED_IOS_SINGLE_MARKER_CANVAS_SIZE,
    `[verify-ios-marker-render-simulation] FAIL: iOS single-marker canvas must be ${EXPECTED_IOS_SINGLE_MARKER_CANVAS_SIZE}, got ${onlySize}`
  );
  assert(
    compactCount > 0,
    "[verify-ios-marker-render-simulation] FAIL: expected compact shared marker sprites in the pooled single set"
  );
  assert(
    lowDensitySummary.fullCount + lowDensitySummary.labeledCount > 0 &&
      lowDensitySummary.fullCount + lowDensitySummary.labeledCount <= 8,
    "[verify-ios-marker-render-simulation] FAIL: dynamic idle low-density mode must keep between 1 and 8 text markers after collision filtering"
  );
  assert(
    lowDensitySummary.labeledCount === 0,
    "[verify-ios-marker-render-simulation] FAIL: dynamic idle low-density mode must not use narrow labeled marker sprites"
  );
  assert(
    lowDensitySummary.compactCount > 0,
    "[verify-ios-marker-render-simulation] FAIL: dynamic idle low-density mode must still keep compact markers outside the 8-marker text budget"
  );
  assert(
    highDensitySummary.fullCount + highDensitySummary.labeledCount > 0 &&
      highDensitySummary.fullCount + highDensitySummary.labeledCount <= 8,
    "[verify-ios-marker-render-simulation] FAIL: dynamic idle high-density mode must keep between 1 and 8 text markers after collision filtering"
  );
  assert(
    highDensitySummary.labeledCount === 0,
    "[verify-ios-marker-render-simulation] FAIL: dynamic idle high-density mode must not use narrow labeled marker sprites"
  );
  assert(
    gestureSummary.fullCount + gestureSummary.labeledCount > 0 &&
      gestureSummary.fullCount + gestureSummary.labeledCount <= 8,
    "[verify-ios-marker-render-simulation] FAIL: dynamic gesture mode must keep between 1 and 8 text markers after collision filtering"
  );
  assert(
    gestureSummary.labeledCount === 0,
    "[verify-ios-marker-render-simulation] FAIL: dynamic gesture mode must not use narrow labeled marker sprites"
  );
  assert(
    gestureSummary.compactCount > 0,
    "[verify-ios-marker-render-simulation] FAIL: dynamic gesture mode must still keep compact markers outside the 8-marker text budget"
  );
  if (textMode === "off") {
    assert(
      fullCount === 0 && labeledCount === 0,
      "[verify-ios-marker-render-simulation] FAIL: off mode must disable all text markers"
    );
  }
  if (textMode === "always") {
    assert(
      fullCount + labeledCount > 0 && fullCount + labeledCount <= 8,
      "[verify-ios-marker-render-simulation] FAIL: always mode must render between 1 and 8 text-capable markers after collision filtering"
    );
    assert(
      labeledCount === 0,
      "[verify-ios-marker-render-simulation] FAIL: always mode must not use narrow labeled marker sprites"
    );
  }
  if (textMode === "dynamic") {
    assert(
      fullCount + labeledCount > 0 && fullCount + labeledCount <= 8,
      "[verify-ios-marker-render-simulation] FAIL: dynamic env mode must keep between 1 and 8 text-capable markers at idle after collision filtering"
    );
    assert(
      labeledCount === 0,
      "[verify-ios-marker-render-simulation] FAIL: dynamic env mode must not use narrow labeled marker sprites"
    );
  }
  assert(
    poolSize >= MIN_POOL_SIZE && poolSize <= MAX_POOL_SIZE,
    "[verify-ios-marker-render-simulation] FAIL: pool size override must stay within the clamped range"
  );

  console.log(
    `[verify-ios-marker-render-simulation] all checks passed (mode=${textMode}, pool=${poolSize}, singles=${simulatedSingles.length}, size=${onlySize}, full=${fullCount}, labeled=${labeledCount}, compact=${compactCount})`
  );
};

void run();

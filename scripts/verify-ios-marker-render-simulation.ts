import fs from "node:fs";
import path from "node:path";
import { loadImage } from "canvas";
import { coords } from "../lib/data/coords";
import { normalizeId } from "../lib/data/utils/id";

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
  sourceKind: "full" | "full-fallback" | "compact";
};

const ROOT_DIR = path.resolve(__dirname, "..");
const IOS_SCALED_FULL_BY_KEY_FILE = path.join(
  ROOT_DIR,
  "lib/maps/generatedIOSScaledFullMarkerByKey.ts"
);
const FULL_SPRITES_FILE = path.join(
  ROOT_DIR,
  "lib/maps/generatedFullMarkerSprites.ts"
);
const IOS_FULL_FALLBACK_DIR = path.join(
  ROOT_DIR,
  "images/icons/ios-scaled/full-markers-fallback"
);

const DEFAULT_POOL_SIZE = 48;
const MIN_POOL_SIZE = 16;
const MAX_POOL_SIZE = 96;
const EXPECTED_IOS_FULL_MARKER_CANVAS_SIZE = "402x172";

const FITNESS_FALLBACK = path.join(
  ROOT_DIR,
  "images/icons/fitness/fitness_without_review.png"
);
const GASTRO_FALLBACK = path.join(
  ROOT_DIR,
  "images/icons/gastro/gastro_without_rating.png"
);
const RELAX_FALLBACK = path.join(
  ROOT_DIR,
  "images/icons/relax/relax_without_rating.png"
);
const BEAUTY_FALLBACK = path.join(
  ROOT_DIR,
  "images/icons/beauty/beauty_without_rating.png"
);
const MULTI_FALLBACK = path.join(ROOT_DIR, "images/icons/multi/multi.png");

const resolvePoolSize = () => {
  const raw = process.env.EXPO_PUBLIC_MAP_IOS_POOL_SIZE;
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_POOL_SIZE;
  }
  return Math.max(MIN_POOL_SIZE, Math.min(MAX_POOL_SIZE, parsed));
};

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const parseScaledFullMarkerByKey = () => {
  const source = fs.readFileSync(IOS_SCALED_FULL_BY_KEY_FILE, "utf8");
  const matcher =
    /"([^"]+)":\s*require\("\.\.\/\.\.\/images\/icons\/ios-scaled\/full-markers\/([^"]+)"\),/g;
  const entries = new Map<string, string>();

  let match: RegExpExecArray | null = matcher.exec(source);
  while (match) {
    const key = match[1];
    const fileName = match[2];
    entries.set(key, path.join(ROOT_DIR, "images/icons/ios-scaled/full-markers", fileName));
    match = matcher.exec(source);
  }

  return entries;
};

const parseFullSpriteKeySet = () => {
  const source = fs.readFileSync(FULL_SPRITES_FILE, "utf8");
  const matcher = /^\s*"([^"]+)":\s*\{/gm;
  const keySet = new Set<string>();

  let match: RegExpExecArray | null = matcher.exec(source);
  while (match) {
    keySet.add(match[1]);
    match = matcher.exec(source);
  }

  return keySet;
};

const resolveCompactFallbackPath = (category: MarkerCategory) => {
  switch (category) {
    case "Fitness":
      return FITNESS_FALLBACK;
    case "Gastro":
      return GASTRO_FALLBACK;
    case "Relax":
      return RELAX_FALLBACK;
    case "Beauty":
      return BEAUTY_FALLBACK;
    default:
      return MULTI_FALLBACK;
  }
};

const resolveSingleMarkerPath = (
  marker: MarkerLike,
  scaledFullByKey: Map<string, string>,
  fullSpriteKeySet: Set<string>
): { sourcePath: string; sourceKind: "full" | "full-fallback" | "compact" } => {
  const markerSpriteKey = marker.markerSpriteKey?.trim();
  const spriteKey = normalizeId(markerSpriteKey || marker.id);
  const candidates = [
    markerSpriteKey ?? "",
    marker.id,
    spriteKey,
    markerSpriteKey ? normalizeId(markerSpriteKey) : "",
    normalizeId(marker.id),
    normalizeId(spriteKey),
  ].filter((candidate) => Boolean(candidate && candidate.trim()));

  for (const candidate of candidates) {
    const sourcePath = scaledFullByKey.get(candidate);
    if (!sourcePath) {
      continue;
    }
    if (!fullSpriteKeySet.has(candidate)) {
      continue;
    }
    return { sourcePath, sourceKind: "full" };
  }

  const fallbackByCategory: Record<MarkerCategory, string> = {
    Fitness: "fitness.png",
    Gastro: "gastro.png",
    Relax: "relax.png",
    Beauty: "beauty.png",
    Multi: "gastro.png",
  };
  const fallbackFullPath = path.join(
    IOS_FULL_FALLBACK_DIR,
    fallbackByCategory[marker.category]
  );
  if (fs.existsSync(fallbackFullPath)) {
    return {
      sourcePath: fallbackFullPath,
      sourceKind: "full-fallback",
    };
  }

  return {
    sourcePath: resolveCompactFallbackPath(marker.category),
    sourceKind: "compact",
  };
};

const groupMarkers = (markers: MarkerLike[]) => {
  const grouped = new Map<string, MarkerLike[]>();
  markers.forEach((marker) => {
    const key = marker.groupId ?? `${marker.lat.toFixed(6)}:${marker.lng.toFixed(6)}`;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(marker);
      return;
    }
    grouped.set(key, [marker]);
  });
  return grouped;
};

const distanceSq = (marker: MarkerLike, center: [number, number]) => {
  const latDelta = marker.lat - center[1];
  const lngDelta = marker.lng - center[0];
  return latDelta * latDelta + lngDelta * lngDelta;
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

const run = async () => {
  const poolSize = resolvePoolSize();
  const scaledFullByKey = parseScaledFullMarkerByKey();
  const fullSpriteKeySet = parseFullSpriteKeySet();
  assert(scaledFullByKey.size > 0, "scaled full-marker map must not be empty");
  assert(fullSpriteKeySet.size > 0, "full-marker sprite set must not be empty");

  await verifyUniformAssetDirectory("images/icons/cluster", "cluster");
  await verifyUniformAssetDirectory("images/icons/cluster_orange", "cluster_orange");
  await verifyUniformAssetDirectory("images/icons/stacked", "stacked");

  const grouped = groupMarkers(coords as MarkerLike[]);
  const singleMarkers = Array.from(grouped.entries())
    .filter(([, items]) => items.length === 1)
    .map(([groupKey, items]) => ({ groupKey, marker: items[0] }));

  const simulatedSingles: SimulatedSingleMarker[] = [];
  for (const entry of singleMarkers) {
    const resolved = resolveSingleMarkerPath(
      entry.marker,
      scaledFullByKey,
      fullSpriteKeySet
    );
    const size = await getImageSizeCached(resolved.sourcePath);
    simulatedSingles.push({
      id: entry.marker.id,
      groupKey: entry.groupKey,
      size,
      sourcePath: resolved.sourcePath,
      sourceKind: resolved.sourceKind,
    });
  }

  const center: [number, number] = [18.091, 48.3069];
  const markerById = new Map(
    (coords as MarkerLike[]).map((marker) => [marker.id, marker] as const)
  );
  const getMarkerOrThrow = (id: string) => {
    const marker = markerById.get(id);
    assert(Boolean(marker), `marker not found for id=${id}`);
    return marker as MarkerLike;
  };
  const pooledSingles = [...simulatedSingles]
    .sort(
      (left, right) =>
        distanceSq(getMarkerOrThrow(left.id), center) -
        distanceSq(getMarkerOrThrow(right.id), center)
    )
    .slice(0, poolSize);

  const sizeSummary = summarizeBySize(pooledSingles);
  const fullCount = pooledSingles.filter((item) => item.sourceKind === "full").length;
  const fallbackFullCount = pooledSingles.filter(
    (item) => item.sourceKind === "full-fallback"
  ).length;
  const compactCount = pooledSingles.filter((item) => item.sourceKind === "compact").length;

  if (sizeSummary.length > 1) {
    const details = sizeSummary
      .slice(0, 6)
      .map(
        (entry) =>
          `${entry.size} -> count=${entry.count}, sample=${entry.sampleIds.join(", ")}`
      )
      .join(" | ");
    throw new Error(
      `[verify-ios-marker-render-simulation] FAIL: pooled single markers are not uniform in iOS simulation. variants=${sizeSummary.length}, full=${fullCount}, compact=${compactCount}. ${details}`
    );
  }

  if (fullCount > 0) {
    const onlySize = sizeSummary[0]?.size ?? "";
    assert(
      onlySize === EXPECTED_IOS_FULL_MARKER_CANVAS_SIZE,
      `[verify-ios-marker-render-simulation] FAIL: iOS full-marker canvas must be ${EXPECTED_IOS_FULL_MARKER_CANVAS_SIZE}, got ${onlySize}`
    );
  }

  console.log(
    `[verify-ios-marker-render-simulation] all checks passed (pool=${poolSize}, singles=${pooledSingles.length}, size=${sizeSummary[0]?.size ?? "n/a"}, full=${fullCount}, fallbackFull=${fallbackFullCount}, compact=${compactCount})`
  );
};

void run();

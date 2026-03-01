import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "canvas";
import type { CanvasRenderingContext2D } from "canvas";
import { coords } from "../lib/data/coords";
import { normalizeId } from "../lib/data/utils/id";

const ROOT_DIR = path.resolve(__dirname, "..");
const GENERATED_FULL_MAP_PATH = path.join(
  ROOT_DIR,
  "lib/maps/generatedFullMarkerSprites.ts"
);
const IOS_FULL_MARKERS_DIR = path.join(ROOT_DIR, "images/icons/ios-scaled/full-markers");
const IOS_FULL_FALLBACK_DIR = path.join(
  ROOT_DIR,
  "images/icons/ios-scaled/full-markers-fallback"
);

const CATEGORY_DIR_MAP: Record<string, string> = {
  Fitness: "fitness",
  Gastro: "gastro",
  Relax: "relax",
  Beauty: "beauty",
};

const RATING_VALUES = [4.1, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0];

// Locked uniform iOS full-sprite canvas. (+25% vs original 322×138)
const CANVAS_WIDTH = 402;
const CANVAS_HEIGHT = 172;
const BADGED_ICON_WIDTH = 104;
const BADGED_ICON_HEIGHT = 141;
const TITLE_TOP = 145;
const TITLE_HEIGHT = 22;
const TITLE_BADGE_WIDTH = 295;
const TITLE_PADDING_X = 15;
const TITLE_FONT = "600 15px Arial";
const TITLE_TEXT_COLOR = "#FFFFFF";
const TITLE_STROKE_COLOR = "rgba(0,0,0,0.88)";
const TITLE_STROKE_WIDTH = 5; // canvas px – creates ~1.7pt outline on 3x screen

type FullSpriteEntry = {
  key: string;
  fileName: string;
};

type MarkerCatalogEntry = {
  id: string;
  category: string;
};

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getRatingForId = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return RATING_VALUES[hash % RATING_VALUES.length];
};

const normalizeTitleFromId = (id: string) => {
  const normalized = id.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return id;
  }
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const parseFullSpriteEntries = (): FullSpriteEntry[] => {
  const source = fs.readFileSync(GENERATED_FULL_MAP_PATH, "utf8");
  const matcher =
    /"([^"]+)":\s*\{[\s\S]*?image:\s*require\("\.\.\/\.\.\/images\/icons\/full-markers\/([^"]+)"\),/g;
  const entries: FullSpriteEntry[] = [];
  let match: RegExpExecArray | null = matcher.exec(source);

  while (match) {
    entries.push({
      key: match[1],
      fileName: match[2],
    });
    match = matcher.exec(source);
  }

  return entries;
};

const buildMarkerCatalog = (): Map<string, MarkerCatalogEntry> => {
  const map = new Map<string, MarkerCatalogEntry>();
  for (const item of coords) {
    map.set(item.id, { id: item.id, category: item.category });
    map.set(normalizeId(item.id), { id: item.id, category: item.category });
  }
  return map;
};

const fitTextWithEllipsis = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) => {
  const normalized = text.toUpperCase();
  if (ctx.measureText(normalized).width <= maxWidth) {
    return normalized;
  }

  const ellipsis = "...";
  const ellipsisWidth = ctx.measureText(ellipsis).width;
  if (ellipsisWidth >= maxWidth) {
    return ellipsis;
  }

  let low = 0;
  let high = normalized.length;
  let best = ellipsis;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${normalized.slice(0, mid).trimEnd()}${ellipsis}`;
    const width = ctx.measureText(candidate).width;
    if (width <= maxWidth) {
      best = candidate;
      low = mid + 1;
      continue;
    }
    high = mid - 1;
  }

  return best;
};

export const normalizeIOSFullMarkers = async () => {
  assert(fs.existsSync(IOS_FULL_MARKERS_DIR), `missing directory: ${IOS_FULL_MARKERS_DIR}`);
  fs.mkdirSync(IOS_FULL_FALLBACK_DIR, { recursive: true });

  const fullEntries = parseFullSpriteEntries();
  assert(fullEntries.length > 0, "no entries parsed from generatedFullMarkerSprites.ts");
  const markerCatalog = buildMarkerCatalog();

  for (const entry of fullEntries) {
    const marker =
      markerCatalog.get(entry.key) ?? markerCatalog.get(normalizeId(entry.key)) ?? null;
    assert(Boolean(marker), `missing marker metadata for sprite key: ${entry.key}`);

    const categoryDir = CATEGORY_DIR_MAP[marker!.category];
    assert(Boolean(categoryDir), `unsupported category for sprite key: ${entry.key}`);
    const ratingKey = getRatingForId(marker!.id).toFixed(1);
    const badgedIconPath = path.join(
      ROOT_DIR,
      "images/icons/badged",
      categoryDir,
      `${categoryDir}_rating_${ratingKey}.png`
    );
    assert(fs.existsSync(badgedIconPath), `missing badged icon: ${badgedIconPath}`);

    const badgedImage = await loadImage(badgedIconPath);
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const pinOffsetX = Math.round((CANVAS_WIDTH - BADGED_ICON_WIDTH) / 2);
    ctx.drawImage(badgedImage, pinOffsetX, 0, BADGED_ICON_WIDTH, BADGED_ICON_HEIGHT);

    ctx.font = TITLE_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = TITLE_STROKE_WIDTH;
    ctx.strokeStyle = TITLE_STROKE_COLOR;
    const titleText = fitTextWithEllipsis(
      ctx,
      normalizeTitleFromId(marker!.id),
      TITLE_BADGE_WIDTH - TITLE_PADDING_X * 2
    );
    const titleCenterY = TITLE_TOP + TITLE_HEIGHT / 2;
    ctx.strokeText(titleText, CANVAS_WIDTH / 2, titleCenterY);
    ctx.fillStyle = TITLE_TEXT_COLOR;
    ctx.fillText(titleText, CANVAS_WIDTH / 2, titleCenterY);

    fs.writeFileSync(path.join(IOS_FULL_MARKERS_DIR, entry.fileName), canvas.toBuffer("image/png"));
  }

  const fallbackCategories = Object.entries(CATEGORY_DIR_MAP);
  for (const [category, categoryDir] of fallbackCategories) {
    const badgedIconPath = path.join(
      ROOT_DIR,
      "images/icons/badged",
      categoryDir,
      `${categoryDir}_rating_4.6.png`
    );
    assert(fs.existsSync(badgedIconPath), `missing fallback badged icon: ${badgedIconPath}`);
    const badgedImage = await loadImage(badgedIconPath);
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const pinOffsetX = Math.round((CANVAS_WIDTH - BADGED_ICON_WIDTH) / 2);
    ctx.drawImage(badgedImage, pinOffsetX, 0, BADGED_ICON_WIDTH, BADGED_ICON_HEIGHT);
    const text = category.toUpperCase();
    ctx.font = TITLE_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = TITLE_STROKE_WIDTH;
    ctx.strokeStyle = TITLE_STROKE_COLOR;
    ctx.strokeText(text, CANVAS_WIDTH / 2, TITLE_TOP + TITLE_HEIGHT / 2);
    ctx.fillStyle = TITLE_TEXT_COLOR;
    ctx.fillText(text, CANVAS_WIDTH / 2, TITLE_TOP + TITLE_HEIGHT / 2);
    fs.writeFileSync(
      path.join(IOS_FULL_FALLBACK_DIR, `${categoryDir}.png`),
      canvas.toBuffer("image/png")
    );
  }

  console.log(
    `[normalize-ios-full-markers] rebuilt=${fullEntries.length} canvas=${CANVAS_WIDTH}x${CANVAS_HEIGHT} fallback=${fallbackCategories.length}`
  );
};

const isDirectRun =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  void normalizeIOSFullMarkers();
}

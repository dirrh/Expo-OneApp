import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCanvas,
  loadImage,
  registerFont,
  type CanvasRenderingContext2D,
} from "canvas";
import { mockSource } from "../lib/data/mockSource";
import { normalizeId } from "../lib/data/utils/id";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const CANVAS_WIDTH = 402;
const CANVAS_HEIGHT = 172;
const PIN_ICON_WIDTH = 104;
const PIN_ICON_HEIGHT = 141;
const PIN_OFFSET_X = Math.round((CANVAS_WIDTH - PIN_ICON_WIDTH) / 2);
const PIN_OFFSET_Y = 0;

const TEXT_BAND_TOP = 138;
const TEXT_BAND_BOTTOM = 168;
const TEXT_MAX_WIDTH = 220;
const FONT_SIZE = 16;
const LINE_HEIGHT = 18;
const PILL_HEIGHT = 22;
const PILL_HORIZONTAL_PADDING = 10;
const PILL_MAX_WIDTH = 240;
const PILL_RADIUS = 11;
const PILL_FILL = "rgba(255, 255, 255, 0.92)";
const TEXT_COLOR = "#111827";
const FONT_FAMILY = "InterBuild";
const FONT_FILE = path.join(ROOT_DIR, "assets/fonts-build/Inter-SemiBold.ttf");

const TARGET_DIR = path.join(ROOT_DIR, "images/icons/ios-scaled/labeled-pins");
const GENERATED_FILE = path.join(ROOT_DIR, "lib/maps/generatedIOSLabeledPins.ts");
const COMPACT_PIN_DIR = path.join(ROOT_DIR, "images/icons/ios-scaled/compact-pins");

const CATEGORY_PIN_FILE_BY_NAME: Record<string, string> = {
  Beauty: "beauty.png",
  Fitness: "fitness.png",
  Gastro: "gastro.png",
  Relax: "relax.png",
  Multi: "multi.png",
};

type LabeledMarkerEntry = {
  key: string;
  title: string;
  category: string;
};

const normalizeToPosix = (value: string) => value.replace(/\\/g, "/");

const ensureDirectory = (targetPath: string) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const resolveMarkerKey = (marker: { markerSpriteKey?: string | null; id: string }) =>
  normalizeId((marker.markerSpriteKey ?? marker.id ?? "").trim()) ||
  normalizeId(marker.id);

const resolveMarkerTitle = (marker: { title?: string | null; id: string }) => {
  const explicitTitle = marker.title?.trim();
  if (explicitTitle) {
    return explicitTitle;
  }
  return marker.id
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const resolveCompactPinPath = (category: string) => {
  const fileName =
    CATEGORY_PIN_FILE_BY_NAME[category] ?? CATEGORY_PIN_FILE_BY_NAME.Multi;
  return path.join(COMPACT_PIN_DIR, fileName);
};

const createRoundedRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const prepareFont = () => {
  if (process.platform === "win32") {
    return "sans-serif";
  }

  if (!fs.existsSync(FONT_FILE)) {
    return "sans-serif";
  }

  try {
    registerFont(FONT_FILE, { family: FONT_FAMILY });
    return `"${FONT_FAMILY}"`;
  } catch {
    return "sans-serif";
  }
};

const applyTextFont = (
  context: CanvasRenderingContext2D,
  family: string
) => {
  context.font = `${FONT_SIZE}px ${family}`;
};

const fitTitleToWidth = (
  context: CanvasRenderingContext2D,
  title: string
) => {
  const safeTitle = title.trim();
  if (!safeTitle) {
    return "";
  }

  if (context.measureText(safeTitle).width <= TEXT_MAX_WIDTH) {
    return safeTitle;
  }

  const ellipsis = "...";
  let truncated = safeTitle;
  while (truncated.length > 1) {
    truncated = truncated.slice(0, -1).trimEnd();
    const candidate = `${truncated}${ellipsis}`;
    if (context.measureText(candidate).width <= TEXT_MAX_WIDTH) {
      return candidate;
    }
  }

  return ellipsis;
};

const drawLabelPill = (
  context: CanvasRenderingContext2D,
  family: string,
  title: string
) => {
  applyTextFont(context, family);
  const fittedTitle = fitTitleToWidth(context, title);
  if (!fittedTitle) {
    return;
  }

  const textWidth = Math.min(TEXT_MAX_WIDTH, context.measureText(fittedTitle).width);
  const pillWidth = Math.min(
    PILL_MAX_WIDTH,
    Math.max(textWidth + PILL_HORIZONTAL_PADDING * 2, PILL_HEIGHT)
  );
  const pillX = Math.round((CANVAS_WIDTH - pillWidth) / 2);
  const bandHeight = TEXT_BAND_BOTTOM - TEXT_BAND_TOP;
  const pillY = Math.round(TEXT_BAND_TOP + (bandHeight - PILL_HEIGHT) / 2);

  context.fillStyle = PILL_FILL;
  createRoundedRectPath(context, pillX, pillY, pillWidth, PILL_HEIGHT, PILL_RADIUS);
  context.fill();

  context.fillStyle = TEXT_COLOR;
  context.textAlign = "center";
  context.textBaseline = "middle";
  applyTextFont(context, family);
  context.fillText(
    fittedTitle,
    CANVAS_WIDTH / 2,
    pillY + PILL_HEIGHT / 2 + Math.max(0, (LINE_HEIGHT - FONT_SIZE) / 4),
    TEXT_MAX_WIDTH
  );
};

const collectLabeledMarkerEntries = async () => {
  const markers = await mockSource.getMarkers();
  const entriesByKey = new Map<string, LabeledMarkerEntry>();

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const key = resolveMarkerKey(marker);
    if (!key) {
      continue;
    }
    if (entriesByKey.has(key)) {
      console.warn(`[generate-ios-labeled-pins] duplicate marker key "${key}" skipped`);
      continue;
    }
    entriesByKey.set(key, {
      key,
      title: resolveMarkerTitle(marker),
      category: marker.category,
    });
  }

  return [...entriesByKey.values()].sort((left, right) =>
    left.key.localeCompare(right.key)
  );
};

export const generateIOSLabeledPins = async () => {
  ensureDirectory(path.dirname(GENERATED_FILE));
  if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }
  ensureDirectory(TARGET_DIR);

  const fontFamily = prepareFont();
  const entries = await collectLabeledMarkerEntries();
  const generatedEntries: Array<{ key: string; targetRelative: string }> = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const compactPinPath = resolveCompactPinPath(entry.category);
    if (!fs.existsSync(compactPinPath)) {
      throw new Error(
        `[generate-ios-labeled-pins] missing compact pin source for ${entry.category}: ${compactPinPath}`
      );
    }

    const basePin = await loadImage(compactPinPath);
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.drawImage(basePin, PIN_OFFSET_X, PIN_OFFSET_Y, PIN_ICON_WIDTH, PIN_ICON_HEIGHT);
    drawLabelPill(context, fontFamily, entry.title);

    const targetFileName = `${entry.key}.png`;
    const targetPath = path.join(TARGET_DIR, targetFileName);
    fs.writeFileSync(targetPath, canvas.toBuffer("image/png"));

    const targetRelative = normalizeToPosix(path.relative(ROOT_DIR, targetPath));
    generatedEntries.push({ key: entry.key, targetRelative });
    console.log(`[generate-ios-labeled-pins] wrote ${targetRelative}`);
  }

  const mappingLines = generatedEntries.map(
    ({ key, targetRelative }) =>
      `  "${key}": require("../../${targetRelative}"),`
  );

  const output = [
    "/* eslint-disable */",
    "// AUTO-GENERATED FILE. DO NOT EDIT.",
    "// Generated by scripts/generate-ios-labeled-pins.ts",
    "",
    "export const IOS_LABELED_PIN_BY_KEY: Record<string, number> = {",
    mappingLines.join("\n"),
    "};",
    "",
    "export const IOS_LABELED_PIN_ANCHOR = { x: 0.492, y: 0.779 } as const;",
    `export const IOS_LABELED_PIN_CANVAS = { width: ${CANVAS_WIDTH}, height: ${CANVAS_HEIGHT} } as const;`,
    "",
  ].join("\n");

  fs.writeFileSync(GENERATED_FILE, output, "utf8");
  console.log(
    `[generate-ios-labeled-pins] done, canvas=${CANVAS_WIDTH}x${CANVAS_HEIGHT}, wrote ${generatedEntries.length} labeled pins -> ${GENERATED_FILE}`
  );
};

const isDirectRun =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  void generateIOSLabeledPins();
}

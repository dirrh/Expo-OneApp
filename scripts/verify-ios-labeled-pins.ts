import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { loadImage } from "canvas";
import { mockSource } from "../lib/data/mockSource";
import { normalizeId } from "../lib/data/utils/id";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const LABELED_DIR = path.join(ROOT_DIR, "images/icons/ios-scaled/labeled-pins");

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const loadGeneratedLabeledPins = async () => {
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

  return import("../lib/maps/generatedIOSLabeledPins");
};

const normalizeMarkerKey = (marker: { markerSpriteKey?: string | null; id: string }) =>
  normalizeId((marker.markerSpriteKey ?? marker.id ?? "").trim()) ||
  normalizeId(marker.id);

const run = async () => {
  const {
    IOS_LABELED_PIN_ANCHOR,
    IOS_LABELED_PIN_BY_KEY,
    IOS_LABELED_PIN_CANVAS,
  } = await loadGeneratedLabeledPins();
  const markers = await mockSource.getMarkers();
  const expectedKeys = Array.from(
    new Set(
      markers
        .map((marker) => normalizeMarkerKey(marker))
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right));

  const generatedKeys = Object.keys(IOS_LABELED_PIN_BY_KEY).sort((left, right) =>
    left.localeCompare(right)
  );

  assert(expectedKeys.length > 0, "canonical marker dataset must contain labeled marker keys");
  assert(
    generatedKeys.length === expectedKeys.length,
    "generated labeled pin registry must contain every unique canonical marker key"
  );
  assert(
    generatedKeys.join("|") === expectedKeys.join("|"),
    "generated labeled pin registry keys must match canonical marker keys deterministically"
  );
  assert(
    IOS_LABELED_PIN_CANVAS.width === 402 && IOS_LABELED_PIN_CANVAS.height === 172,
    "labeled pin canvas must stay locked to 402x172"
  );
  assert(
    IOS_LABELED_PIN_ANCHOR.x === 0.492 && IOS_LABELED_PIN_ANCHOR.y === 0.779,
    "labeled pin anchor must stay aligned with compact pins"
  );

  assert(fs.existsSync(LABELED_DIR), "labeled pin asset directory must exist");
  const generatedFiles = fs
    .readdirSync(LABELED_DIR)
    .filter((fileName) => fileName.toLowerCase().endsWith(".png"))
    .sort((left, right) => left.localeCompare(right));
  assert(
    generatedFiles.length === expectedKeys.length,
    "generated labeled pin file count must match unique marker key count"
  );

  for (const key of expectedKeys) {
    const expectedFile = `${key}.png`;
    assert(
      generatedFiles.includes(expectedFile),
      `generated labeled pin file is missing for key ${key}`
    );
  }

  for (const fileName of generatedFiles) {
    const absolutePath = path.join(LABELED_DIR, fileName);
    const image = await loadImage(absolutePath);
    assert(
      image.width === IOS_LABELED_PIN_CANVAS.width &&
        image.height === IOS_LABELED_PIN_CANVAS.height,
      `generated labeled pin ${fileName} must keep the locked canvas size`
    );
  }

  console.log("[verify-ios-labeled-pins] all checks passed");
};

void run();

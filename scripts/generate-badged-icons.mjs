import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "canvas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const PIN_CANVAS_WIDTH = 165;
const PIN_CANVAS_HEIGHT = 186;
const BADGED_CANVAS_HEIGHT = 226;
const BADGED_PIN_OFFSET_Y = 40;

const BADGE_TOP = 35;
const BADGE_MIN_WIDTH = 98;
const BADGE_MAX_WIDTH = 132;
const BADGE_MIN_HEIGHT = 32;
const BADGE_GAP = 6;
const BADGE_PADDING_LEFT = 15;
const BADGE_PADDING_RIGHT = 15;
const BADGE_PADDING_Y = 10;
const BADGE_TEXT_WIDTH_BUFFER = 8;
const BADGE_RIGHT_INSET = -2;
const BADGE_LEFT_SAFE_MARGIN = 2;
const BADGE_RADIUS = 9999;
const BADGE_BG_COLOR = "#374151";
const BADGE_SHADOW_COLOR = "rgba(0, 0, 0, 0.35)";
const BADGE_SHADOW_BLUR = 10;
const BADGE_SHADOW_OFFSET_Y = 11;
const BADGE_STAR_COLOR = "#FFD000";
const BADGE_TEXT_COLOR = "#FFFFFF";
const BADGE_FONT = "600 30px Arial";
const BADGE_STAR_SIZE = 27;
const BADGE_MIN_FONT_SIZE = 14;
const BADGE_MIN_STAR_SIZE = 13;

const CATEGORIES = [
  {
    id: "fitness",
    source: "images/icons/fitness/fitness_without_review.png",
    outputDir: "images/icons/badged/fitness",
  },
  {
    id: "gastro",
    source: "images/icons/gastro/gastro_without_rating.png",
    outputDir: "images/icons/badged/gastro",
  },
  {
    id: "relax",
    source: "images/icons/relax/relax_without_rating.png",
    outputDir: "images/icons/badged/relax",
  },
  {
    id: "beauty",
    source: "images/icons/beauty/beauty_without_rating.png",
    outputDir: "images/icons/badged/beauty",
  },
];

const RATINGS = Array.from({ length: 51 }, (_, index) => (index / 10).toFixed(1));

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawStar(ctx, centerX, centerY, outerRadius, innerRadius, points = 5) {
  const step = Math.PI / points;
  let angle = -Math.PI / 2;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    angle += step;
  }
  ctx.closePath();
}

function resolveFromRoot(relativePath) {
  return path.join(ROOT_DIR, relativePath);
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getFontPixelSize(font) {
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  if (!match) return 16;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : 16;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function generateCategory(category) {
  const sourcePath = resolveFromRoot(category.source);
  const outputDir = resolveFromRoot(category.outputDir);
  ensureDirectory(outputDir);

  const basePin = await loadImage(sourcePath);
  if (basePin.width !== PIN_CANVAS_WIDTH || basePin.height !== PIN_CANVAS_HEIGHT) {
    throw new Error(
      `Unexpected source size for ${category.source}: ${basePin.width}x${basePin.height}`
    );
  }

  let generatedCount = 0;

  for (const rating of RATINGS) {
    const canvas = createCanvas(PIN_CANVAS_WIDTH, BADGED_CANVAS_HEIGHT);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(basePin, 0, BADGED_PIN_OFFSET_Y);

    let badgeFont = BADGE_FONT;
    let starSize = BADGE_STAR_SIZE;
    ctx.font = badgeFont;
    ctx.textBaseline = "middle";

    let textMetrics = ctx.measureText(rating);
    let fontPixelSize = getFontPixelSize(badgeFont);
    let textHeight = Math.ceil(
      (textMetrics.actualBoundingBoxAscent ?? fontPixelSize * 0.78) +
        (textMetrics.actualBoundingBoxDescent ?? fontPixelSize * 0.22)
    );
    let rawBadgeWidth = Math.ceil(
      BADGE_PADDING_LEFT +
        starSize +
        BADGE_GAP +
        textMetrics.width +
        BADGE_PADDING_RIGHT +
        BADGE_TEXT_WIDTH_BUFFER
    );

    if (rawBadgeWidth > BADGE_MAX_WIDTH) {
      const scale = BADGE_MAX_WIDTH / rawBadgeWidth;
      const scaledFontPx = Math.max(
        BADGE_MIN_FONT_SIZE,
        Math.floor(getFontPixelSize(BADGE_FONT) * scale)
      );
      starSize = Math.max(BADGE_MIN_STAR_SIZE, Math.floor(BADGE_STAR_SIZE * scale));
      badgeFont = `600 ${scaledFontPx}px Arial`;
      ctx.font = badgeFont;
      textMetrics = ctx.measureText(rating);
      fontPixelSize = getFontPixelSize(badgeFont);
      textHeight = Math.ceil(
        (textMetrics.actualBoundingBoxAscent ?? fontPixelSize * 0.78) +
          (textMetrics.actualBoundingBoxDescent ?? fontPixelSize * 0.22)
      );
      rawBadgeWidth = Math.ceil(
        BADGE_PADDING_LEFT +
          starSize +
          BADGE_GAP +
          textMetrics.width +
          BADGE_PADDING_RIGHT +
          BADGE_TEXT_WIDTH_BUFFER
      );
    }

    const badgeWidth = clampNumber(rawBadgeWidth, BADGE_MIN_WIDTH, BADGE_MAX_WIDTH);
    const badgeHeight = Math.max(
      BADGE_MIN_HEIGHT,
      Math.ceil(Math.max(starSize, textHeight) + BADGE_PADDING_Y * 2)
    );

    const rawBadgeX = PIN_CANVAS_WIDTH - badgeWidth - BADGE_RIGHT_INSET;
    const badgeX = clampNumber(
      rawBadgeX,
      BADGE_LEFT_SAFE_MARGIN,
      canvas.width - badgeWidth
    );
    const badgeY = BADGE_TOP;

    ctx.save();
    ctx.shadowColor = BADGE_SHADOW_COLOR;
    ctx.shadowBlur = BADGE_SHADOW_BLUR;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = BADGE_SHADOW_OFFSET_Y;
    drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, BADGE_RADIUS);
    ctx.fillStyle = BADGE_BG_COLOR;
    ctx.fill();
    ctx.restore();

    const starCenterX = badgeX + BADGE_PADDING_LEFT + starSize / 2;
    const starCenterY = badgeY + badgeHeight / 2;
    drawStar(ctx, starCenterX, starCenterY, starSize / 2, starSize / 4.6);
    ctx.fillStyle = BADGE_STAR_COLOR;
    ctx.fill();

    ctx.fillStyle = BADGE_TEXT_COLOR;
    ctx.font = badgeFont;
    const textX = starCenterX + starSize / 2 + BADGE_GAP;
    const textRight = textX + textMetrics.width;
    const badgeRight = badgeX + badgeWidth - BADGE_PADDING_RIGHT;
    if (textRight > badgeRight + 0.5) {
      throw new Error(
        `Badge text clipping detected for ${category.id} ${rating}: textRight=${textRight}, badgeRight=${badgeRight}`
      );
    }
    ctx.fillText(
      rating,
      textX,
      starCenterY
    );

    const outputPath = path.join(outputDir, `${category.id}_rating_${rating}.png`);
    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
    generatedCount += 1;
  }

  return generatedCount;
}

async function main() {
  let total = 0;

  for (const category of CATEGORIES) {
    const generatedForCategory = await generateCategory(category);
    total += generatedForCategory;
    console.log(`[badged-icons] ${category.id}: ${generatedForCategory} files`);
  }

  console.log(`[badged-icons] done: ${total} files generated`);
}

main().catch((error) => {
  console.error("[badged-icons] failed:", error);
  process.exitCode = 1;
});

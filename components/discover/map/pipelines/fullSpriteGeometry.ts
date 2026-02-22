import { clampNumber } from "../../../../lib/maps/discoverMapUtils";
import { getMarkerFullSpriteMetrics } from "../../../../lib/maps/markerImageProvider";
import {
  BADGED_TITLE_CHAR_PX,
  BADGED_TITLE_HORIZONTAL_PADDING,
  BADGED_TITLE_MAX_WIDTH,
  BADGED_TITLE_WIDTH,
  FULL_SPRITE_COLLISION_INK_SCALE_X,
  FULL_SPRITE_COLLISION_INK_SCALE_Y,
  FULL_SPRITE_COLLISION_MIN_WIDTH,
  FULL_SPRITE_COLLISION_SAFETY_X,
  FULL_SPRITE_SIDE_PADDING_X,
  FULL_SPRITE_TEXT_STROKE_ALLOWANCE,
  FULL_SPRITE_TITLE_BASE_MAX_WIDTH,
  FULL_SPRITE_TITLE_HEIGHT,
  FULL_SPRITE_TITLE_MAX_WIDTH,
  FULL_SPRITE_TITLE_MIN_WIDTH,
  FULL_SPRITE_TITLE_OFFSET_Y,
  FULL_SPRITE_TITLE_PADDING_X,
  FULL_SPRITE_TITLE_TOP,
  FULL_SPRITE_CANVAS_MIN_WIDTH,
  BADGED_ANCHOR_Y,
} from "../constants";

export const estimateInlineTitleWidth = (title: string) => {
  const normalized = title.trim();
  if (!normalized) {
    return BADGED_TITLE_WIDTH;
  }
  const estimated =
    normalized.length * BADGED_TITLE_CHAR_PX + BADGED_TITLE_HORIZONTAL_PADDING * 2;
  return Math.round(clampNumber(estimated, BADGED_TITLE_WIDTH, BADGED_TITLE_MAX_WIDTH));
};

const FULL_SPRITE_GLYPH_WIDTH_MAP: Record<string, number> = {
  A: 20,
  B: 21,
  C: 21,
  D: 22,
  E: 20,
  F: 19,
  G: 23,
  H: 22,
  I: 10,
  J: 17,
  K: 21,
  L: 18,
  M: 27,
  N: 23,
  O: 23,
  P: 21,
  Q: 23,
  R: 21,
  S: 20,
  T: 19,
  U: 22,
  V: 21,
  W: 30,
  X: 21,
  Y: 21,
  Z: 20,
  "0": 19,
  "1": 16,
  "2": 19,
  "3": 19,
  "4": 20,
  "5": 19,
  "6": 19,
  "7": 18,
  "8": 20,
  "9": 19,
  " ": 9,
  "-": 10,
  _: 16,
  ".": 9,
  ",": 9,
  "/": 12,
  "&": 22,
  "'": 7,
  ":": 9,
  ";": 9,
  "!": 9,
  "?": 18,
  "(": 11,
  ")": 11,
  "+": 18,
  "*": 16,
  '"': 10,
};

const FULL_SPRITE_COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g;

const normalizeFullSpriteGlyphText = (title: string) => {
  const trimmed = title.trim();
  if (!trimmed) {
    return "";
  }
  try {
    return trimmed
      .normalize("NFD")
      .replace(FULL_SPRITE_COMBINING_MARKS_REGEX, "")
      .toUpperCase();
  } catch {
    return trimmed.toUpperCase();
  }
};

const estimateUnknownFullSpriteGlyphWidth = (char: string) => {
  if (char === " ") {
    return 9;
  }
  if (/^[A-Z]$/.test(char)) {
    return 20;
  }
  if (/^[0-9]$/.test(char)) {
    return 19;
  }
  if (/^[.,:;'"`~]$/.test(char)) {
    return 9;
  }
  if (/^[-_\/\\|]$/.test(char)) {
    return 12;
  }
  if (/^[(){}\[\]]$/.test(char)) {
    return 11;
  }
  return 18;
};

const estimateFullSpriteGlyphWidth = (title: string) => {
  const text = normalizeFullSpriteGlyphText(title);
  if (!text) {
    return 0;
  }
  let total = 0;
  for (const char of text) {
    total +=
      FULL_SPRITE_GLYPH_WIDTH_MAP[char] ??
      estimateUnknownFullSpriteGlyphWidth(char);
  }
  return total;
};

const estimateFullSpriteTitleWidth = (title: string) => {
  const glyphWidth = estimateFullSpriteGlyphWidth(title);
  if (glyphWidth <= 0) {
    return FULL_SPRITE_TITLE_MIN_WIDTH;
  }
  const estimated =
    glyphWidth + FULL_SPRITE_TITLE_PADDING_X * 2 + FULL_SPRITE_TEXT_STROKE_ALLOWANCE;
  return Math.round(
    clampNumber(
      estimated,
      FULL_SPRITE_TITLE_MIN_WIDTH,
      FULL_SPRITE_TITLE_MAX_WIDTH
    )
  );
};

export const resolveFullSpriteLabelGeometry = (
  title: string,
  metrics: ReturnType<typeof getMarkerFullSpriteMetrics>
) => {
  const glyphWidth = estimateFullSpriteGlyphWidth(title);
  const estimatedTitleWidth = estimateFullSpriteTitleWidth(title);
  if (!metrics) {
    const contentWidth = clampNumber(
      glyphWidth + FULL_SPRITE_TEXT_STROKE_ALLOWANCE,
      24,
      estimatedTitleWidth
    );
    const collisionWidth = clampNumber(
      contentWidth * FULL_SPRITE_COLLISION_INK_SCALE_X +
        FULL_SPRITE_COLLISION_SAFETY_X,
      FULL_SPRITE_COLLISION_MIN_WIDTH,
      estimatedTitleWidth
    );
    const collisionHeight = Math.round(
      clampNumber(
        FULL_SPRITE_TITLE_HEIGHT * FULL_SPRITE_COLLISION_INK_SCALE_Y,
        20,
        FULL_SPRITE_TITLE_HEIGHT
      )
    );
    return {
      width: estimatedTitleWidth,
      height: FULL_SPRITE_TITLE_HEIGHT,
      collisionWidth,
      collisionHeight,
      offsetX: 0,
      offsetY: FULL_SPRITE_TITLE_OFFSET_Y,
    };
  }

  const maxTitleWidthForSprite = Math.max(
    FULL_SPRITE_TITLE_MIN_WIDTH,
    metrics.width - FULL_SPRITE_SIDE_PADDING_X * 2
  );
  const estimatedBaseWidth = Math.min(
    estimatedTitleWidth,
    FULL_SPRITE_TITLE_BASE_MAX_WIDTH
  );
  const titleWidth =
    metrics.width > FULL_SPRITE_CANVAS_MIN_WIDTH + 0.5
      ? maxTitleWidthForSprite
      : Math.min(maxTitleWidthForSprite, estimatedBaseWidth);
  const contentWidth = clampNumber(
    glyphWidth + FULL_SPRITE_TEXT_STROKE_ALLOWANCE,
    24,
    titleWidth
  );
  const collisionWidth = clampNumber(
    contentWidth * FULL_SPRITE_COLLISION_INK_SCALE_X +
      FULL_SPRITE_COLLISION_SAFETY_X,
    FULL_SPRITE_COLLISION_MIN_WIDTH,
    titleWidth
  );
  const collisionHeight = Math.round(
    clampNumber(
      FULL_SPRITE_TITLE_HEIGHT * FULL_SPRITE_COLLISION_INK_SCALE_Y,
      20,
      FULL_SPRITE_TITLE_HEIGHT
    )
  );
  const anchorX =
    typeof metrics.anchor?.x === "number" && Number.isFinite(metrics.anchor.x)
      ? metrics.anchor.x
      : 0.5;
  const anchorY =
    typeof metrics.anchor?.y === "number" && Number.isFinite(metrics.anchor.y)
      ? metrics.anchor.y
      : BADGED_ANCHOR_Y;

  return {
    width: Math.round(
      clampNumber(titleWidth, FULL_SPRITE_TITLE_MIN_WIDTH, FULL_SPRITE_TITLE_MAX_WIDTH)
    ),
    height: FULL_SPRITE_TITLE_HEIGHT,
    collisionWidth,
    collisionHeight,
    offsetX: (0.5 - anchorX) * metrics.width,
    offsetY: FULL_SPRITE_TITLE_TOP - anchorY * metrics.height,
  };
};

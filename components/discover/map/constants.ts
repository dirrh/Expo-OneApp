import type { MarkerCollisionZone } from "../../../lib/maps/labelSelection";

export const MULTI_ICON = require("../../../images/icons/multi/multi.png");

export const CLUSTER_ID_PREFIX = "cluster:";
export const USER_MARKER_ID = "user-location";
export const USER_MARKER_COLOR = "#2563EB";
// Bucket=1: stableClusterZoom = Math.floor(effectiveZoom), teda Supercluster
// vždy zodpovedá reálnemu zoom levelu → clustre sa rozdelia presnejšie a plynulejšie.
// Pôvodne 2 – pri zoom 9.5 dával bucket 2 stableClusterZoom=8 (príliš hrubé zoskupenie).
export const CLUSTER_ZOOM_BUCKET_SIZE = 1;
// 0.5 = viewport + 50% padding na každej strane. Zaisťuje, že clustre
// blízko okraja viewportu sa stále zobrazia (pri viewport culling).
export const VIEWPORT_PADDING_RATIO = 0.5;
export const TOOLTIP_WIDTH = 183;
export const TOOLTIP_ROW_HEIGHT = 33;
export const STACKED_CENTER_DURATION_MS = 280;
export const STACKED_OPEN_FALLBACK_MS = 360;
export const CLUSTER_CULL_RELEASE_DELAY_MS = 150;
export const CLUSTER_REDRAW_INTERACTION_ENABLED = true;

export const PIN_CANVAS_WIDTH = 165;
export const PIN_CANVAS_HEIGHT = 186;
export const PIN_TRIM_WIDTH = 153;
export const PIN_TRIM_HEIGHT = 177;
export const PIN_TRIM_X = 0;
export const PIN_TRIM_Y = 0;
export const BADGED_CANVAS_HEIGHT = 226;
export const BADGED_PIN_OFFSET_Y = 40;
export const BADGED_TITLE_WIDTH = 120;
export const BADGED_TITLE_HEIGHT = 18;
export const MARKER_TITLE_OFFSET_Y = 8;
export const BADGED_TITLE_MAX_WIDTH = 560;
export const BADGED_TITLE_HORIZONTAL_PADDING = 10;
export const BADGED_TITLE_CHAR_PX = 9.2;
export const FULL_SPRITE_CANVAS_MIN_WIDTH = 260;
export const FULL_SPRITE_TITLE_MIN_WIDTH = 140;
export const FULL_SPRITE_TITLE_MAX_WIDTH = 888;
export const FULL_SPRITE_SIDE_PADDING_X = 16;
export const FULL_SPRITE_TITLE_HEIGHT = 36;
export const FULL_SPRITE_TITLE_TOP = BADGED_CANVAS_HEIGHT + 6;
export const FULL_SPRITE_TITLE_PADDING_X = 14;
export const FULL_SPRITE_TEXT_STROKE_ALLOWANCE = 10;
export const FULL_SPRITE_TITLE_OFFSET_Y =
  FULL_SPRITE_TITLE_TOP - (BADGED_PIN_OFFSET_Y + PIN_TRIM_HEIGHT);
export const FULL_SPRITE_TITLE_BASE_MAX_WIDTH =
  FULL_SPRITE_CANVAS_MIN_WIDTH - FULL_SPRITE_SIDE_PADDING_X * 2;
export const FULL_SPRITE_COLLISION_SAFETY_X = 2;
export const FULL_SPRITE_COLLISION_MIN_WIDTH = 34;
export const FULL_SPRITE_COLLISION_INK_SCALE_X = 0.96;
export const FULL_SPRITE_COLLISION_INK_SCALE_Y = 0.9;
export const FULL_SPRITE_VIEWPORT_MARGIN_X = 96;
export const FULL_SPRITE_VIEWPORT_MARGIN_Y = 72;
export const FULL_SPRITE_FADE_IN_DURATION_MS = 160;
export const FULL_SPRITE_FADE_OUT_DURATION_MS = 360;
export const FULL_SPRITE_FADE_EPSILON = 0.015;
export const CLUSTER_TO_SINGLE_FADE_WINDOW_MS = 0;
export const SINGLE_LAYER_ENTER_ZOOM_OFFSET = 1.2;
export const IOS_SINGLE_LAYER_MAX_MARKERS = 80;
export const IOS_SINGLE_LAYER_STAGED_INITIAL_MARKERS = 16;
export const IOS_SINGLE_LAYER_STAGED_BATCH_MARKERS = 16;
export const IOS_STRICT_SAFE_POOL_SIZE = 48;
export const IOS_STRICT_SAFE_STAGED_INITIAL_MARKERS = 8;
export const IOS_STRICT_SAFE_STAGED_BATCH_MARKERS = 8;
export const IOS_DISPLAY_MODE_ENTRY_HYSTERESIS_ZOOM = 0.16;
export const IOS_DISPLAY_MODE_EXIT_HYSTERESIS_ZOOM = 0.2;
export const IOS_DISPLAY_MODE_SWITCH_COOLDOWN_MS = 220;
export const CLUSTER_PRESS_ZOOM_STEP = 1;
export const CLUSTER_PRESS_TARGET_MARGIN_ZOOM = 0.45;
export const INLINE_LABEL_COLLISION_GAP_X = 0;
export const INLINE_LABEL_COLLISION_GAP_Y = 0;
export const INLINE_LABEL_PRECISE_COLLISION_WIDTH_SCALE = 1;
export const INLINE_LABEL_PRECISE_COLLISION_HEIGHT_SCALE = 1;
export const INLINE_LABEL_FIXED_SLOT_OFFSETS = {
  below: { x: 0, y: 0 },
  "below-right": { x: 16, y: 0 },
  "below-left": { x: -16, y: 0 },
  above: { x: 0, y: -34 },
} as const;
export const INLINE_LABEL_FIXED_SLOT_PENALTIES = {
  below: 0,
  "below-right": 0.01,
  "below-left": 0.012,
  above: 0.018,
} as const;
export const LABEL_RECOMPUTE_SKIP_PAN_PX = 0.5;
export const LABEL_RECOMPUTE_SKIP_ZOOM = 0.001;
export const MARKER_COLLISION_TIP_Y = BADGED_PIN_OFFSET_Y + PIN_TRIM_HEIGHT;
const MARKER_COLLISION_ZONE_SPECS = [
  { widthRatio: 0.33, heightRatio: 0.14, top: 4 },
  { widthRatio: 0.45, heightRatio: 0.16, top: BADGED_PIN_OFFSET_Y + 12 },
  { widthRatio: 0.56, heightRatio: 0.18, top: BADGED_PIN_OFFSET_Y + 38 },
  { widthRatio: 0.5, heightRatio: 0.18, top: BADGED_PIN_OFFSET_Y + 68 },
  { widthRatio: 0.38, heightRatio: 0.16, top: BADGED_PIN_OFFSET_Y + 98 },
  { widthRatio: 0.25, heightRatio: 0.14, top: BADGED_PIN_OFFSET_Y + 128 },
  { widthRatio: 0.16, heightRatio: 0.12, top: BADGED_PIN_OFFSET_Y + 154 },
] as const;
const markerCollisionOffsetY = (zoneTop: number, zoneHeight: number) =>
  zoneTop + zoneHeight / 2 - MARKER_COLLISION_TIP_Y;
export const MARKER_COLLISION_ZONES: MarkerCollisionZone[] = MARKER_COLLISION_ZONE_SPECS.map(
  (spec) => {
    const width = PIN_TRIM_WIDTH * spec.widthRatio;
    const height = PIN_TRIM_HEIGHT * spec.heightRatio;
    return {
      width,
      height,
      offsetX: 0,
      offsetY: markerCollisionOffsetY(spec.top, height),
    };
  }
);

export const BASE_ANCHOR_X =
  (PIN_TRIM_X + PIN_TRIM_WIDTH / 2) / PIN_CANVAS_WIDTH;
export const BASE_ANCHOR_Y =
  (PIN_TRIM_Y + PIN_TRIM_HEIGHT) / PIN_CANVAS_HEIGHT;
export const BADGED_ANCHOR_X = BASE_ANCHOR_X;
export const BADGED_ANCHOR_Y =
  (BADGED_PIN_OFFSET_Y + PIN_TRIM_HEIGHT) / BADGED_CANVAS_HEIGHT;

export const GOOGLE_MAP_STYLE = [
  { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

/**
 * discover: Súbor discover drží zdieľané konštanty používané vo viacerých moduloch.
 *
 * Prečo: Centralizované hodnoty v discover bránia rozchodu čísel a názvov medzi obrazovkami.
 */

import { ImageSourcePropType } from "react-native";
import type { BranchData } from "../../lib/interfaces";

// Offer keys pre preklady
const OFFER_KEYS = {
  discount20: "offer_discount20",
  freeEntryFriend: "offer_freeEntryFriend",
};

const DUMMY_BRANCH: BranchData = {
  title: "365 GYM Nitra",
  image: require("../../assets/365.jpg"),
  images: [
    require("../../assets/365.jpg"),
    require("../../assets/gallery/fitness/fitness_1.jpg"),
    require("../../assets/gallery/fitness/fitness_2.jpg"),
    require("../../assets/gallery/fitness/fitness_3.jpg"),
    require("../../assets/gallery/fitness/fitness_4.jpg"),
  ],
  rating: 4.6,
  category: "Fitness",
  distance: "1.7 km",
  hours: "9:00 - 21:00",
  // Tieto budú preložené cez t() kde sa DUMMY_BRANCH používa
  discount: OFFER_KEYS.discount20,
  offers: [OFFER_KEYS.discount20, OFFER_KEYS.freeEntryFriend],
  moreCount: 2,
  address: "Chrenovská 16, Nitra",
  phone: "+421903776925",
  email: "info@365gym.sk",
  website: "https://365gym.sk",
};

// Helper funkcia na preloženie DUMMY_BRANCH offers
const translateBranchOffers = (branch: BranchData, t: (key: string) => string): BranchData => ({
  ...branch,
  discount: branch.discount ? t(branch.discount) : undefined,
  offers: branch.offers?.map(offer => t(offer)),
});

// === ZOOM LEVEL KONŠTANTY ===
// Režimy zobrazovania:
// 1. zoom <= FORCE_CLUSTER_ZOOM  → len clustre (min 2)
// 2. zoom >= SINGLE_MODE_ZOOM    → len single piny
const FORCE_CLUSTER_ZOOM = 14;          // do tychto zoomov zobrazujeme iba clustre
const SINGLE_MODE_ZOOM = 14;          // od tohto zoomu len single piny
const DEFAULT_CAMERA_ZOOM = 14;
const DEFAULT_CITY_CENTER: [number, number] = [18.091, 48.3069];

// === iOS/Android parity (approx) ===
const IOS_ZOOM_OFFSET = 0;             // doladiĹĄ podÄľa potreby (+/- 0.25)
const IOS_FORCE_CLUSTER_ZOOM = FORCE_CLUSTER_ZOOM;
const IOS_SINGLE_MODE_ZOOM = SINGLE_MODE_ZOOM;
const ANDROID_CLUSTER_CELL_PX = 90;
const IOS_CLUSTER_CELL_PX = 80;        // ~Android - 10px

// Static map zoom (LocationSheet + InfoSection)
const STATIC_MAP_ZOOM = 14;

// Inline marker label engine (no overlay projections)
const MAP_FULL_SPRITES_V1 = true;
const MAP_FULL_SPRITES_LOGS_ENABLED = false;
const MARKER_PIPELINE_OPT_ENV = process.env.EXPO_PUBLIC_MAP_MARKER_PIPELINE_OPT_V1
  ?.trim()
  .toLowerCase();
const MAP_MARKER_PIPELINE_OPT_V1 =
  MARKER_PIPELINE_OPT_ENV === "false" ||
  MARKER_PIPELINE_OPT_ENV === "0" ||
  MARKER_PIPELINE_OPT_ENV === "off"
    ? false
    : true;
const IOS_STABLE_MARKERS_ENV = process.env.EXPO_PUBLIC_MAP_IOS_STABLE_MARKERS
  ?.trim()
  .toLowerCase();
const MAP_IOS_STABLE_MARKERS_V1 =
  IOS_STABLE_MARKERS_ENV === "false" ||
  IOS_STABLE_MARKERS_ENV === "0" ||
  IOS_STABLE_MARKERS_ENV === "off"
    ? false
    : true;
const IOS_STABLE_MARKERS_LOGS_ENV =
  process.env.EXPO_PUBLIC_MAP_IOS_STABLE_MARKERS_LOGS?.trim().toLowerCase();
const MAP_IOS_STABLE_MARKERS_LOGS_ENABLED =
  IOS_STABLE_MARKERS_LOGS_ENV === "true" ||
  IOS_STABLE_MARKERS_LOGS_ENV === "1" ||
  IOS_STABLE_MARKERS_LOGS_ENV === "on";
const LABEL_COLLISION_ENV = process.env.EXPO_PUBLIC_MAP_LABEL_COLLISION_V2
  ?.trim()
  .toLowerCase();
const MAP_LABEL_COLLISION_V2 =
  LABEL_COLLISION_ENV === "false" ||
  LABEL_COLLISION_ENV === "0" ||
  LABEL_COLLISION_ENV === "off"
    ? false
    : true;
const MAP_LABEL_COLLISION_V2_LOGS_ENABLED = false;
const MAP_LABEL_ENTER_ZOOM = 12.6;
const MAP_LABEL_EXIT_ZOOM = 12.3;
const MAP_LABEL_LOW_ZOOM_MAX = 12;
const MAP_LABEL_MID_ZOOM_MAX = 20;
const MAP_LABEL_HIGH_ZOOM_MAX = 28;
const MAP_LABEL_MAX_MARKERS = 600;
const MAP_LABEL_CANDIDATE_MULTIPLIER = 3;
const MAP_LABEL_COLLISION_GAP_X = 4;
const MAP_LABEL_COLLISION_GAP_Y = 3;
const MAP_LABEL_STICKY_SCORE_BONUS = 0.08;
const MAP_LABEL_MAX_WIDTH_PX = 720;
const MAP_LABEL_DENSE_MARKER_COUNT_THRESHOLD = 1000;
const MAP_LABEL_DENSE_LOW_ZOOM_BUDGET = 10;
const MAP_LABEL_LAYER_PAIR_ZOOM_OFFSET = 0.35;
const MAP_LABEL_LAYER_DENSE_ZOOM_OFFSET = 0.8;
const MAP_LABEL_LAYER_PROXIMITY_PX = 86;
const IOS_LABEL_RECOMPUTE_PAN_THRESHOLD_PX = 24;
const IOS_LABEL_RECOMPUTE_ZOOM_THRESHOLD = 0.18;
const MAP_LABEL_LAYOUT_V3 = true;
const MAP_LABEL_GESTURE_RECOMPUTE_MS = 90;
const MAP_LABEL_SLOT_OFFSETS = {
  below: { x: 0, y: 0 },
  "below-right": { x: 24, y: 2 },
  "below-left": { x: -24, y: 2 },
  above: { x: 0, y: -26 },
} as const;
const MAP_LABEL_SLOT_PENALTIES = {
  below: 0,
  "below-right": 0.02,
  "below-left": 0.03,
  above: 0.07,
} as const;
const MAP_LABEL_STICKY_SLOT_BONUS = 0.05;
const MAP_LABEL_COLLISION_WIDTH_SCALE_V3 = 0.82;
const MAP_LABEL_COLLISION_HEIGHT_SCALE_V3 = 0.78;
const MAP_LABEL_MAX_CANDIDATES_V3 = 560;

export {
  DUMMY_BRANCH,
  translateBranchOffers,
  OFFER_KEYS,
  FORCE_CLUSTER_ZOOM,
  SINGLE_MODE_ZOOM,
  DEFAULT_CAMERA_ZOOM,
  DEFAULT_CITY_CENTER,
  IOS_ZOOM_OFFSET,
  IOS_FORCE_CLUSTER_ZOOM,
  IOS_SINGLE_MODE_ZOOM,
  ANDROID_CLUSTER_CELL_PX,
  IOS_CLUSTER_CELL_PX,
  STATIC_MAP_ZOOM,
  MAP_FULL_SPRITES_V1,
  MAP_FULL_SPRITES_LOGS_ENABLED,
  MAP_MARKER_PIPELINE_OPT_V1,
  MAP_IOS_STABLE_MARKERS_V1,
  MAP_IOS_STABLE_MARKERS_LOGS_ENABLED,
  MAP_LABEL_COLLISION_V2,
  MAP_LABEL_COLLISION_V2_LOGS_ENABLED,
  MAP_LABEL_ENTER_ZOOM,
  MAP_LABEL_EXIT_ZOOM,
  MAP_LABEL_LOW_ZOOM_MAX,
  MAP_LABEL_MID_ZOOM_MAX,
  MAP_LABEL_HIGH_ZOOM_MAX,
  MAP_LABEL_MAX_MARKERS,
  MAP_LABEL_CANDIDATE_MULTIPLIER,
  MAP_LABEL_COLLISION_GAP_X,
  MAP_LABEL_COLLISION_GAP_Y,
  MAP_LABEL_STICKY_SCORE_BONUS,
  MAP_LABEL_MAX_WIDTH_PX,
  MAP_LABEL_DENSE_MARKER_COUNT_THRESHOLD,
  MAP_LABEL_DENSE_LOW_ZOOM_BUDGET,
  MAP_LABEL_LAYER_PAIR_ZOOM_OFFSET,
  MAP_LABEL_LAYER_DENSE_ZOOM_OFFSET,
  MAP_LABEL_LAYER_PROXIMITY_PX,
  IOS_LABEL_RECOMPUTE_PAN_THRESHOLD_PX,
  IOS_LABEL_RECOMPUTE_ZOOM_THRESHOLD,
  MAP_LABEL_LAYOUT_V3,
  MAP_LABEL_GESTURE_RECOMPUTE_MS,
  MAP_LABEL_SLOT_OFFSETS,
  MAP_LABEL_SLOT_PENALTIES,
  MAP_LABEL_STICKY_SLOT_BONUS,
  MAP_LABEL_COLLISION_WIDTH_SCALE_V3,
  MAP_LABEL_COLLISION_HEIGHT_SCALE_V3,
  MAP_LABEL_MAX_CANDIDATES_V3,
};


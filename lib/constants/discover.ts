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
const CITY_CLUSTER_ZOOM = 11;           // pod týmto = city cluster
const CLUSTER_MAX_ZOOM = 16;            // nad týmto = jednotlivé markery
const FORCE_CLUSTER_ZOOM = 14;          // do tychto zoomov zobrazujeme iba clustre
const SINGLE_MODE_ZOOM = 15;          // od tohto zoomu len single piny
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

export {
  DUMMY_BRANCH,
  translateBranchOffers,
  OFFER_KEYS,
  CITY_CLUSTER_ZOOM,
  CLUSTER_MAX_ZOOM,
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
};

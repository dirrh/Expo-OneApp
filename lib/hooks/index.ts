// hooks index: barrel export custom hookov.
// Zodpovednost: jednotny vstupny bod pre import hookov.
// Vstup/Vystup: re-export useDiscover* a useDynamicQRCode.

export { useDiscoverFilters } from "./useDiscoverFilters";
export type { UseDiscoverFiltersReturn } from "./useDiscoverFilters";

// Kamera mapy v Discover.
export { useDiscoverCamera } from "./useDiscoverCamera";
export type { UseDiscoverCameraReturn } from "./useDiscoverCamera";

// Data pre Discover (branches + markery).
export { useDiscoverData, useSavedLocationMarkers } from "./useDiscoverData";
export type { UseDiscoverDataReturn } from "./useDiscoverData";

// Dynamicky QR kod.
export { useDynamicQRCode } from "./useDynamicQRCode";

// Home search v2.
export { useHomeSearch } from "./useHomeSearch";
export type { UseHomeSearchReturn } from "./useHomeSearch";

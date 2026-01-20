/**
 * index.ts
 * 
 * Re-exporty všetkých custom hookov pre jednoduchší import.
 * 
 * Použitie:
 * import { useDiscoverFilters, useDiscoverCamera } from "../lib/hooks";
 */

// Hook pre správu filtrov (kategória, hodnotenie, vyhľadávanie)
export { useDiscoverFilters } from "./useDiscoverFilters";
export type { UseDiscoverFiltersReturn } from "./useDiscoverFilters";

// Hook pre správu kamery mapy (pozícia, zoom, centrovanie)
export { useDiscoverCamera } from "./useDiscoverCamera";
export type { UseDiscoverCameraReturn } from "./useDiscoverCamera";

// Hook pre načítanie dát (pobočky, markery)
export { useDiscoverData, useSavedLocationMarkers } from "./useDiscoverData";
export type { UseDiscoverDataReturn } from "./useDiscoverData";

// Hook pre dynamicky QR kod (dummy JWT)
export { useDynamicQRCode } from "./useDynamicQRCode";

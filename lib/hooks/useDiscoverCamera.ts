/**
 * useDiscoverCamera.ts
 * 
 * Tento hook spravuje stav kamery mapy a polohu používateľa.
 * Obsahuje logiku pre centrovanie, zoom a uchovávanie pozície medzi prepínaním tabov.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import Mapbox from "@rnmapbox/maps";
import type { Camera } from "@rnmapbox/maps";

// === GLOBÁLNY STAV ===
// Tieto premenné sú mimo komponentu, aby sa zachovali medzi rendermi
// Používame ich na uchovanie pozície kamery pri prepínaní medzi tabmi
let lastDiscoverCameraState: { center: [number, number]; zoom: number } | null = null;
let preserveDiscoverCamera = false;

/**
 * Typ pre návratovú hodnotu hooku
 */
export interface UseDiscoverCameraReturn {
  cameraRef: React.RefObject<Camera>;           // ref na Mapbox kameru
  userCoord: [number, number] | null;           // súradnice používateľa [lng, lat]
  mapCenter: [number, number];                  // stred mapy [lng, lat]
  mapZoom: number;                              // úroveň priblíženia
  didInitialCenter: boolean;                    // či už prebehlo úvodné centrovanie

  // === HANDLERY ===
  handleUserLocationUpdate: (coord: [number, number]) => void;
  handleCameraChanged: (
    center: [number, number],
    zoom: number,
    isUserGesture?: boolean
  ) => void;

  // === AKCIE ===
  centerOnUser: () => void;                     // vycentruje mapu na používateľa
  centerOnCoord: (coord: [number, number], zoom?: number) => void;  // vycentruje na súradnice

  // === POMOCNÉ FUNKCIE PRE NAVIGÁCIU ===
  setPreserveCamera: (value: boolean) => void;
  getLastCameraState: () => { center: [number, number]; zoom: number } | null;
  restoreCameraIfNeeded: () => void;
}

/**
 * Možnosti pre hook
 */
interface UseDiscoverCameraOptions {
  cityCenter: [number, number];                 // stred mesta (fallback pozícia)
  selectedOptionCoord?: [number, number] | null; // vybraná lokácia z dropdownu
  onOptionReset?: () => void;                   // callback keď user oddiali od vybranej lokácie
}

/**
 * Hook na správu kamery mapy a polohy používateľa
 * 
 * @param options - konfigurácia hooku
 * @returns objekt so stavom kamery a funkciami na jej ovládanie
 * 
 * Príklad použitia:
 * const camera = useDiscoverCamera({ cityCenter: [18.091, 48.3069] });
 * camera.centerOnUser();
 */
export const useDiscoverCamera = ({
  cityCenter,
  selectedOptionCoord = null,
  onOptionReset,
}: UseDiscoverCameraOptions): UseDiscoverCameraReturn => {
  
  // Ref na Mapbox kameru - používame na programatické ovládanie
  const cameraRef = useRef<Camera>(null);

  // === STAVOVÉ PREMENNÉ ===
  const [userCoord, setUserCoord] = useState<[number, number] | null>(null);  // poloha usera
  const [mapCenter, setMapCenter] = useState<[number, number]>(cityCenter);   // stred mapy
  const [mapZoom, setMapZoom] = useState(14);                                  // zoom level
  const [didInitialCenter, setDidInitialCenter] = useState(false);            // či už sme centrovali

  /**
   * Pri spustení na Androide si vyžiadame povolenie pre lokáciu
   * Na iOS to nie je potrebné (riešime cez Info.plist)
   */
  useEffect(() => {
    if (Platform.OS === "android") {
      Mapbox.requestAndroidLocationPermissions();
    }
  }, []);

  /**
   * Úvodné centrovanie na polohu používateľa
   * Spustí sa len raz, keď dostaneme prvú polohu
   */
  useEffect(() => {
    // Preskočíme ak:
    // - ešte nemáme polohu
    // - už sme centrovali
    // - máme zachovať predchádzajúcu pozíciu (napr. po návrate z iného tabu)
    if (!userCoord || didInitialCenter || preserveDiscoverCamera) {
      return;
    }
    
    // Vycentrujeme kameru na používateľa s animáciou
    cameraRef.current?.setCamera({
      centerCoordinate: userCoord,
      zoomLevel: 14,
      animationDuration: 800,  // 800ms animácia
    });
    
    setDidInitialCenter(true);
  }, [userCoord, didInitialCenter]);

  /**
   * Handler pre aktualizáciu polohy používateľa
   * Volá sa z komponenty UserLocation na mape
   */
  const handleUserLocationUpdate = useCallback((coord: [number, number]) => {
    setUserCoord(coord);
  }, []);

  /**
   * Handler pre zmenu pozície kamery (keď user scrolluje/zoomuje mapu)
   * 
   * @param center - nový stred mapy
   * @param zoom - nový zoom level
   * @param isUserGesture - či to bolo spôsobené gestom používateľa
   */
  const handleCameraChanged = useCallback(
    (center: [number, number], zoom: number, isUserGesture?: boolean) => {
      // Aktualizujeme stav
      setMapZoom(zoom);
      setMapCenter(center);
      
      // Uložíme pozíciu pre prípad prepnutia tabu
      lastDiscoverCameraState = { center, zoom };

      // Ak user manuálne posunul mapu preč od vybranej lokácie, resetujeme výber
      if (!isUserGesture || !selectedOptionCoord) {
        return;
      }
      
      // Vypočítame vzdialenosť od vybranej lokácie
      const [selectedLng, selectedLat] = selectedOptionCoord;
      const [centerLng, centerLat] = center;
      const distance = Math.hypot(selectedLng - centerLng, selectedLat - centerLat);
      
      // Ak je vzdialenosť väčšia ako prah, resetujeme výber
      if (distance > 0.0005 && onOptionReset) {
        onOptionReset();
      }
    },
    [selectedOptionCoord, onOptionReset]
  );

  /**
   * Vycentruje mapu na aktuálnu polohu používateľa
   */
  const centerOnUser = useCallback(() => {
    if (!userCoord) return;  // ak nemáme polohu, nič nerobíme
    
    cameraRef.current?.setCamera({
      centerCoordinate: userCoord,
      zoomLevel: 14,
      animationDuration: 800,
    });
  }, [userCoord]);

  /**
   * Vycentruje mapu na konkrétne súradnice
   * 
   * @param coord - súradnice [lng, lat]
   * @param zoom - zoom level (default: 14)
   */
  const centerOnCoord = useCallback((coord: [number, number], zoom: number = 14) => {
    cameraRef.current?.setCamera({
      centerCoordinate: coord,
      zoomLevel: zoom,
      animationDuration: 800,
    });
  }, []);

  // === POMOCNÉ FUNKCIE PRE NAVIGÁCIU MEDZI TABMI ===
  
  /**
   * Nastaví flag, či sa má zachovať pozícia kamery pri navigácii
   */
  const setPreserveCamera = useCallback((value: boolean) => {
    preserveDiscoverCamera = value;
  }, []);

  /**
   * Vráti poslednú uloženú pozíciu kamery
   */
  const getLastCameraState = useCallback(() => {
    return lastDiscoverCameraState;
  }, []);

  /**
   * Obnoví pozíciu kamery ak je potrebné (po návrate z iného tabu)
   */
  const restoreCameraIfNeeded = useCallback(() => {
    if (preserveDiscoverCamera && lastDiscoverCameraState) {
      cameraRef.current?.setCamera({
        centerCoordinate: lastDiscoverCameraState.center,
        zoomLevel: lastDiscoverCameraState.zoom,
        animationDuration: 0,  // bez animácie - okamžitá zmena
      });
      setDidInitialCenter(true);
      preserveDiscoverCamera = false;
    }
  }, []);

  // Vrátime všetky hodnoty a funkcie
  return {
    cameraRef,
    userCoord,
    mapCenter,
    mapZoom,
    didInitialCenter,
    handleUserLocationUpdate,
    handleCameraChanged,
    centerOnUser,
    centerOnCoord,
    setPreserveCamera,
    getLastCameraState,
    restoreCameraIfNeeded,
  };
};

/**
 * useDiscoverCamera.ts
 * 
 * Tento hook spravuje stav kamery mapy a polohu používateľa.
 * Obsahuje logiku pre centrovanie, zoom a uchovávanie pozície medzi prepínaním tabov.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import type { MapViewRef } from "../interfaces";
import type MapView from "react-native-maps";
import { regionToZoom, setMapCamera } from "../maps/camera";

// === GLOBÁLNY STAV ===
// Tieto premenné sú mimo komponentu, aby sa zachovali medzi rendermi
// Používame ich na uchovanie pozície kamery pri prepínaní medzi tabmi
let lastDiscoverCameraState: { center: [number, number]; zoom: number } | null = null;
let lastDiscoverRegionState: {
  center: [number, number];
  latitudeDelta: number;
  longitudeDelta: number;
} | null = null;
let preserveDiscoverCamera = false;
let suppressProgrammaticEventsUntil = 0;

/**
 * Typ pre návratovú hodnotu hooku
 */
export interface UseDiscoverCameraReturn {
  cameraRef: MapViewRef;                        // ref na map view
  userCoord: [number, number] | null;           // súradnice používateľa [lng, lat]
  mapCenter: [number, number];                  // stred mapy [lng, lat]
  mapZoom: number;                              // úroveň priblíženia
  didInitialCenter: boolean;                    // či už prebehlo úvodné centrovanie
  isUserPanning: boolean;                       // ci user aktualne hybe mapou

  // === HANDLERY ===
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
  syncCameraFromNative: () => Promise<{ center: [number, number]; zoom: number } | null>;
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
  
  // Ref na map view - používame na programatické ovládanie
  const cameraRef = useRef<MapView | null>(null) as MapViewRef;

  // Throttling konfigurácia pre aktualizácie kamery
  // Obmedzujeme frekvenciu aktualizácií stavu na max. každých 150ms
  // aby sa znížil počet renderov počas pohybu mapou
  const THROTTLE_INTERVAL = 150;
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreRetryRef = useRef(0);
  const panTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserPanningRef = useRef(false);

  // === STAVOVÉ PREMENNÉ ===
  const initialCameraState = lastDiscoverCameraState ?? { center: cityCenter, zoom: 14 };
  const [userCoord, setUserCoord] = useState<[number, number] | null>(null);  // poloha usera
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCameraState.center);   // stred mapy
  const [mapZoom, setMapZoom] = useState(initialCameraState.zoom);                                  // zoom level
  const [didInitialCenter, setDidInitialCenter] = useState(Boolean(lastDiscoverCameraState));            // či už sme centrovali
  const [isUserPanning, setIsUserPanning] = useState(false);
  const latestAppliedRef = useRef<{ center: [number, number]; zoom: number }>(initialCameraState);

  const CENTER_EPSILON = 0.000001; // ~0.1m; keeps precision while avoiding micro-jitter loops
  const ZOOM_EPSILON = 0.0001;

  const applyCameraState = useCallback((center: [number, number], zoom: number) => {
    const prev = latestAppliedRef.current;
    const delta = Math.hypot(center[0] - prev.center[0], center[1] - prev.center[1]);
    if (delta < CENTER_EPSILON && Math.abs(zoom - prev.zoom) < ZOOM_EPSILON) {
      return;
    }
    latestAppliedRef.current = { center, zoom };
    setMapZoom(zoom);
    setMapCenter(center);
  }, []);

  const markUserPanning = useCallback((isUserGesture?: boolean) => {
    if (!isUserGesture) return;
    if (!isUserPanningRef.current) {
      isUserPanningRef.current = true;
      setIsUserPanning(true);
    }
    if (panTimeoutRef.current) {
      clearTimeout(panTimeoutRef.current);
    }
    panTimeoutRef.current = setTimeout(() => {
      isUserPanningRef.current = false;
      setIsUserPanning(false);
    }, 120);
  }, []);


  /**
   * Pri spustení na Androide si vyžiadame povolenie pre lokáciu
   * Na iOS to nie je potrebné (riešime cez Info.plist)
   */
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted || status !== "granted") return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
        },
        (location) => {
          if (!isMounted) return;
          setUserCoord([location.coords.longitude, location.coords.latitude]);
        }
      );
    };

    start();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
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
    setMapCamera(cameraRef, { center: userCoord, zoom: 14, durationMs: 800 });
    
    setDidInitialCenter(true);
  }, [userCoord, didInitialCenter]);

  /**
   * Handler pre zmenu pozície kamery (keď user scrolluje/zoomuje mapu)
   * 
   * Používame throttling na zníženie počtu renderov počas pohybu:
   * - Globálny stav sa aktualizuje okamžite (pre tab switching)
   * - React stav sa aktualizuje max. každých 150ms
   * - Posledná pozícia sa vždy zachytí cez pending update
   * 
   * @param center - nový stred mapy
   * @param zoom - nový zoom level
   * @param isUserGesture - či to bolo spôsobené gestom používateľa
   */
  const handleCameraChanged = useCallback(
    (center: [number, number], zoom: number, isUserGesture?: boolean) => {
      // Ignore short-lived programmatic map events (restore/jump), but keep gestures.
      if (!isUserGesture && Date.now() < suppressProgrammaticEventsUntil) {
        return;
      }

      // 1. Vždy uložíme pozíciu pre prípad prepnutia tabu (bez throttlingu)
      lastDiscoverCameraState = { center, zoom };

      // 2. Uložíme ako pending update (pre prípad, že timeout ešte beží)
      pendingUpdateRef.current = { center, zoom };

      // 3. Skontrolujeme, či môžeme aktualizovať React stav
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

      if (timeSinceLastUpdate >= THROTTLE_INTERVAL) {
        // Môžeme aktualizovať okamžite
        lastUpdateTimeRef.current = now;
        pendingUpdateRef.current = null;
        applyCameraState(center, zoom);
      } else {
        // Naplánujeme odloženú aktualizáciu (ak ešte nie je naplánovaná)
        if (!throttleTimeoutRef.current) {
          const remainingTime = THROTTLE_INTERVAL - timeSinceLastUpdate;
          throttleTimeoutRef.current = setTimeout(() => {
            throttleTimeoutRef.current = null;
            if (pendingUpdateRef.current) {
              lastUpdateTimeRef.current = Date.now();
              applyCameraState(
                pendingUpdateRef.current.center,
                pendingUpdateRef.current.zoom
              );
              pendingUpdateRef.current = null;
            }
          }, remainingTime);
        }
      }

      markUserPanning(isUserGesture);

      // 4. Ak user manuálne posunul mapu preč od vybranej lokácie, resetujeme výber
      if (!isUserGesture || !selectedOptionCoord) {
        return;
      }
      
      const [selectedLng, selectedLat] = selectedOptionCoord;
      const [centerLng, centerLat] = center;
      const distance = Math.hypot(selectedLng - centerLng, selectedLat - centerLat);
      
      if (distance > 0.0005 && onOptionReset) {
        onOptionReset();
      }
    },
    [selectedOptionCoord, onOptionReset, applyCameraState, markUserPanning]
  );

  // Cleanup timeout pri unmounte
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      if (panTimeoutRef.current) {
        clearTimeout(panTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Vycentruje mapu na aktuálnu polohu používateľa
   */
  const centerOnUser = useCallback(() => {
    if (!userCoord) return;  // ak nemáme polohu, nič nerobíme
    
    setMapCamera(cameraRef, { center: userCoord, zoom: 14, durationMs: 800 });
  }, [userCoord]);

  /**
   * Vycentruje mapu na konkrétne súradnice
   * 
   * @param coord - súradnice [lng, lat]
   * @param zoom - zoom level (default: 14)
   */
  const centerOnCoord = useCallback((coord: [number, number], zoom: number = 14) => {
    setMapCamera(cameraRef, { center: coord, zoom, durationMs: 800 });
  }, []);

  // === POMOCNÉ FUNKCIE PRE NAVIGÁCIU MEDZI TABMI ===
  
  /**
   * Nastaví flag, či sa má zachovať pozícia kamery pri navigácii
   */
  const setPreserveCamera = useCallback((value: boolean) => {
    preserveDiscoverCamera = value;
    if (!value) {
      suppressProgrammaticEventsUntil = 0;
    }
  }, []);

  /**
   * Vráti poslednú uloženú pozíciu kamery
   */
  const getLastCameraState = useCallback(() => {
    return lastDiscoverCameraState;
  }, []);

  /**
   * Synchronizes camera state from native map immediately.
   * This prevents stale zoom restore when navigating away right after gestures.
   */
  const syncCameraFromNative = useCallback(async () => {
    const mapView = cameraRef.current;
    if (!mapView) {
      return lastDiscoverCameraState;
    }

    try {
      const nativeCamera = await mapView.getCamera();
      const latFromCamera = nativeCamera?.center?.latitude;
      const lngFromCamera = nativeCamera?.center?.longitude;

      let regionFromBounds:
        | {
            center: [number, number];
            latitudeDelta: number;
            longitudeDelta: number;
            zoom: number;
          }
        | null = null;

      try {
        const bounds = await mapView.getMapBoundaries();
        const northEast = bounds?.northEast;
        const southWest = bounds?.southWest;
        const neLat = northEast?.latitude;
        const neLng = northEast?.longitude;
        const swLat = southWest?.latitude;
        const swLng = southWest?.longitude;

        if (
          Number.isFinite(neLat) &&
          Number.isFinite(neLng) &&
          Number.isFinite(swLat) &&
          Number.isFinite(swLng)
        ) {
          const rawLngDelta = neLng - swLng;
          let longitudeDelta = Math.abs(neLng - swLng);
          if (longitudeDelta > 180) {
            longitudeDelta = 360 - longitudeDelta;
          }
          const latitudeDelta = Math.abs(neLat - swLat);

          // Keep center stable even for wrapped longitudes.
          let centerLng = (neLng + swLng) / 2;
          if (Math.abs(rawLngDelta) > 180) {
            const wrappedNeLng = neLng < 0 ? neLng + 360 : neLng;
            const wrappedSwLng = swLng < 0 ? swLng + 360 : swLng;
            const wrappedCenter = (wrappedNeLng + wrappedSwLng) / 2;
            centerLng = wrappedCenter > 180 ? wrappedCenter - 360 : wrappedCenter;
          }
          const centerLat = (neLat + swLat) / 2;
          const zoom = regionToZoom({ longitudeDelta });

          regionFromBounds = {
            center: [centerLng, centerLat],
            latitudeDelta,
            longitudeDelta,
            zoom,
          };
        }
      } catch {
        // Ignore boundary read failures; fallback to camera zoom/center.
      }

      const lat = regionFromBounds
        ? regionFromBounds.center[1]
        : Number.isFinite(latFromCamera)
          ? latFromCamera
          : null;
      const lng = regionFromBounds
        ? regionFromBounds.center[0]
        : Number.isFinite(lngFromCamera)
          ? lngFromCamera
          : null;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return lastDiscoverCameraState;
      }

      const zoomFromCamera =
        typeof nativeCamera.zoom === "number" && Number.isFinite(nativeCamera.zoom)
          ? nativeCamera.zoom
          : NaN;
      let zoom: number = regionFromBounds ? regionFromBounds.zoom : NaN;
      if (!Number.isFinite(zoom)) {
        zoom = zoomFromCamera;
      }

      if (!Number.isFinite(zoom)) {
        zoom = lastDiscoverCameraState?.zoom ?? latestAppliedRef.current.zoom;
      }

      const nextState = { center: [lng, lat] as [number, number], zoom };
      lastDiscoverCameraState = nextState;
      lastDiscoverRegionState = regionFromBounds
        ? {
            center: regionFromBounds.center,
            latitudeDelta: regionFromBounds.latitudeDelta,
            longitudeDelta: regionFromBounds.longitudeDelta,
          }
        : null;
      latestAppliedRef.current = nextState;
      applyCameraState(nextState.center, nextState.zoom);

      return nextState;
    } catch {
      return lastDiscoverCameraState;
    }
  }, [applyCameraState]);

  /**
   * Obnoví pozíciu kamery ak je potrebné (po návrate z iného tabu)
   */
  const restoreCameraIfNeeded = useCallback(() => {
    if (!preserveDiscoverCamera) {
      return;
    }

    if (!lastDiscoverCameraState) {
      preserveDiscoverCamera = false;
      return;
    }

    if (!cameraRef.current) {
      if (restoreRetryRef.current < 20) {
        restoreRetryRef.current += 1;
        setTimeout(restoreCameraIfNeeded, 50);
      } else {
        restoreRetryRef.current = 0;
        preserveDiscoverCamera = false;
      }
      return;
    }

    restoreRetryRef.current = 0;
    applyCameraState(lastDiscoverCameraState.center, lastDiscoverCameraState.zoom);
    suppressProgrammaticEventsUntil = Date.now() + 400;
    if (lastDiscoverRegionState) {
      cameraRef.current?.animateToRegion(
        {
          latitude: lastDiscoverRegionState.center[1],
          longitude: lastDiscoverRegionState.center[0],
          latitudeDelta: Math.max(0.00001, lastDiscoverRegionState.latitudeDelta),
          longitudeDelta: Math.max(0.00001, lastDiscoverRegionState.longitudeDelta),
        },
        0
      );
    } else {
      setMapCamera(cameraRef, {
        center: lastDiscoverCameraState.center,
        zoom: lastDiscoverCameraState.zoom,
        durationMs: 0,
      });
    }
    setDidInitialCenter(true);
    preserveDiscoverCamera = false;
  }, []);

  // Vrátime všetky hodnoty a funkcie
  return {
    cameraRef,
    userCoord,
    mapCenter,
    mapZoom,
    didInitialCenter,
    isUserPanning,
    handleCameraChanged,
    centerOnUser,
    centerOnCoord,
    setPreserveCamera,
    getLastCameraState,
    syncCameraFromNative,
    restoreCameraIfNeeded,
  };
};

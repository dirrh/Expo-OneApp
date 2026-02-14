/**
 * useDiscoverData.ts
 * 
 * Tento hook načítava a spravuje dáta pre Discover obrazovku.
 * Obsahuje logiku pre pobočky, markery a ich zoskupovanie.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { ImageSourcePropType } from "react-native";
import type { BranchData, DiscoverCategory, DiscoverMapMarker } from "../interfaces";
import { useDataSource } from "../data/useDataSource";
import { DUMMY_BRANCH, translateBranchOffers } from "../constants/discover";
import { formatTitleFromId, getRatingForId } from "../data/normalizers";
import { normalizeCenter } from "../maps/camera";

// Ikonka pre multi-pin (keď je viac pobočiek na jednom mieste)
const MULTI_MARKER_ICON: ImageSourcePropType = require("../../images/icons/multi/multi.png");

// Placeholder obrázky pre jednotlivé kategórie
const CATEGORY_PLACEHOLDER_IMAGES: Record<DiscoverCategory, ImageSourcePropType> = {
  Fitness: require("../../assets/365.jpg"),
  Gastro: require("../../assets/royal.jpg"),
  Relax: require("../../assets/klub.jpg"),
  Beauty: require("../../assets/royal.jpg"),
};

// Galéria obrázkov pre detail – 4 kvalitné obrázky pre každú kategóriu
const CATEGORY_GALLERY_IMAGES: Record<DiscoverCategory, ImageSourcePropType[]> = {
  Fitness: [
    require("../../assets/gallery/fitness/fitness_1.jpg"),
    require("../../assets/gallery/fitness/fitness_2.jpg"),
    require("../../assets/gallery/fitness/fitness_3.jpg"),
    require("../../assets/gallery/fitness/fitness_4.jpg"),
  ],
  Gastro: [
    require("../../assets/gallery/gastro/gastro_1.jpg"),
    require("../../assets/gallery/gastro/gastro_2.jpg"),
    require("../../assets/gallery/gastro/gastro_3.jpg"),
    require("../../assets/gallery/gastro/gastro_4.jpg"),
  ],
  Relax: [
    require("../../assets/gallery/relax/relax_1.jpg"),
    require("../../assets/gallery/relax/relax_2.jpg"),
    require("../../assets/gallery/relax/relax_3.jpg"),
    require("../../assets/gallery/relax/relax_4.jpg"),
  ],
  Beauty: [
    require("../../assets/gallery/beauty/beauty_1.jpg"),
    require("../../assets/gallery/beauty/beauty_2.jpg"),
    require("../../assets/gallery/beauty/beauty_3.jpg"),
    require("../../assets/gallery/beauty/beauty_4.jpg"),
  ],
};

const normalizeMarkerTitle = (marker: DiscoverMapMarker) => {
  const raw = marker.title?.trim();
  if (raw && raw.length > 3) {
    return raw;
  }
  return formatTitleFromId(marker.id);
};

const normalizeMarkerItem = (marker: DiscoverMapMarker): DiscoverMapMarker => {
  const rating = Number.isFinite(marker.rating)
    ? marker.rating
    : Number.parseFloat(marker.ratingFormatted ?? "");

  const normalizedRating = Number.isFinite(rating)
    ? Math.min(5, Math.max(0, rating))
    : 0;

  return {
    ...marker,
    title: normalizeMarkerTitle(marker),
    markerSpriteKey: marker.markerSpriteKey ?? marker.id,
    rating: normalizedRating,
    ratingFormatted: normalizedRating.toFixed(1),
  };
};

/**
 * Typ pre návratovú hodnotu hooku
 */
export interface UseDiscoverDataReturn {
  branches: BranchData[];                       // zoznam pobočiek pre zoznam
  markers: DiscoverMapMarker[];                 // surové markery z API
  groupedMarkers: Array<{                       // markery zoskupené podľa lokácie
    id: string;
    lng: number;
    lat: number;
    items: DiscoverMapMarker[];
  }>;
  markerItems: DiscoverMapMarker[];             // markery pripravené na zobrazenie (vrátane multi-pinov)
  loading: boolean;                             // či sa načítavajú dáta
  error: string | null;                         // chybová správa (ak nastala chyba)
  refetch: () => void;                          // funkcia na opätovné načítanie dát
  fetchBranchForMarker: (marker: DiscoverMapMarker) => Promise<BranchData>;
  buildBranchFromMarker: (marker: DiscoverMapMarker) => BranchData;
}

/**
 * Typ pre override údajov pobočky (pre špecifické markery)
 */
interface MarkerBranchOverride extends Partial<BranchData> {
  title?: string;
  image?: ImageSourcePropType;
  category?: string;
  hours?: string;
}

/**
 * Možnosti pre hook
 */
interface UseDiscoverDataOptions {
  t: (key: string) => string;                   // prekladová funkcia z i18n
  markerBranchOverrides?: Record<string, MarkerBranchOverride>;  // vlastné údaje pre konkrétne markery
}

/**
 * Hook na načítanie a správu dát pre Discover obrazovku
 * 
 * @param options - konfigurácia hooku
 * @returns objekt s dátami a funkciami na ich správu
 * 
 * Príklad použitia:
 * const { branches, markers, loading, error } = useDiscoverData({ t });
 */
export const useDiscoverData = ({
  t,
  markerBranchOverrides = {},
}: UseDiscoverDataOptions): UseDiscoverDataReturn => {
  
  // Získame zdroj dát (mock/api/supabase)
  const dataSource = useDataSource();

  // === STAVOVÉ PREMENNÉ ===
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [markers, setMarkers] = useState<DiscoverMapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);  // kľúč pre opätovné načítanie

  /**
   * Načítanie dát pri prvom renderovaní a pri zmene fetchKey
   * Používame cleanup funkciu na zrušenie aktualizácie pri unmounte
   */
  useEffect(() => {
    let active = true;  // flag pre cleanup
    
    setLoading(true);
    setError(null);

    // Načítame pobočky aj markery paralelne (rýchlejšie)
    Promise.all([dataSource.getBranches(), dataSource.getMarkers()])
      .then(([branchData, markerData]) => {
        // Ak bol komponent odmountnutý, nič nerobíme
        if (!active) return;
        
        // Preložíme textové hodnoty vrátane offers
        const translated = branchData.map((branch) => ({
          ...branch,
          title: t(branch.title),
          distance: t(branch.distance),
          hours: t(branch.hours),
          discount: branch.discount ? t(branch.discount) : undefined,
          offers: branch.offers?.map(offer => t(offer)),
        }));
        
        setBranches(translated);
        setMarkers(markerData.map(normalizeMarkerItem));
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? "Nepodarilo sa načítať dáta");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Cleanup funkcia - nastaví flag na false pri unmounte
    return () => {
      active = false;
    };
  }, [t, dataSource, fetchKey]);

  /**
   * Funkcia na opätovné načítanie dát (napr. po chybe)
   * Jednoducho zvýši fetchKey, čo spustí useEffect
   */
  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  /**
   * Zoskupenie markerov podľa groupId
   * Markery na rovnakej lokácii majú rovnaké groupId
   * 
   * Príklad:
   * - "Diamond gym" a "Diamond barber" majú groupId "diamond_center"
   * - Zobrazia sa ako jeden multi-pin
   */
  const groupedMarkers = useMemo(() => {
    const map = new Map<
      string,
      { id: string; lng: number; lat: number; items: DiscoverMapMarker[] }
    >();

    markers.forEach((item) => {
      // Použijeme groupId ak existuje, inak id markera
      const key = item.groupId ?? item.id;

      // Ak skupina ešte neexistuje, vytvoríme ju
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          lng: item.coord.lng,
          lat: item.coord.lat,
          items: [],
        });
      }

      // Pridáme marker do skupiny
      map.get(key)!.items.push(item);
    });

    return Array.from(map.values());
  }, [markers]);

  /**
   * Transformácia zoskupených markerov na zobraziteľné položky
   * - Ak má skupina 1 položku → normálny pin
   * - Ak má skupina viac položiek → čierny multi-pin
   * 
   * Rating sa formátuje tu raz pri vytváraní markerov,
   * nie pri každom renderovaní mapy
   */
  const markerItems = useMemo<DiscoverMapMarker[]>(() => {
    return groupedMarkers.map((group) => {
      // Skupina s 1 položkou → vrátime pôvodný marker s pred-formátovaným ratingom
      if (group.items.length === 1) {
        const item = group.items[0];
        return {
          ...item,
          ratingFormatted: item.ratingFormatted ?? item.rating.toFixed(1),
        };
      }

      // Skupina s viacerými položkami → vytvoríme multi-pin
      const maxRating = Math.max(...group.items.map((i) => i.rating));
      return {
        id: group.id,
        coord: { lng: group.lng, lat: group.lat },
        groupCount: group.items.length,
        icon: MULTI_MARKER_ICON,
        rating: maxRating,
        ratingFormatted: maxRating.toFixed(1),
        category: "Multi" as const,
      };
    });
  }, [groupedMarkers]);

  /**
   * Vytvorí objekt pobočky z markera
   * Používame keď nemáme kompletné dáta pobočky (len marker)
   */
  const buildBranchFromMarker = useCallback(
    (marker: DiscoverMapMarker): BranchData => {
      // Skontrolujeme či máme override pre tento marker
      const override = markerBranchOverrides[marker.id] ?? {};
      
      // Názov - z override alebo vygenerujeme z ID
      const title = override.title ?? normalizeMarkerTitle(marker);
      
      // Kategória - z override alebo z markera
      const category = override.category ?? (marker.category === "Multi" ? "" : marker.category);
      const resolvedCategory: DiscoverCategory | undefined =
        category && category !== "Multi" ? (category as DiscoverCategory) : undefined;
      
      // Obrázok - z override, placeholder pre kategóriu, alebo default
      const image =
        override.image ??
        (resolvedCategory ? CATEGORY_PLACEHOLDER_IMAGES[resolvedCategory] : undefined) ??
        DUMMY_BRANCH.image;

      // Preložíme DUMMY_BRANCH offers
      const translatedDummy = translateBranchOffers(DUMMY_BRANCH, t);

      // Galéria obrázkov pre detail – hlavný obrázok + kategória gallery
      const galleryImages = resolvedCategory
        ? [image, ...CATEGORY_GALLERY_IMAGES[resolvedCategory]]
        : [image];

      // Vrátime kompletný objekt pobočky
      return {
        id: marker.id,
        ...translatedDummy,        // základné hodnoty (preložené)
        ...override,               // vlastné hodnoty
        title,
        coordinates: [marker.coord.lng, marker.coord.lat],
        category: resolvedCategory ?? DUMMY_BRANCH.category ?? "Fitness",
        rating: marker.rating,
        distance: `${(Math.random() * 2 + 0.5).toFixed(1)} km`,  // náhodná vzdialenosť (TODO: vypočítať reálnu)
        hours: override?.hours ?? DUMMY_BRANCH.hours,
        image,
        images: galleryImages,
      };
    },
    [markerBranchOverrides, t]
  );

  /**
   * Načíta pobočku pre marker z API, alebo vytvorí z markera
   * Používame pri kliknutí na marker na mape
   */
  const fetchBranchForMarker = useCallback(
    async (marker: DiscoverMapMarker): Promise<BranchData> => {
      // Skúsime načítať z API
      const branch = await dataSource.getBranchById(marker.id);
      
      // Ak nemáme dáta, vytvoríme z markera
      return branch ?? buildBranchFromMarker(marker);
    },
    [buildBranchFromMarker, dataSource]
  );

  return {
    branches,
    markers,
    groupedMarkers,
    markerItems,
    loading,
    error,
    refetch,
    fetchBranchForMarker,
    buildBranchFromMarker,
  };
};

/**
 * Hook na generovanie markerov pre uložené lokácie
 * 
 * @param locations - pole lokácií z dropdownu
 * @returns pole markerov pre uložené lokácie
 */
export const useSavedLocationMarkers = (
  locations: Array<{
    coord?: [number, number];
    isSaved?: boolean;
    image: ImageSourcePropType;
    markerImage?: ImageSourcePropType;
  }>
): DiscoverMapMarker[] => {
  return useMemo(
    () =>
      locations
        // Vyfiltrujeme len uložené lokácie so súradnicami
        .filter(
          (item) =>
            item.isSaved &&
            Array.isArray(item.coord) &&
            Number.isFinite(item.coord[0]) &&
            Number.isFinite(item.coord[1])
        )
        // Transformujeme na markery
        .map((item, index) => {
          // Vygenerujeme unikátne ID
          const coord = item.coord as [number, number];
          const [lng, lat] = normalizeCenter(coord);
          const id = `saved-${index}-${lng}-${lat}`;
          
          return {
            id,
            coord: { lng, lat },
            icon: item.markerImage ?? item.image,
            rating: getRatingForId(id),  // deterministické hodnotenie z ID
            category: "Multi" as const,
          };
        }),
    [locations]
  );
};


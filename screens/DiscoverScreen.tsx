/**
 * DiscoverScreen: Mapová obrazovka Discover riadi kameru, markery, filtre, vyhľadávanie a detail overlay.
 *
 * Prečo: Jedna orchestrácia mapových stavov drží plynulé prechody medzi mapou, searchom a detailom prevádzky.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageSourcePropType, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type BottomSheet from "@gorhom/bottom-sheet";
import type {
  BranchData,
  DiscoverCategory,
  DiscoverFavoritePlace,
  DiscoverMapMarker,
  Location,
} from "../lib/interfaces";
import DiscoverMap from "../components/discover/DiscoverMap";
import DiscoverTopControls from "../components/discover/DiscoverTopControls";
import DiscoverSearchSheet from "../components/discover/DiscoverSearchSheet";
import DiscoverFilterSheet from "../components/discover/DiscoverFilterSheet";
import DiscoverBranchOverlay from "../components/discover/DiscoverBranchOverlay";
import { styles } from "../components/discover/discoverStyles";
import {
  useDiscoverFilters,
  useDiscoverCamera,
  useDiscoverData,
  useSavedLocationMarkers,
} from "../lib/hooks";
import DiscoverSideFilterPanel from "../components/discover/DiscoverSideFilterPanel";
import DiscoverGroupSheet from "../components/discover/DiscoverGroupSheet";
import { setMapCamera } from "../lib/maps/camera";
import { SINGLE_MODE_ZOOM } from "../lib/constants/discover";
import { AppConfig } from "../lib/config/AppConfig";
import { appendDerivedBranchesFromMarkers } from "../lib/data/mappers";
import { normalizeId } from "../lib/data/utils/id";
import {
  DISCOVER_FILTER_OPTIONS,
  DISCOVER_SUBCATEGORIES,
  NITRA_CENTER,
} from "../lib/constants/discoverUi";
import {
  buildDiscoverFavoritePlaces,
  buildDiscoverBranchSearchIndex,
  filterDiscoverBranchSearchIndex,
} from "../lib/discover/discoverSearchUtils";

/**
 * Vypočíta približnú veľkosť viditeľnej oblasti mapy v stupňoch
 * Na základe zoom levelu (vyšší zoom = menšia oblasť)
 * 
 * Vzorec: Pri zoom 14 je vidno cca 0.02° lat/lng
 * Každý zoom level zdvojnásobuje/polovičí oblasť
 */
const getViewportDelta = (zoom: number): number => {
  // Pri zoom 14 je delta cca 0.03 (s rezervou)
  // Zoom 15 = 0.015, Zoom 13 = 0.06, atď.
  return 0.03 * Math.pow(2, 14 - zoom);
};

/**
 * Filtruje markery podľa viditeľnej oblasti mapy
 * Zobrazuje len tie markery, ktoré sú aktuálne viditeľné na obrazovke
 */
const filterMarkersByViewport = (
  markers: DiscoverMapMarker[],
  center: [number, number],
  zoom: number
): DiscoverMapMarker[] => {
  // Pri nízkom zoome (clustre) vrátime všetky markery
  if (zoom < 11) return markers;

  const [centerLng, centerLat] = center;
  const delta = getViewportDelta(zoom);
  
  // Pridáme 50% margin pre plynulé načítanie pri posune
  const margin = delta * 0.5;
  const deltaWithMargin = delta + margin;

  const minLat = centerLat - deltaWithMargin;
  const maxLat = centerLat + deltaWithMargin;
  const minLng = centerLng - deltaWithMargin;
  const maxLng = centerLng + deltaWithMargin;

  return markers.filter((m) => {
    const lat = m.coord?.lat;
    const lng = m.coord?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return (lat as number) >= minLat && (lat as number) <= maxLat && (lng as number) >= minLng && (lng as number) <= maxLng;
  });
};
const FILTER_ICONS: Record<DiscoverCategory, ImageSourcePropType> = {
  Fitness: require("../images/icons/fitness/Fitness.png"),
  Gastro: require("../images/icons/gastro/Gastro.png"),
  Relax: require("../images/icons/relax/Relax.png"),
  Beauty: require("../images/icons/beauty/Beauty.png"),
};

// Camera state is preserved via useDiscoverCamera hook (module-level state).

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useTranslation();
  const [sideFilterOpen, setSideFilterOpen] = useState(false);

  // Refs
  const filterRef = useRef<BottomSheet>(null);
  const groupSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["25%", "85%"], []);
  const groupSnapPoints = useMemo(() => ["45%"], []);

  // Custom hooks
  const filters = useDiscoverFilters("Gastro");
  const {
    branches,
    markers,
    groupedMarkers,
    loading,
    error,
    refetch,
    fetchBranchForMarker,
    buildBranchFromMarker,
  } = useDiscoverData({ t });

  // Location state
  const [location, setLocation] = useState<Location[]>([
    { image: require("../images/home.png"), label: "home" },
    { image: require("../images/business.png"), label: "business" },
    { image: require("../images/list.png"), label: "allAddresses" },
    { image: require("../images/pin.png"), label: "nitra", coord: NITRA_CENTER },
  ]);
  const [option, setOption] = useState<string>("yourLocation");

  // Selected option coordinate
  const selectedOptionCoord = useMemo(() => {
    const selected = location.find((item) => item.label === option && item.coord);
    return selected?.coord ?? null;
  }, [location, option]);

  // Camera hook with option reset callback
  const camera = useDiscoverCamera({
    cityCenter: NITRA_CENTER,
    selectedOptionCoord,
    onOptionReset: () => setOption("yourLocation"),
  });
  const [cameraSnapshot, setCameraSnapshot] = useState(() => camera.getLastCameraState());

  // UI state
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchSheetIndex, setSearchSheetIndex] = useState(-1);

  // Selected group for multi-pin popup
  const [selectedGroup, setSelectedGroup] = useState<{
    coord: { lng: number; lat: number };
    items: DiscoverMapMarker[];
  } | null>(null);

  // Hide/show tab bar based on sheet state
  useFocusEffect(
    useCallback(() => {
      const shouldHideTabBar = sideFilterOpen || isSheetOpen;
      navigation.setOptions({
        tabBarStyle: { display: shouldHideTabBar ? "none" : "flex" },
      });
    }, [navigation, sideFilterOpen, isSheetOpen])
  );

  // Open/close group sheet based on selected group
  useEffect(() => {
    if (selectedGroup) {
      groupSheetRef.current?.snapToIndex(0);
    } else {
      groupSheetRef.current?.close();
    }
  }, [selectedGroup]);

  // Handle tab navigation and camera preservation
  useFocusEffect(
    useCallback(() => {
      camera.restoreCameraIfNeeded();

      return () => {
        camera.setPreserveCamera(true);
        void camera.syncCameraFromNative().then((latest) => {
          if (latest) {
            setCameraSnapshot(latest);
          }
        });
      };
    }, [
      camera.syncCameraFromNative,
      camera.restoreCameraIfNeeded,
      camera.setPreserveCamera,
    ])
  );

  // Computed dimensions
  const subcategoryChipWidth = Math.max(96, Math.floor((screenWidth - 16 * 2 - 12 * 2) / 3));
  const branchCardWidth = Math.max(280, Math.min(340, screenWidth - 48));

  // Filter branches and markers
  const filteredBranches = useMemo(
    () => filters.filterBranches(branches, text),
    [filters.filterBranches, branches, text]
  );
  const overlayBranches = useMemo(() => {
    if (!filters.hasActiveFilter) {
      return filteredBranches;
    }
    return filteredBranches.length > 0 ? filteredBranches : branches;
  }, [filters.hasActiveFilter, filteredBranches, branches]);
  const searchBranchCandidates = useMemo(
    () => appendDerivedBranchesFromMarkers(branches, markers, buildBranchFromMarker),
    [branches, markers, buildBranchFromMarker]
  );
  const searchBranchIndex = useMemo(
    () => buildDiscoverBranchSearchIndex(searchBranchCandidates),
    [searchBranchCandidates]
  );
  const searchBranches = useMemo(() => {
    return filterDiscoverBranchSearchIndex(searchBranchIndex, text);
  }, [searchBranchIndex, text]);
  const markerLookup = useMemo(() => {
    const lookup = new Map<string, DiscoverMapMarker>();
    markers.forEach((marker) => {
      const key = normalizeId(marker.id);
      if (key) {
        lookup.set(key, marker);
      }
    });
    return lookup;
  }, [markers]);
  const favoritePlaces = useMemo(
    () =>
      buildDiscoverFavoritePlaces({
        locations: location,
        userCoord: camera.userCoord,
        t: (key: string) => t(key),
      }),
    [camera.userCoord, location, t]
  );
  const filteredMarkers = useMemo(
    () => filters.filterMarkers(markers),
    [filters.filterMarkers, markers]
  );

  // Saved location markers
  const savedLocationMarkers = useSavedLocationMarkers(location);

  // Combined map markers (filter active = only filtered, otherwise include saved locations)
  const allMapMarkers = useMemo(
    () => (filters.hasActiveFilter ? filteredMarkers : [...filteredMarkers, ...savedLocationMarkers]),
    [filters.hasActiveFilter, filteredMarkers, savedLocationMarkers]
  );

  // Filtrujeme markery podľa viditeľnej oblasti mapy, aby sme znížili počet markerov počas pohybu.
  // POZOR: prah je SINGLE_MODE_ZOOM + 0.5 (= 14.5), nie presne 14.
  // Dôvod: pri zoomovaní v cluster mode (napr. zoom 13→14.1→13) camera.mapZoom dočasne
  // prekročí SINGLE_MODE_ZOOM počas aktívnej animácie, kým displayMode je stále "cluster"
  // (kvôli hysteréznej zóne 14.0–14.18). Keby sme filtrovali pri 14.0, zmenila by sa
  // sada filteredMarkers počas animácie → clustre sa prepočítajú → 40+ annotation images
  // sa zmení naraz → native MapKit crash. Threshold 14.5 zaručuje, že filter beží len
  // keď sme spoľahlivo v single mode, nie v prechodovej zóne.
  const shouldFilterByViewport =
    allMapMarkers.length > 250 && camera.mapZoom >= SINGLE_MODE_ZOOM + 0.5;
  const mapMarkers = useMemo(() => {
    if (shouldFilterByViewport) {
      return filterMarkersByViewport(allMapMarkers, camera.mapCenter, camera.mapZoom);
    }
    return allMapMarkers;
  }, [allMapMarkers, camera.mapCenter, camera.mapZoom, shouldFilterByViewport]);

  const stableMapMarkers = mapMarkers;

  // Sheet change handlers
  const handleSearchSheetChange = useCallback(
    (index: number) => {
      setSearchSheetIndex(index);
      setIsSheetOpen(index !== -1);
    },
    []
  );

  const handleCloseSearch = useCallback(() => {
    setSearchSheetIndex(-1);
    setIsSheetOpen(false);
    setOpen(false);
  }, []);

  const handleSelectFavorite = useCallback(
    (place: DiscoverFavoritePlace) => {
      const matchingLocation = location.find((item) => item.label === place.label);
      if (matchingLocation) {
        setOption(matchingLocation.label);
      } else if (place.id === "favorite-your-location") {
        setOption("yourLocation");
      }

      setMapCamera(camera.cameraRef, { center: place.coord, zoom: 14, durationMs: 800 });
      handleCloseSearch();
    },
    [camera.cameraRef, handleCloseSearch, location]
  );

  const handleOpenSearch = useCallback(() => {
    setOpen(false);
    setSearchSheetIndex(0);
    setIsSheetOpen(true);
  }, []);

  const handleFilterSheetChange = useCallback(
    (index: number) => {
      setIsSheetOpen(index !== -1 || searchSheetIndex !== -1);
    },
    [searchSheetIndex]
  );

  const handleLocationSheetChange = useCallback(
    (index: number) => {
      setIsSheetOpen(index !== -1 || searchSheetIndex !== -1);
    },
    [searchSheetIndex]
  );

  // Camera change handler
  const handleCameraChanged = useCallback(
    (center: [number, number], zoom: number, isUserGesture?: boolean) => {
      camera.handleCameraChanged(center, zoom, isUserGesture);
    },
    [camera.handleCameraChanged]
  );

  const navigateToBranchDetail = useCallback(
    async (branch: BranchData) => {
      camera.setPreserveCamera(true);
      const latest = await camera.syncCameraFromNative();
      if (latest) {
        setCameraSnapshot(latest);
      }
      navigation.navigate("BusinessDetailScreen", { branch });
    },
    [camera.syncCameraFromNative, camera.setPreserveCamera, navigation]
  );

  const handleSelectSearchBranch = useCallback(
    async (branch: BranchData) => {
      handleCloseSearch();

      const branchId = typeof branch.id === "string" ? branch.id : branch.title;
      const markerKey = normalizeId(branchId);
      const marker = markerKey ? markerLookup.get(markerKey) : undefined;

      if (!marker) {
        void navigateToBranchDetail(branch);
        return;
      }

      try {
        const fullBranch = await fetchBranchForMarker(marker);
        void navigateToBranchDetail(fullBranch);
      } catch {
        void navigateToBranchDetail(branch);
      }
    },
    [fetchBranchForMarker, handleCloseSearch, markerLookup, navigateToBranchDetail]
  );

  // Marker press handler
  const handleMarkerPress = useCallback(
    (id: string) => {
      if (loading || error) return;
      if (!id || id === "") {
        setSelectedGroup(null);
        return;
      }

      const group = groupedMarkers.find((g) => g.id === id);
      if (!group) {
        const marker = markers.find((item) => item.id === id);
        if (!marker) return;
        setSelectedGroup(null);
        void fetchBranchForMarker(marker)
          .then((branch) => navigateToBranchDetail(branch))
          .catch(() => undefined);
        return;
      }

      // Multi-pin - show popup
      if (group.items.length > 1) {
        setSelectedGroup({
          coord: { lng: group.lng, lat: group.lat },
          items: group.items,
        });
        return;
      }

      // Single pin - navigate to detail
      setSelectedGroup(null);
      const marker = group.items[0];
      void fetchBranchForMarker(marker)
        .then((branch) => navigateToBranchDetail(branch))
        .catch(() => undefined);
    },
    [loading, error, groupedMarkers, markers, fetchBranchForMarker, navigateToBranchDetail]
  );

  // Error state UI
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>{t("dataLoadFailed")}</Text>
          <Text style={errorStyles.message}>{error}</Text>
          <TouchableOpacity style={errorStyles.button} onPress={refetch}>
            <Text style={errorStyles.buttonText}>{t("tryAgain")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <DiscoverMap
        cameraRef={camera.cameraRef}
        filteredMarkers={stableMapMarkers}
        userCoord={camera.userCoord}
        hasActiveFilter={filters.hasActiveFilter}
        onMarkerPress={handleMarkerPress}
        onCameraChanged={handleCameraChanged}
        cityCenter={NITRA_CENTER}
        initialCamera={cameraSnapshot}
      />



      <DiscoverTopControls
        insetsTop={insets.top}
        open={open}
        setOpen={setOpen}
        location={location}
        setLocation={setLocation}
        option={option}
        setOption={setOption}
        o={!isSheetOpen}
        filterRef={filterRef}
        onOpenSearch={handleOpenSearch}
        userCoord={camera.userCoord}
        mainMapCenter={camera.mapCenter}
        cameraRef={camera.cameraRef}
        t={t}
        onLocationSheetChange={handleLocationSheetChange}
        hasActiveFilter={filters.hasActiveFilter}
        isSearchOpen={searchSheetIndex !== -1}
        onCloseSearch={handleCloseSearch}
      />

      <DiscoverSearchSheet
        onSheetChange={handleSearchSheetChange}
        onClose={handleCloseSearch}
        sheetIndex={searchSheetIndex}
        text={text}
        setText={setText}
        filtered={searchBranches}
        onSelectBranch={handleSelectSearchBranch}
        favoritePlaces={favoritePlaces}
        onSelectFavorite={handleSelectFavorite}
        autoFocus={AppConfig.discoverSearchV2Enabled}
        showFavorites={AppConfig.discoverSearchV2Enabled}
        t={t}
      />

      <DiscoverFilterSheet
        filterRef={filterRef}
        snapPoints={snapPoints}
        onSheetChange={handleFilterSheetChange}
        insetsBottom={insets.bottom}
        filter={filters.filter}
        setFilter={filters.setFilter}
        rating={filters.ratingFilter}
        setRating={filters.setRatingFilter}
        filterOptions={DISCOVER_FILTER_OPTIONS}
        filterIcons={FILTER_ICONS}
        subcategories={DISCOVER_SUBCATEGORIES}
        sub={filters.sub}
        toggle={filters.toggleSubcategory}
        count={filters.filterCount}
        appliedFilters={filters.appliedFilters}
        setAppliedFilters={filters.setAppliedFilters}
        setAppliedRatings={filters.setAppliedRatings}
        setSub={filters.setSub}
        subcategoryChipWidth={subcategoryChipWidth}
        t={t}
      />

      <DiscoverSideFilterPanel
        visible={sideFilterOpen}
        onOpen={() => setSideFilterOpen(true)}
        onClose={() => setSideFilterOpen(false)}
        filterOptions={DISCOVER_FILTER_OPTIONS}
        appliedFilters={filters.appliedFilters}
        setAppliedFilters={filters.setAppliedFilters}
        rating={filters.ratingFilter}
        setRating={filters.setRatingFilter}
        setAppliedRatings={filters.setAppliedRatings}
        subcategories={DISCOVER_SUBCATEGORIES}
        sub={filters.sub}
        toggleSubcategory={filters.toggleSubcategory}
      />


      {!isSheetOpen && (
        <DiscoverBranchOverlay
          insetsBottom={insets.bottom}
          categoriesOpen={categoriesOpen}
          setCategoriesOpen={setCategoriesOpen}
          filterOptions={DISCOVER_FILTER_OPTIONS}
          filterIcons={FILTER_ICONS}
          appliedFilters={filters.appliedFilters}
          setAppliedFilters={filters.setAppliedFilters}
          setFilter={filters.setFilter}
          branches={overlayBranches}
          branchCardWidth={branchCardWidth}
          t={t}
        />
      )}

      <DiscoverGroupSheet
        sheetRef={groupSheetRef}
        snapPoints={groupSnapPoints}
        selectedGroup={selectedGroup}
        categoryIcons={FILTER_ICONS}
        onClose={() => setSelectedGroup(null)}
      />

    </SafeAreaView>
  );
}

// Error state styles
const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});



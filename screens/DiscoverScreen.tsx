import { useCallback, useMemo, useRef, useState } from "react";
import { ImageSourcePropType, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type BottomSheet from "@gorhom/bottom-sheet";
import type { BranchData, DiscoverCategory, DiscoverMapMarker, Location } from "../lib/interfaces";
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


// Constants
const NITRA_CENTER: [number, number] = [18.091, 48.3069];
const FILTER_OPTIONS: DiscoverCategory[] = ["Fitness", "Gastro", "Relax", "Beauty"];

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
    const { lat, lng } = m.coord;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  });
};
const FILTER_ICONS: Record<DiscoverCategory, ImageSourcePropType> = {
  Fitness: require("../images/icons/fitness/Fitness.png"),
  Gastro: require("../images/icons/gastro/Gastro.png"),
  Relax: require("../images/icons/relax/Relax.png"),
  Beauty: require("../images/icons/beauty/Beauty.png"),
};
const SUBCATEGORIES = ["Vegan", "Coffee", "Asian", "Pizza", "Sushi", "Fast Food", "Seafood", "Beer"];

// Module-level state for preserving camera between tab switches
let lastDiscoverCameraState: { center: [number, number]; zoom: number } | null = null;
let preserveDiscoverCamera = false;

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useTranslation();
  const [sideFilterOpen, setSideFilterOpen] = useState(false);

  // Refs
  const sheetRef = useRef<BottomSheet>(null);
  const filterRef = useRef<BottomSheet>(null);
  const cameraRef = useRef<any>(null);
  const snapPoints = useMemo(() => ["25%", "85%"], []);

  // Marker branch overrides for specific locations
  const markerBranchOverrides = useMemo(
    () => ({
      gym_365: { title: t("365 GYM Nitra"), image: require("../assets/365.jpg"), category: "Fitness" },
      gym_klub: { title: t("GYM KLUB"), image: require("../assets/klub.jpg"), category: "Fitness" },
      "Diamond gym": { title: t("Diamond Gym"), image: require("../assets/klub.jpg"), category: "Fitness" },
      "Diamond barber": { title: t("Diamond Barber"), image: require("../assets/royal.jpg"), category: "Beauty" },
    }),
    [t]
  );

  // Custom hooks
  const filters = useDiscoverFilters("Gastro");
  const { branches, groupedMarkers, markerItems, loading, error, refetch, fetchBranchForMarker } =
    useDiscoverData({ t, markerBranchOverrides });

  // Location state
  const [location, setLocation] = useState<Location[]>([
    { image: require("../images/home.png"), label: "home" },
    { image: require("../images/business.png"), label: "business" },
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

  // UI state
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [o, setO] = useState<boolean>(true);
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
      navigation.setOptions({
        tabBarStyle: { display: isSheetOpen ? "none" : "flex" },
      });
    }, [navigation, isSheetOpen])
  );

  // Handle tab navigation and camera preservation
  const searchExpandedIndex = snapPoints.length > 1 ? 1 : 0;
  useFocusEffect(
    useCallback(() => {
      if (route.name === "Search") {
        setSearchSheetIndex(searchExpandedIndex);
        const target = lastDiscoverCameraState?.center ?? camera.userCoord ?? NITRA_CENTER;
        const zoomLevel = lastDiscoverCameraState?.zoom ?? 14;
        cameraRef.current?.setCamera({
          centerCoordinate: target,
          zoomLevel,
          animationDuration: 0,
        });
        return;
      }
      if (preserveDiscoverCamera) {
        if (lastDiscoverCameraState) {
          cameraRef.current?.setCamera({
            centerCoordinate: lastDiscoverCameraState.center,
            zoomLevel: lastDiscoverCameraState.zoom,
            animationDuration: 0,
          });
        }
        preserveDiscoverCamera = false;
      }
    }, [route.name, searchExpandedIndex, camera.userCoord])
  );

  // Computed dimensions
  const subcategoryChipWidth = Math.max(96, Math.floor((screenWidth - 16 * 2 - 12 * 2) / 3));
  const branchCardWidth = Math.max(280, Math.min(340, screenWidth - 48));

  // Filter branches and markers
  const filteredBranches = filters.filterBranches(branches, text);
  const filteredMarkers = filters.filterMarkers(markerItems);

  // Saved location markers
  const savedLocationMarkers = useSavedLocationMarkers(location);

  // Combined map markers (filter active = only filtered, otherwise include saved locations)
  const allMapMarkers = useMemo(
    () => (filters.hasActiveFilter ? filteredMarkers : [...filteredMarkers, ...savedLocationMarkers]),
    [filters.hasActiveFilter, filteredMarkers, savedLocationMarkers]
  );

  // Filtrujeme markery podľa viditeľnej oblasti mapy
  // Pri veľkom počte markerov to znižuje záťaž na JavaScript
  const mapMarkers = useMemo(
    () => filterMarkersByViewport(allMapMarkers, camera.mapCenter, camera.mapZoom),
    [allMapMarkers, camera.mapCenter, camera.mapZoom]
  );

  // Sheet change handlers
  const handleSearchSheetChange = useCallback(
    (index: number) => {
      setSearchSheetIndex(index);
      setO(index === -1);
      setIsSheetOpen(index !== -1);
      if (index === -1 && route.name === "Search") {
        preserveDiscoverCamera = true;
        navigation.navigate(t("Discover"));
      }
    },
    [route.name, navigation, t]
  );

  const handleFilterSheetChange = useCallback((index: number) => {
    setO(index === -1);
    setIsSheetOpen(index !== -1);
  }, []);

  const handleLocationSheetChange = useCallback((index: number) => {
    setO(index === -1);
    setIsSheetOpen(index !== -1);
  }, []);

  // Camera change handler
  const handleCameraChanged = useCallback(
    (center: [number, number], zoom: number, isUserGesture?: boolean) => {
      camera.handleCameraChanged(center, zoom, isUserGesture);
      if (route.name !== "Search") {
        lastDiscoverCameraState = { center, zoom };
      }
    },
    [camera, route.name]
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
      if (!group) return;

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
      fetchBranchForMarker(marker).then((branch) => {
        navigation.navigate("BusinessDetailScreen", { branch });
      });
    },
    [loading, error, groupedMarkers, fetchBranchForMarker, navigation]
  );

  // Error state UI
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Nepodarilo sa načítať dáta</Text>
          <Text style={errorStyles.message}>{error}</Text>
          <TouchableOpacity style={errorStyles.button} onPress={refetch}>
            <Text style={errorStyles.buttonText}>Skúsiť znova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <DiscoverMap
        cameraRef={cameraRef}
        filteredMarkers={mapMarkers}
        onMarkerPress={handleMarkerPress}
        selectedGroup={selectedGroup}
        categoryIcons={FILTER_ICONS}
        onUserLocationUpdate={camera.handleUserLocationUpdate}
        onCameraChanged={handleCameraChanged}
        mapZoom={camera.mapZoom}
        cityCenter={NITRA_CENTER}
        isFilterActive={filters.hasActiveFilter}
      />



      <DiscoverTopControls
        insetsTop={insets.top}
        open={open}
        setOpen={setOpen}
        location={location}
        setLocation={setLocation}
        option={option}
        setOption={setOption}
        o={o}
        sheetRef={sheetRef}
        filterRef={filterRef}
        userCoord={camera.userCoord}
        mainMapCenter={camera.mapCenter}
        cameraRef={cameraRef}
        t={t}
        onLocationSheetChange={handleLocationSheetChange}
        hasActiveFilter={filters.hasActiveFilter}
      />

      <DiscoverSearchSheet
        sheetRef={sheetRef}
        snapPoints={snapPoints}
        onSheetChange={handleSearchSheetChange}
        sheetIndex={searchSheetIndex}
        text={text}
        setText={setText}
        filtered={filteredBranches}
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
        filterOptions={FILTER_OPTIONS}
        filterIcons={FILTER_ICONS}
        subcategories={SUBCATEGORIES}
        sub={filters.sub}
        toggle={filters.toggleSubcategory}
        count={filters.filterCount}
        setAppliedFilter={filters.setAppliedFilter}
        setAppliedRatings={filters.setAppliedRatings}
        setSub={filters.setSub}
        subcategoryChipWidth={subcategoryChipWidth}
        t={t}
      />

      <DiscoverSideFilterPanel
        visible={sideFilterOpen}
        onOpen={() => setSideFilterOpen(true)}
        onClose={() => setSideFilterOpen(false)}
        filterOptions={FILTER_OPTIONS}
        appliedFilter={filters.appliedFilter}
        setAppliedFilter={filters.setAppliedFilter}
        rating={filters.ratingFilter}
        setRating={filters.setRatingFilter}
        setAppliedRatings={filters.setAppliedRatings}
        subcategories={SUBCATEGORIES}
        sub={filters.sub}
        toggleSubcategory={filters.toggleSubcategory}
      />


      {!isSheetOpen && (
        <DiscoverBranchOverlay
          insetsBottom={insets.bottom}
          categoriesOpen={categoriesOpen}
          setCategoriesOpen={setCategoriesOpen}
          filterOptions={FILTER_OPTIONS}
          filterIcons={FILTER_ICONS}
          appliedFilter={filters.appliedFilter}
          setAppliedFilter={filters.setAppliedFilter}
          setFilter={filters.setFilter}
          branches={filteredBranches}
          branchCardWidth={branchCardWidth}
          t={t}
        />
      )}

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

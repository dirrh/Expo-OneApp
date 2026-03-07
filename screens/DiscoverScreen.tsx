/**
 * DiscoverScreen: Mapová obrazovka Discover riadi kameru, markery, filtre, vyhľadávanie a detail overlay.
 *
 * Prečo: Jedna orchestrácia mapových stavov drží plynulé prechody medzi mapou, searchom a detailom prevádzky.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, ImageSourcePropType, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useNavigationState,
} from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import type {
  BranchData,
  DiscoverAddressSuggestion,
  DiscoverCategory,
  DiscoverFavoritePlace,
  DiscoverMapMarker,
  Location,
} from "../lib/interfaces";
import DiscoverMap from "../components/discover/DiscoverMap";
import { MapErrorBoundary } from "../components/discover/MapErrorBoundary";
import DiscoverTopControls from "../components/discover/DiscoverTopControls";
import DiscoverSearchSheet from "../components/discover/DiscoverSearchSheet";
import DiscoverFilterSheet from "../components/discover/DiscoverFilterSheet";
import DiscoverBranchOverlay from "../components/discover/DiscoverBranchOverlay";
import { styles } from "../components/discover/discoverStyles";
import {
  useDiscoverFilters,
  useDiscoverCamera,
  useDiscoverData,
  useAppStateActive,
  useSavedLocationMarkers,
} from "../lib/hooks";
import DiscoverSideFilterPanel from "../components/discover/DiscoverSideFilterPanel";
import DiscoverGroupSheet from "../components/discover/DiscoverGroupSheet";
import { setMapCamera } from "../lib/maps/camera";
import { SINGLE_MODE_ZOOM } from "../lib/constants/discover";
import { filterMarkersByViewport } from "../lib/maps/viewportFilter";
import { AppConfig } from "../lib/config/AppConfig";
import { appendDerivedBranchesFromMarkers } from "../lib/data/mappers";
import { normalizeId } from "../lib/data/utils/id";
import { useFavorites } from "../lib/FavoritesContext";
import { discoverDebugLog } from "../lib/debug/discoverDebug";
import {
  DISCOVER_FILTER_OPTIONS,
  DISCOVER_SUBCATEGORIES,
  NITRA_CENTER,
} from "../lib/constants/discoverUi";

import {
  buildDiscoverAddressSuggestions,
  buildDiscoverFavoritePlaces,
  buildDiscoverBranchSearchIndex,
  filterDiscoverAddressSuggestions,
  filterDiscoverBranchSearchIndex,
} from "../lib/discover/discoverSearchUtils";

const FILTER_ICONS: Record<DiscoverCategory, ImageSourcePropType> = {
  Fitness: require("../images/icons/fitness/Fitness.png"),
  Gastro: require("../images/icons/gastro/Gastro.png"),
  Relax: require("../images/icons/relax/Relax.png"),
  Beauty: require("../images/icons/beauty/Beauty.png"),
};

type QuickFavoritePrompt = {
  branch: BranchData;
  point: { x: number; y: number };
};
// Camera state is preserved via useDiscoverCamera hook (module-level state).

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const isDiscoverFocused = useIsFocused();
  const isAppActive = useAppStateActive();
  const isDiscoverTabSelected = useNavigationState((state) => {
    const activeRoute = state.routes[state.index];
    return activeRoute?.name === "Discover";
  });
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useTranslation();
  const { isFavorite: isFavoriteBranch, toggleFavorite } = useFavorites();
  const [sideFilterOpen, setSideFilterOpen] = useState(false);
  const isDiscoverRuntimeActive = isDiscoverFocused && isAppActive;
  const shouldRenderDiscoverMap = isAppActive && (isDiscoverFocused || isDiscoverTabSelected);

  // Refs
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const filterRef = useRef<BottomSheet>(null);
  const groupSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["25%", "85%"], []);
  const groupSnapPoints = useMemo(() => ["45%"], []);
  const quickFavoriteAnim = useRef(new Animated.Value(0)).current;

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
    shouldResetOptionOnUserGesture: option !== "yourLocation",
    onOptionReset: () => setOption("yourLocation"),
    active: isDiscoverRuntimeActive,
  });
  const cameraSnapshotRef = useRef(camera.getLastCameraState());

  useEffect(() => {
    if (
      Array.isArray(camera.mapCenter) &&
      camera.mapCenter.length === 2 &&
      Number.isFinite(camera.mapCenter[0]) &&
      Number.isFinite(camera.mapCenter[1]) &&
      Number.isFinite(camera.mapZoom)
    ) {
      cameraSnapshotRef.current = {
        center: camera.mapCenter,
        zoom: camera.mapZoom,
      };
    }
  }, [camera.mapCenter, camera.mapZoom]);

  useEffect(() => {
    if (isDiscoverRuntimeActive) {
      return;
    }

    const latestCamera = camera.getLastCameraState();
    if (latestCamera) {
      cameraSnapshotRef.current = latestCamera;
    }
  }, [camera.getLastCameraState, isDiscoverRuntimeActive]);

  // UI state
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchSheetIndex, setSearchSheetIndex] = useState(-1);
  const [quickFavoritePrompt, setQuickFavoritePrompt] = useState<QuickFavoritePrompt | null>(null);
  const quickFavoriteRequestRef = useRef(0);

  useEffect(() => {
    if (quickFavoritePrompt) {
      quickFavoriteAnim.setValue(0);
      Animated.spring(quickFavoriteAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 9,
      }).start();
    }
  }, [quickFavoritePrompt, quickFavoriteAnim]);

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
        void camera.syncCameraFromNative({ applyToState: false }).then((latest) => {
          if (latest) {
            cameraSnapshotRef.current = latest;
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
  const addressSuggestionIndex = useMemo(
    () => buildDiscoverAddressSuggestions({ branches: searchBranchCandidates, locations: location }),
    [location, searchBranchCandidates]
  );
  const addressSuggestions = useMemo(
    () => filterDiscoverAddressSuggestions(addressSuggestionIndex, text).slice(0, 5),
    [addressSuggestionIndex, text]
  );
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

  // Filtrujeme markery podľa viditeľnej oblasti mapy, aby sme znížili počet markerov v single mode.
  // POZOR: prah je SINGLE_MODE_ZOOM + 1.5 (= 15.5).
  //
  // Dôvod: iOS prechádza do single mode pri zoom ≈ 15.38
  //   (singleLayerEnterZoom = 14 + 1.2 = 15.2, + hysteréza 0.18).
  //   Keby sme filtrovali pri nižšom zoome (napr. 14.5), filteredMarkers by sa zmenilo
  //   POČAS cluster mode animácie → clustre prepočítané → pool update počas MapKit animácie
  //   → native crash. 15.5 zaručuje, že filter sa aktivuje len keď je displayMode spoľahlivo
  //   "single" a cluster vrstva je neaktívna.
  //
  //   Vedľajší efekt: pri cluster mode (zoom < 15.38) sú vždy k dispozícii VŠETKY markery
  //   pre Supercluster → clustre sa nikdy nestratia kvôli prázdnemu viewportu.
  const shouldFilterByViewport =
    Platform.OS !== "ios" &&
    allMapMarkers.length > 250 &&
    camera.mapZoom >= SINGLE_MODE_ZOOM + 1.5;
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
    setQuickFavoritePrompt(null);
  }, []);

  const handleSelectFavorite = useCallback(
    (place: DiscoverFavoritePlace) => {
      setQuickFavoritePrompt(null);
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
    setQuickFavoritePrompt(null);
    setSearchSheetIndex(0);
    setIsSheetOpen(true);
  }, []);

  const handleSelectAddressSuggestion = useCallback(
    (item: DiscoverAddressSuggestion) => {
      setQuickFavoritePrompt(null);
      setMapCamera(camera.cameraRef, { center: item.coord, zoom: 15, durationMs: 800 });
      handleCloseSearch();
    },
    [camera.cameraRef, handleCloseSearch]
  );

  const handleMarkerLongPress = useCallback(
    (id: string, _coord: [number, number], point: [number, number]) => {
      const markerKey = normalizeId(id);
      const marker = markerKey ? markerLookup.get(markerKey) : undefined;
      if (!marker) {
        setQuickFavoritePrompt(null);
        return;
      }

      setOpen(false);
      setSelectedGroup(null);
      handleCloseSearch();
      const nextPoint = {
        x: Number(point[0]),
        y: Number(point[1]),
      };
      if (!Number.isFinite(nextPoint.x) || !Number.isFinite(nextPoint.y)) {
        return;
      }

      const fallbackBranch = buildBranchFromMarker(marker);
      setQuickFavoritePrompt({
        branch: fallbackBranch,
        point: nextPoint,
      });

      const requestId = quickFavoriteRequestRef.current + 1;
      quickFavoriteRequestRef.current = requestId;
      void fetchBranchForMarker(marker)
        .then((branch) => {
          if (!mountedRef.current || quickFavoriteRequestRef.current !== requestId) {
            return;
          }

          setQuickFavoritePrompt((current) => {
            if (!current || current.branch.id !== fallbackBranch.id) {
              return current;
            }

            return {
              branch,
              point: current.point,
            };
          });
        })
        .catch(() => undefined);
    },
    [buildBranchFromMarker, fetchBranchForMarker, handleCloseSearch, markerLookup]
  );

  const handleQuickFavoritePress = useCallback(() => {
    if (!quickFavoritePrompt) {
      return;
    }

    toggleFavorite(quickFavoritePrompt.branch);
  }, [quickFavoritePrompt, toggleFavorite]);

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

  const handleUserGestureStart = useCallback(() => {
    setQuickFavoritePrompt(null);
  }, []);

  // Camera change handler
  const handleCameraChanged = useCallback(
    (center: [number, number], zoom: number, isUserGesture?: boolean) => {
      if (isUserGesture) {
        setQuickFavoritePrompt(null);
      }
      camera.handleCameraChanged(center, zoom, isUserGesture);
    },
    [camera.handleCameraChanged]
  );

  const navigateToBranchDetail = useCallback(
    async (branch: BranchData) => {
      setQuickFavoritePrompt(null);
      discoverDebugLog("[DiscoverMapDebug:screen] navigateToBranchDetail:start", {
        branchId: branch.id,
        branchTitle: branch.title,
      });
      camera.setPreserveCamera(true);
      const latest = await camera.syncCameraFromNative({ applyToState: false });
      if (latest) {
        cameraSnapshotRef.current = latest;
        discoverDebugLog("[DiscoverMapDebug:screen] navigateToBranchDetail:cameraSnapshot", latest);
      }
      discoverDebugLog("[DiscoverMapDebug:screen] navigateToBranchDetail:navigate", {
        branchId: branch.id,
      });
      navigation.navigate("BusinessDetailScreen", {
        branch,
        source: "discover",
        disableTransitionAnimation: Platform.OS === "android",
      });
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
        if (!mountedRef.current) return;
        void navigateToBranchDetail(fullBranch);
      } catch {
        if (!mountedRef.current) return;
        void navigateToBranchDetail(branch);
      }
    },
    [fetchBranchForMarker, handleCloseSearch, markerLookup, navigateToBranchDetail]
  );

  // Marker press handler
  const handleMarkerPress = useCallback(
    (id: string) => {
      setQuickFavoritePrompt(null);
      discoverDebugLog("[DiscoverMapDebug:screen] handleMarkerPress:start", {
        id,
        loading,
        hasError: Boolean(error),
      });
      if (loading || error) return;
      if (!id || id === "") {
        discoverDebugLog("[DiscoverMapDebug:screen] handleMarkerPress:clearSelection");
        setSelectedGroup(null);
        return;
      }

      const group = groupedMarkers.find((g) => g.id === id);
      if (!group) {
        const marker = markers.find((item) => item.id === id);
        if (!marker) return;
        discoverDebugLog("[DiscoverMapDebug:screen] handleMarkerPress:directMarker", {
          markerId: marker.id,
        });
        setSelectedGroup(null);
        void fetchBranchForMarker(marker)
          .then((branch) => {
            discoverDebugLog("[DiscoverMapDebug:screen] handleMarkerPress:directMarkerResolved", {
              branchId: branch.id,
            });
            if (mountedRef.current) navigateToBranchDetail(branch);
          })
          .catch(() => undefined);
        return;
      }

      // Multi-pin - show popup
      if (group.items.length > 1) {
        discoverDebugLog("[DiscoverMapDebug:screen] handleMarkerPress:grouped", {
          groupId: group.id,
          count: group.items.length,
        });
        setSelectedGroup({
          coord: { lng: group.lng, lat: group.lat },
          items: group.items,
        });
        return;
      }

      // Single pin - navigate to detail
      discoverDebugLog("[DiscoverMapDebug:screen] handleMarkerPress:singleFromGroup", {
        groupId: group.id,
      });
      setSelectedGroup(null);
      const marker = group.items[0];
      void fetchBranchForMarker(marker)
        .then((branch) => {
          discoverDebugLog("[DiscoverMapDebug:screen] handleMarkerPress:singleResolved", {
            branchId: branch.id,
          });
          if (mountedRef.current) navigateToBranchDetail(branch);
        })
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

  const quickFavoritePosition = quickFavoritePrompt
    ? {
        left: Math.max(8, Math.min(screenWidth - 35, quickFavoritePrompt.point.x-10)),
        top: Math.max(insets.top + 8, quickFavoritePrompt.point.y - 75),
      }
    : null;

  const isQuickFavoriteActive = quickFavoritePrompt
    ? isFavoriteBranch(quickFavoritePrompt.branch.id)
    : false;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <MapErrorBoundary>
        {shouldRenderDiscoverMap ? (
          <DiscoverMap
            cameraRef={camera.cameraRef}
            filteredMarkers={stableMapMarkers}
            userCoord={camera.userCoord}
            hasActiveFilter={filters.hasActiveFilter}
            onMarkerPress={handleMarkerPress}
            onMarkerLongPress={handleMarkerLongPress}
            onUserGestureStart={handleUserGestureStart}
            onCameraChanged={handleCameraChanged}
            cityCenter={NITRA_CENTER}
            initialCamera={cameraSnapshotRef.current}
          />
        ) : (
          <View style={styles.map} />
        )}
      </MapErrorBoundary>

      {quickFavoritePrompt && quickFavoritePosition ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            screenStyles.quickFavoriteWrap,
            {
              left: quickFavoritePosition.left,
              top: quickFavoritePosition.top,
              opacity: quickFavoriteAnim,
              transform: [
                {
                  scale: quickFavoriteAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.75, 1],
                  }),
                },
                {
                  translateY: quickFavoriteAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleQuickFavoritePress}
            accessibilityRole="button"
            accessibilityLabel={t("discoverMapQuickFavoriteA11y", {
              place: quickFavoritePrompt.branch.title,
            })}
            style={[
              screenStyles.quickFavoriteButton,
              isQuickFavoriteActive && screenStyles.quickFavoriteButtonActive,
            ]}
          >
            <Ionicons
              name={isQuickFavoriteActive ? "heart" : "heart-outline"}
              size={13}
              color={isQuickFavoriteActive ? "#FFFFFF" : "#EB8100"}
            />
          </TouchableOpacity>
        </Animated.View>
      ) : null}



      <DiscoverTopControls
        insetsTop={insets.top}
        open={open}
        setOpen={setOpen}
        location={location}
        setLocation={setLocation}
        option={option}
        setOption={setOption}
        searchText={text}
        onApplySearchText={setText}
        o={!isSheetOpen}
        filterRef={filterRef}
        onOpenSearch={handleOpenSearch}
        userCoord={camera.userCoord}
        mainMapCenter={camera.mapCenter}
        mainMapZoom={camera.mapZoom}
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
        addressSuggestions={addressSuggestions}
        onSelectBranch={handleSelectSearchBranch}
        onSelectAddressSuggestion={handleSelectAddressSuggestion}
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

const screenStyles = StyleSheet.create({
  quickFavoriteWrap: {
    position: "absolute",
    zIndex: 26,
    elevation: 26,
  },
  quickFavoriteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  quickFavoriteButtonActive: {
    backgroundColor: "#EB8100",
  },
});

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



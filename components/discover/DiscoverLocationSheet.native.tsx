import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Text, TextInput, View, Platform } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import MapView, { Marker, type Region } from "react-native-maps";
import { styles } from "./discoverStyles";
import { normalizeCenter, setMapCamera, zoomToRegion } from "../../lib/maps/camera";
import { STATIC_MAP_ZOOM } from "../../lib/constants/discover";
import type {
  DiscoverLocationSearchResult,
  DiscoverLocationSheetProps,
  LocationAddStepProps,
  LocationDetailsStepProps,
  LocationMapStepProps,
  LocationSearchStepProps,
} from "../../lib/interfaces";

const SAVED_LOCATION_LIST_ICON = require("../../images/pin.png");
const SAVED_LOCATION_MARKER_ICON = require("../../images/pin.png");

type LocationStep = "add" | "details" | "search" | "map";

const LOCATION_FALLBACK_COORD: [number, number] = [18.091, 48.3069];
const QUICK_SAVE_DEFAULT_LABEL = "Favorite place";

const formatLocationCoordinateSubtitle = (coord: [number, number]): string =>
  `${coord[1].toFixed(5)}, ${coord[0].toFixed(5)}`;

/**
 * LocationAddStep: Prvý krok flowu pre pridanie lokality: voľba názvu a vstup do detailu.
 *
 * Prečo: Rozdelenie na kroky znižuje kognitívnu záťaž a minimalizuje chyby pri vypĺňaní.
 */
function LocationAddStep({
  addressLine1,
  addressLine2,
  onSearchPress,
  onContinue,
  onMapPress,
}: LocationAddStepProps) {
  return (
    <>
      <View>
        <View style={styles.locationHeaderRowSingle}>
          <Text style={styles.locationSheetTitle}>Add location</Text>
        </View>

        <View style={styles.locationField}>
          <Text style={styles.locationFieldLabel}>Country</Text>
          <View style={styles.locationFieldRow}>
            <Text style={styles.locationFieldValue}>Slovakia</Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </View>
        </View>

        <TouchableOpacity style={styles.locationField} activeOpacity={0.9} onPress={onSearchPress}>
          <Text style={styles.locationFieldLabel}>Street name and number</Text>
          <Text
            style={[styles.locationInput, !addressLine1 && styles.locationInputPlaceholder]}
          >
            {addressLine1 || "Tap to search"}
          </Text>
          <Text
            style={[
              styles.locationInputSecondary,
              !addressLine2 && styles.locationInputSecondaryPlaceholder,
            ]}
          >
            {addressLine2 || "City and ZIP"}
          </Text>
        </TouchableOpacity>
      </View>

      <View>
        <TouchableOpacity
          style={styles.locationPrimaryButton}
          activeOpacity={0.9}
          onPress={onContinue}
        >
          <Text style={styles.locationPrimaryButtonText}>Continue</Text>
        </TouchableOpacity>

        <View style={styles.locationOrRow}>
          <View style={styles.locationOrLine} />
          <Text style={styles.locationOrText}>OR</Text>
          <View style={styles.locationOrLine} />
        </View>

        <TouchableOpacity
          style={styles.locationSecondaryButton}
          activeOpacity={0.9}
          onPress={onMapPress}
        >
          <Text style={styles.locationSecondaryButtonText}>Set location on a map</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/**
 * LocationDetailsStep: Krok na doplnenie názvu lokality a potvrdenie údajov pred uložením.
 *
 * Prečo: Explicitné potvrdenie detailov pred uložením znižuje počet zle pomenovaných miest.
 */
function LocationDetailsStep({
  locationName,
  onChangeName,
  onBack,
  onSave,
}: LocationDetailsStepProps) {
  return (
    <>
      <View>
        <View style={styles.locationHeaderRow}>
          <TouchableOpacity style={styles.locationBackButton} onPress={onBack} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={20} color="#111" />
          </TouchableOpacity>
          <Text style={styles.locationHeaderTitle}>Location detail</Text>
        </View>

        <View style={styles.locationField}>
          <Text style={styles.locationFieldLabel}>Name</Text>
          <TextInput
            style={styles.locationInput}
            value={locationName}
            onChangeText={onChangeName}
            placeholder="Enter name"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.locationField}>
          <Text style={styles.locationFieldLabel}>Type</Text>
          <View style={styles.locationFieldRow}>
            <Text style={styles.locationFieldValue}>Friend home</Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </View>
        </View>
      </View>

      <View>
        <TouchableOpacity
          style={styles.locationPrimaryButton}
          activeOpacity={0.9}
          onPress={onSave}
        >
          <Text style={styles.locationPrimaryButtonText}>Save Location</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/**
 * LocationSearchStep: Krok s vyhľadávaním adries a výberom výsledku pred otvorením mapy.
 *
 * Prečo: Textové hľadanie je rýchlejšie pri presnej adrese ako manuálne posúvanie mapy.
 */
function LocationSearchStep({
  searchQuery,
  onChangeQuery,
  results,
  onSelectResult,
  onContinue,
  onMapPress,
}: LocationSearchStepProps) {
  return (
    <>
      <View>
        <View style={styles.locationSearchBar}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.locationSearchInput}
            value={searchQuery}
            onChangeText={onChangeQuery}
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.locationSearchList}>
          {results.map((item, index) => (
            <TouchableOpacity
              key={`${item.title}-${item.subtitle}`}
              style={[
                styles.locationSearchItem,
                index === results.length - 1 && styles.locationSearchItemLast,
              ]}
              activeOpacity={0.85}
              onPress={() => onSelectResult(item)}
            >
              <Ionicons name="location-outline" size={18} color="#111" />
              <View style={styles.locationSearchText}>
                <Text style={styles.locationSearchTitle}>{item.title}</Text>
                <Text style={styles.locationSearchSubtitle}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View>
        <TouchableOpacity
          style={styles.locationPrimaryButton}
          activeOpacity={0.9}
          onPress={onContinue}
        >
          <Text style={styles.locationPrimaryButtonText}>Continue</Text>
        </TouchableOpacity>

        <View style={styles.locationOrRow}>
          <View style={styles.locationOrLine} />
          <Text style={styles.locationOrText}>OR</Text>
          <View style={styles.locationOrLine} />
        </View>

        <TouchableOpacity
          style={styles.locationSecondaryButton}
          activeOpacity={0.9}
          onPress={onMapPress}
        >
          <Text style={styles.locationSecondaryButtonText}>Set location on a map</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/**
 * LocationMapStep: Mapový krok na jemné doladenie bodu a finálne uloženie lokality.
 *
 * Prečo: Používateľ vie potvrdiť presné umiestnenie pinu, keď geokóding netrafí úplne presne.
 */
function LocationMapStep({
  selectedCoord,
  selectedCoordLabel,
  selectedLocationTitle,
  selectedLocationSubtitle,
  savePromptVisible,
  quickSaveMode,
  hasMapMoved,
  onBack,
  onCenterPress,
  onSave,
  onLongPressLocation,
  setHasMapMoved,
  setSelectedCoord,
  mapCameraRef,
}: LocationMapStepProps) {
  const initialRegionRef = useRef(
    zoomToRegion([selectedCoord[0], selectedCoord[1]], STATIC_MAP_ZOOM)
  );
  if (Platform.OS === 'web') {
    return (
      <>
        <View style={styles.locationMapStep}>
          <View style={styles.locationHeaderRow}>
            <TouchableOpacity style={styles.locationBackButton} onPress={onBack} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={20} color="#111" />
            </TouchableOpacity>
            <Text style={styles.locationHeaderTitle}>Choose your location</Text>
          </View>
          <View style={[styles.locationMapWrapper, { justifyContent: 'center', alignItems: 'center', minHeight: 300 }]}>
            <Text style={{ textAlign: 'center', color: '#666' }}>
              Map view is not available on web. Please use the mobile app.
            </Text>
          </View>
        </View>
        <View style={styles.locationMapActions}>
          {quickSaveMode ? (
            <TouchableOpacity
              style={styles.locationMapHeartButton}
              activeOpacity={0.9}
              onPress={onSave}
            >
              <Ionicons name="heart" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.locationPrimaryButton} activeOpacity={0.9} onPress={onSave}>
              <Text style={styles.locationPrimaryButtonText}>
                {savePromptVisible ? "Save to favorites" : "Use this map center"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.locationMapStep}>
        <View style={styles.locationHeaderRow}>
          <TouchableOpacity style={styles.locationBackButton} onPress={onBack} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={20} color="#111" />
          </TouchableOpacity>
          <Text style={styles.locationHeaderTitle}>Choose your location</Text>
        </View>

        <View style={styles.locationMapWrapper}>
          <MapView
            ref={mapCameraRef}
            style={styles.locationMap}
            initialRegion={initialRegionRef.current}
            onPanDrag={() => {
              if (!hasMapMoved) {
                setHasMapMoved(true);
              }
            }}
            onRegionChangeComplete={(region: Region) => {
              const { latitude, longitude } = region ?? {};
              if (typeof latitude !== "number" || typeof longitude !== "number") {
                return;
              }
              setSelectedCoord(normalizeCenter([longitude, latitude]));
            }}
            onLongPress={(event) => {
              const { coordinate } = event.nativeEvent ?? {};
              const latitude = coordinate?.latitude;
              const longitude = coordinate?.longitude;
              if (typeof latitude !== "number" || typeof longitude !== "number") {
                return;
              }
              onLongPressLocation(normalizeCenter([longitude, latitude]));
            }}
            showsCompass={false}
            zoomControlEnabled={false}
            toolbarEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: selectedCoord[1],
                longitude: selectedCoord[0],
              }}
              pinColor="#EB8100"
            />
          </MapView>

          <View style={styles.locationMapOverlay} pointerEvents="none">
            {!quickSaveMode ? (
              <View style={styles.locationMapLabel}>
                <Text style={styles.locationMapLabelText} numberOfLines={1}>
                  {selectedLocationTitle || selectedCoordLabel}
                </Text>
              </View>
            ) : null}
            <Image
              source={require("../../images/pin.png")}
              style={styles.locationMapPin}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity
            style={styles.locationMapCenterButton}
            activeOpacity={0.85}
            onPress={onCenterPress}
          >
            <Ionicons name="locate" size={18} color="#fff" />
          </TouchableOpacity>

          {savePromptVisible && !quickSaveMode ? (
            <View style={styles.locationMapSelectionCard}>
              <Text style={styles.locationMapSelectionTitle} numberOfLines={1}>
                {selectedLocationTitle || "Selected location"}
              </Text>
              <Text style={styles.locationMapSelectionSubtitle} numberOfLines={2}>
                {selectedLocationSubtitle || selectedCoordLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.locationMapActions}>
        {quickSaveMode ? (
          <TouchableOpacity
            style={styles.locationMapHeartButton}
            activeOpacity={0.9}
            onPress={onSave}
          >
            <Ionicons name="heart" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.locationMapHint}>
              <Text style={styles.locationMapHintText}>
                {savePromptVisible
                  ? "Ready to save this place to your favorites"
                  : "Long press on the map to pick a spot or use the center pin"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.locationSecondaryButton}
              activeOpacity={0.9}
              onPress={onSave}
            >
              <Text style={styles.locationSecondaryButtonText}>
                {savePromptVisible ? "Save to favorites" : "Use this map center"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );
}

/**
 * DiscoverLocationSheet: Natívny multi-step flow pre správu polohy so search krokom, mapou a uložením bodu.
 *
 * Prečo: Orchestrácia krokov na jednom mieste drží jednotné prechody a správny stav medzi krokmi.
 */
export default function DiscoverLocationSheet({
  locationRef,
  setLocation,
  userCoord,
  mainMapCenter,
  pendingMapSelection,
  onPendingMapSelectionHandled,
  onLocationSheetChange,
}: DiscoverLocationSheetProps) {
  const mapCameraRef = useRef<MapView | null>(null);
  const snapPoints = useMemo(() => ["15%", "92%"], []);
  const fallbackCoord = useMemo(
    () => normalizeCenter(mainMapCenter ?? userCoord ?? LOCATION_FALLBACK_COORD),
    [mainMapCenter, userCoord]
  );
  const [locationStep, setLocationStep] = useState<LocationStep>("add");
  const [locationReturnStep, setLocationReturnStep] = useState<"add" | "search">("add");
  const [searchQuery, setSearchQuery] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [locationName, setLocationName] = useState("");
  const [selectedCoord, setSelectedCoord] = useState<[number, number]>(
    () => fallbackCoord
  );
  const [mapSelectionTitle, setMapSelectionTitle] = useState("Map center");
  const [mapSelectionSubtitle, setMapSelectionSubtitle] = useState(formatLocationCoordinateSubtitle(fallbackCoord));
  const [savePromptVisible, setSavePromptVisible] = useState(false);
  const [quickSaveMode, setQuickSaveMode] = useState(false);
  const [hasMapMoved, setHasMapMoved] = useState(false);
  const searchResults = useMemo<DiscoverLocationSearchResult[]>(
    () => [
      { title: "Hlavna 12", subtitle: "Nitra, Slovakia", coord: [18.08731, 48.30882] },
      { title: "Hlavna 10", subtitle: "Bratislava, Slovakia", coord: [17.10779, 48.14892] },
      { title: "Hlavna 8", subtitle: "Banska Bystrica, Slovakia", coord: [19.14519, 48.73658] },
    ],
    []
  );
  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return searchResults;
    }
    return searchResults.filter((item) => {
      const title = item.title.toLowerCase();
      const subtitle = item.subtitle.toLowerCase();
      return title.includes(query) || subtitle.includes(query);
    });
  }, [searchQuery, searchResults]);
  const selectedCoordLabel = useMemo(() => {
    if (!Array.isArray(selectedCoord) || selectedCoord.length < 2) {
      return "GPS --";
    }
    const [lng, lat] = selectedCoord;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return "GPS --";
    }
    return `GPS ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }, [selectedCoord]);

  const renderLocationBackdrop = useCallback(
    (props: any) => {
      if (locationStep !== "search") {
        return null;
      }
      return (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.3}
          pressBehavior="close"
        />
      );
    },
    [locationStep]
  );

  const openMapStep = useCallback(
    (
      returnTo: "add" | "search",
      options?: {
        coord?: [number, number];
        previewTitle?: string;
        previewSubtitle?: string;
        showSavePrompt?: boolean;
        quickSaveMode?: boolean;
      }
    ) => {
      setLocationReturnStep(returnTo);
      setHasMapMoved(false);
      const target = normalizeCenter(options?.coord ?? fallbackCoord);
      setSelectedCoord(target);
      const nextQuickSaveMode = Boolean(options?.quickSaveMode);
      setQuickSaveMode(nextQuickSaveMode);
      setMapSelectionTitle(nextQuickSaveMode ? "" : options?.previewTitle?.trim() || "Map center");
      setMapSelectionSubtitle(
        nextQuickSaveMode
          ? ""
          : options?.previewSubtitle?.trim() || formatLocationCoordinateSubtitle(target)
      );
      setSavePromptVisible(Boolean(options?.showSavePrompt));
      setLocationName(
        options?.showSavePrompt
          ? nextQuickSaveMode
            ? QUICK_SAVE_DEFAULT_LABEL
            : options?.previewTitle?.trim() || ""
          : ""
      );
      setLocationStep("map");
      locationRef.current?.snapToIndex(1);
    },
    [fallbackCoord, locationRef]
  );

  const handleCenterPress = useCallback(() => {
    const target = fallbackCoord;
    setHasMapMoved(false);
    setSelectedCoord(normalizeCenter(target));
    setMapSelectionTitle(quickSaveMode ? "" : "Current position");
    setMapSelectionSubtitle(
      quickSaveMode ? "" : formatLocationCoordinateSubtitle(normalizeCenter(target))
    );
    setSavePromptVisible(true);
    setLocationName(quickSaveMode ? QUICK_SAVE_DEFAULT_LABEL : "Current position");
  }, [fallbackCoord, quickSaveMode]);

  useEffect(() => {
    if (!pendingMapSelection) {
      return;
    }

    const target = normalizeCenter(pendingMapSelection.coord);
    setAddressLine1("");
    setAddressLine2("");
    setSearchQuery("");
    openMapStep("add", {
      coord: target,
      showSavePrompt: true,
      quickSaveMode: true,
    });
    onPendingMapSelectionHandled?.(pendingMapSelection.id);
  }, [onPendingMapSelectionHandled, openMapStep, pendingMapSelection]);

  const handleLocationSheetChange = (index: number) => {
    if (index === -1) {
      setLocationStep("add");
      setLocationReturnStep("add");
      setHasMapMoved(false);
      setSavePromptVisible(false);
      setQuickSaveMode(false);
      setLocationName("");
      setSelectedCoord(fallbackCoord);
      setMapSelectionTitle("Map center");
      setMapSelectionSubtitle(formatLocationCoordinateSubtitle(fallbackCoord));
    }
    onLocationSheetChange?.(index);
  };

  const saveLocation = useCallback(
    (label: string, coord: [number, number]) => {
      setLocation((prev) => [
        ...prev,
        {
          image: SAVED_LOCATION_LIST_ICON,
          markerImage: SAVED_LOCATION_MARKER_ICON,
          label,
          coord,
          isSaved: true,
        },
      ]);
    },
    [setLocation]
  );

  const handleSaveDetails = useCallback(() => {
    const trimmedName = locationName.trim();
    if (!trimmedName) {
      return;
    }
    const coord: [number, number] = [selectedCoord[0], selectedCoord[1]];
    saveLocation(trimmedName, coord);
    setAddressLine1(mapSelectionTitle);
    setAddressLine2(mapSelectionSubtitle);
    setLocationName("");
    setSavePromptVisible(false);
    setQuickSaveMode(false);
    setLocationStep("add");
    locationRef.current?.close();
  }, [
    locationName,
    locationRef,
    mapSelectionSubtitle,
    mapSelectionTitle,
    saveLocation,
    selectedCoord,
  ]);

  const handleMapSave = useCallback(() => {
    const lat = selectedCoord[1].toFixed(5);
    const lng = selectedCoord[0].toFixed(5);
    const trimmedName = locationName.trim();
    const resolvedName = trimmedName || (quickSaveMode ? QUICK_SAVE_DEFAULT_LABEL : "");
    if (!resolvedName) {
      setLocationStep("details");
      return;
    }
    saveLocation(resolvedName, [selectedCoord[0], selectedCoord[1]]);
    setAddressLine1(quickSaveMode ? "" : mapSelectionTitle);
    setAddressLine2(quickSaveMode ? "" : mapSelectionSubtitle || `${lat}, ${lng}`);
    setLocationName("");
    setSavePromptVisible(false);
    setQuickSaveMode(false);
    setLocationStep("add");
    locationRef.current?.close();
  }, [
    quickSaveMode,
    locationName,
    locationRef,
    mapSelectionSubtitle,
    mapSelectionTitle,
    saveLocation,
    selectedCoord,
  ]);

  const handleSearchResultSelect = useCallback(
    (item: DiscoverLocationSearchResult) => {
      setAddressLine1(item.title);
      setAddressLine2(item.subtitle);
      setSearchQuery(item.title);
      openMapStep("search", {
        coord: item.coord,
        previewTitle: item.title,
        previewSubtitle: item.subtitle,
        showSavePrompt: true,
      });
    },
    [openMapStep]
  );

  const handleMapLongPressLocation = useCallback((coord: [number, number]) => {
    const normalizedCoord = normalizeCenter(coord);
    setHasMapMoved(false);
    setSelectedCoord(normalizedCoord);
    setMapSelectionTitle(quickSaveMode ? "" : "Dropped pin");
    setMapSelectionSubtitle(
      quickSaveMode ? "" : formatLocationCoordinateSubtitle(normalizedCoord)
    );
    setSavePromptVisible(true);
    setLocationName(quickSaveMode ? QUICK_SAVE_DEFAULT_LABEL : "Dropped pin");
  }, [quickSaveMode]);

  useEffect(() => {
    if (locationStep !== "map" || hasMapMoved) {
      return;
    }
    setMapCamera(mapCameraRef, { center: selectedCoord, zoom: STATIC_MAP_ZOOM, durationMs: 0 });
  }, [locationStep, hasMapMoved, selectedCoord]);

  useEffect(() => {
    if (locationStep !== "map" || !hasMapMoved) {
      return;
    }
    setMapSelectionTitle(quickSaveMode ? "" : "Map center");
    setMapSelectionSubtitle(quickSaveMode ? "" : selectedCoordLabel);
    setSavePromptVisible(true);
    setLocationName(quickSaveMode ? QUICK_SAVE_DEFAULT_LABEL : "Map center");
  }, [hasMapMoved, locationStep, quickSaveMode, selectedCoordLabel]);

  return (
    <BottomSheet
      ref={locationRef}
      snapPoints={snapPoints}
      index={-1}
      enablePanDownToClose
      enableContentPanningGesture={locationStep !== "map"}
      backgroundStyle={locationStep === "search" ? styles.locationSheetSearchBackground : undefined}
      containerStyle={styles.locationSheetContainer}
      onChange={handleLocationSheetChange}
      backdropComponent={renderLocationBackdrop}
    >
      <BottomSheetScrollView
        contentContainerStyle={
          locationStep === "map" ? styles.locationSheetContentMap : styles.locationSheetContent
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={locationStep !== "map"}
      >
        {locationStep === "add" ? (
          <LocationAddStep
            addressLine1={addressLine1}
            addressLine2={addressLine2}
            onSearchPress={() => {
              setSearchQuery(addressLine1);
              setLocationStep("search");
            }}
            onContinue={() => setLocationStep("details")}
            onMapPress={() => openMapStep("add")}
          />
        ) : locationStep === "details" ? (
          <LocationDetailsStep
            locationName={locationName}
            onChangeName={setLocationName}
            onBack={() => setLocationStep("add")}
            onSave={handleSaveDetails}
          />
        ) : locationStep === "search" ? (
          <LocationSearchStep
            searchQuery={searchQuery}
            onChangeQuery={setSearchQuery}
            results={filteredResults}
            onSelectResult={handleSearchResultSelect}
            onContinue={() => setLocationStep("details")}
            onMapPress={() => openMapStep("search")}
          />
        ) : (
          <LocationMapStep
            selectedCoord={selectedCoord}
            selectedCoordLabel={selectedCoordLabel}
            selectedLocationTitle={mapSelectionTitle}
            selectedLocationSubtitle={mapSelectionSubtitle}
            savePromptVisible={savePromptVisible}
            quickSaveMode={quickSaveMode}
            hasMapMoved={hasMapMoved}
            onBack={() => setLocationStep(locationReturnStep)}
            onCenterPress={handleCenterPress}
            onSave={handleMapSave}
            onLongPressLocation={handleMapLongPressLocation}
            setHasMapMoved={setHasMapMoved}
            setSelectedCoord={setSelectedCoord}
            mapCameraRef={mapCameraRef}
          />
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

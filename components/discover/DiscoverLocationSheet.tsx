import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Text, TextInput, View, Platform } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Mapbox, { Camera, MapView, UserLocation } from "@rnmapbox/maps";
import { styles } from "./discoverStyles";
import type {
  DiscoverLocationSearchResult,
  DiscoverLocationSheetProps,
  LocationAddStepProps,
  LocationDetailsStepProps,
  LocationMapStepProps,
  LocationSearchStepProps,
} from "../../lib/interfaces";

const SAVED_LOCATION_LIST_ICON = require("../../images/pin.png");
const SAVED_LOCATION_MARKER_ICON = require("../../images/test_placeholder.png");

type LocationStep = "add" | "details" | "search" | "map";

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

function LocationMapStep({
  selectedCoord,
  selectedCoordLabel,
  hasMapMoved,
  onBack,
  onCenterPress,
  onSave,
  setHasMapMoved,
  setSelectedCoord,
  mapCameraRef,
}: LocationMapStepProps) {
  // Web fallback - Mapbox doesn't work on web
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
          <TouchableOpacity style={styles.locationPrimaryButton} activeOpacity={0.9} onPress={onSave}>
            <Text style={styles.locationPrimaryButtonText}>Save Location</Text>
          </TouchableOpacity>
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
            style={styles.locationMap}
            styleURL={Mapbox.StyleURL.Street}
            scaleBarEnabled={false}
            onCameraChanged={(state) => {
              const center =
                state?.properties?.center ??
                (state as { geometry?: { coordinates?: number[] } })?.geometry?.coordinates;
              if (!Array.isArray(center) || center.length < 2) {
                return;
              }
              const isUserGesture = state?.gestures?.isGestureActive;
              if (isUserGesture && !hasMapMoved) {
                setHasMapMoved(true);
              }
              if (isUserGesture || hasMapMoved) {
                setSelectedCoord([center[0], center[1]]);
              }
            }}
          >
            <Camera ref={mapCameraRef} centerCoordinate={selectedCoord} zoomLevel={14} />
            <UserLocation
              visible
              onUpdate={(location) => {
                if (hasMapMoved) {
                  return;
                }
                const nextCoord: [number, number] = [
                  location.coords.longitude,
                  location.coords.latitude,
                ];
                setSelectedCoord(nextCoord);
                mapCameraRef.current?.setCamera({
                  centerCoordinate: nextCoord,
                  zoomLevel: 14,
                  animationDuration: 350,
                });
              }}
            />
          </MapView>

          <View style={styles.locationMapOverlay} pointerEvents="none">
            <View style={styles.locationMapLabel}>
              <Text style={styles.locationMapLabelText}>{selectedCoordLabel}</Text>
            </View>
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
        </View>
      </View>

      <View style={styles.locationMapActions}>
        <View style={styles.locationMapHint}>
          <Text style={styles.locationMapHintText}>
            Move the map and set your correct location
          </Text>
        </View>

        <TouchableOpacity
          style={styles.locationSecondaryButton}
          activeOpacity={0.9}
          onPress={onSave}
        >
          <Text style={styles.locationSecondaryButtonText}>Save Location</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

export default function DiscoverLocationSheet({
  locationRef,
  setLocation,
  userCoord,
  mainMapCenter,
  onLocationSheetChange,
}: DiscoverLocationSheetProps) {
  const mapCameraRef = useRef<Camera>(null);
  const snapPoints = useMemo(() => ["15%", "92%"], []);
  const [locationStep, setLocationStep] = useState<LocationStep>("add");
  const [locationReturnStep, setLocationReturnStep] = useState<"add" | "search">("add");
  const [searchQuery, setSearchQuery] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [locationName, setLocationName] = useState("");
  const [selectedCoord, setSelectedCoord] = useState<[number, number]>(
    () => mainMapCenter ?? userCoord ?? [18.091, 48.3069]
  );
  const [hasMapMoved, setHasMapMoved] = useState(false);
  const searchResults = useMemo<DiscoverLocationSearchResult[]>(
    () => [
      { title: "Hlavna 12", subtitle: "Nitra, Slovakia" },
      { title: "Hlavna 10", subtitle: "Bratislava, Slovakia" },
      { title: "Hlavna 8", subtitle: "Banska Bystrica, Slovakia" },
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
    (returnTo: "add" | "search") => {
      setLocationReturnStep(returnTo);
      setHasMapMoved(false);
      const target = userCoord ?? mainMapCenter ?? [18.091, 48.3069];
      setSelectedCoord(target);
      setLocationStep("map");
      locationRef.current?.snapToIndex(1);
    },
    [mainMapCenter, userCoord, locationRef]
  );

  const handleCenterPress = useCallback(() => {
    const target = userCoord ?? mainMapCenter ?? [18.091, 48.3069];
    setHasMapMoved(false);
    setSelectedCoord([target[0], target[1]]);
    mapCameraRef.current?.setCamera({
      centerCoordinate: target,
      zoomLevel: 14,
      animationDuration: 500,
    });
  }, [mainMapCenter, userCoord]);

  const handleLocationSheetChange = (index: number) => {
    if (index === -1) {
      setLocationStep("add");
      setLocationReturnStep("add");
      setHasMapMoved(false);
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
    setLocationName("");
    setLocationStep("add");
    locationRef.current?.close();
  }, [locationName, saveLocation, selectedCoord, locationRef]);

  const handleMapSave = useCallback(() => {
    const lat = selectedCoord[1].toFixed(5);
    const lng = selectedCoord[0].toFixed(5);
    const trimmedName = locationName.trim();
    if (!trimmedName) {
      setLocationStep("details");
      return;
    }
    saveLocation(trimmedName, [selectedCoord[0], selectedCoord[1]]);
    setAddressLine1("Selected location");
    setAddressLine2(`${lat}, ${lng}`);
    setLocationName("");
    setLocationStep("add");
  }, [locationName, saveLocation, selectedCoord]);

  useEffect(() => {
    if (locationStep !== "map" || hasMapMoved) {
      return;
    }
    if (userCoord) {
      setSelectedCoord(userCoord);
      mapCameraRef.current?.setCamera({
        centerCoordinate: userCoord,
        zoomLevel: 14,
        animationDuration: 350,
      });
      return;
    }
    if (mainMapCenter) {
      setSelectedCoord(mainMapCenter);
    }
  }, [locationStep, hasMapMoved, mainMapCenter, userCoord]);

  useEffect(() => {
    if (locationStep !== "map" || hasMapMoved) {
      return;
    }
    mapCameraRef.current?.setCamera({
      centerCoordinate: selectedCoord,
      zoomLevel: 14,
      animationDuration: 0,
    });
  }, [locationStep, hasMapMoved, selectedCoord]);

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
            onSelectResult={(item) => {
              setAddressLine1(item.title);
              setAddressLine2(item.subtitle);
              setSearchQuery(item.title);
              setLocationStep("add");
            }}
            onContinue={() => setLocationStep("details")}
            onMapPress={() => openMapStep("search")}
          />
        ) : (
          <LocationMapStep
            selectedCoord={selectedCoord}
            selectedCoordLabel={selectedCoordLabel}
            hasMapMoved={hasMapMoved}
            onBack={() => setLocationStep(locationReturnStep)}
            onCenterPress={handleCenterPress}
            onSave={handleMapSave}
            setHasMapMoved={setHasMapMoved}
            setSelectedCoord={setSelectedCoord}
            mapCameraRef={mapCameraRef}
          />
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

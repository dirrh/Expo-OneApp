import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./discoverStyles";
import type { DiscoverTopControlsProps } from "../../lib/interfaces";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Mapbox, { Camera, MapView, UserLocation } from "@rnmapbox/maps";

export default function DiscoverTopControls({
  insetsTop,
  open,
  setOpen,
  location,
  setLocation,
  option,
  setOption,
  o,
  sheetRef,
  filterRef,
  userCoord,
  mainMapCenter,
  cameraRef,
  t,
  onLocationSheetChange,
}: DiscoverTopControlsProps) {
  const locationRef = useRef<BottomSheet>(null);
  const mapCameraRef = useRef<Camera>(null);
  const snapPoints = useMemo(() => ["15%", "92%"], []);
  const [locationStep, setLocationStep] = useState<"add" | "details" | "search" | "map">("add");
  const [locationReturnStep, setLocationReturnStep] = useState<"add" | "search">("add");
  const [searchQuery, setSearchQuery] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [selectedCoord, setSelectedCoord] = useState<[number, number]>(
    () => mainMapCenter ?? userCoord ?? [18.091, 48.3069]
  );
  const [hasMapMoved, setHasMapMoved] = useState(false);
  const searchResults = useMemo(
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
      const target = mainMapCenter ?? userCoord ?? [18.091, 48.3069];
      setSelectedCoord(target);
      setLocationStep("map");
      locationRef.current?.snapToIndex(1);
    },
    [mainMapCenter, userCoord]
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

  useEffect(() => {
    if (locationStep !== "map" || hasMapMoved) {
      return;
    }
    if (mainMapCenter) {
      setSelectedCoord(mainMapCenter);
      return;
    }
    if (userCoord) {
      setSelectedCoord(userCoord);
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
    <>
      <View style={[styles.dropdown_main, { top: insetsTop + 16 }]} pointerEvents="box-none">
        {open && <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />}

        <View style={styles.card}>
          {o && (
            <TouchableOpacity
              style={styles.row}
              onPress={() => setOpen((prev) => !prev)}
              activeOpacity={0.85}
            >
              <Image source={require("../../images/pin.png")} style={styles.rowIcon} resizeMode="contain" />
              <Text style={styles.rowTextBold} numberOfLines={1}>
                {t(option)}
              </Text>

              <Image
                source={require("../../images/options.png")}
                style={[styles.caret, open && styles.caretOpen]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {open && (
            <View style={styles.menu}>
            {location.map((opt, index) => (
              <TouchableOpacity
                key={`${opt.label}-${index}`}
                style={styles.menuRow}
                  onPress={() => {
                    setOption(opt.label);
                    setOpen(false);
                    if (opt.coord) {
                      cameraRef.current?.setCamera({
                        centerCoordinate: opt.coord,
                        zoomLevel: 14,
                        animationDuration: 800,
                      });
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Image source={opt.image} style={styles.rowIcon} resizeMode="contain" />
                  <Text style={styles.rowText} numberOfLines={1}>
                    {t(opt.label)}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  setLocationStep("add");
                  locationRef.current?.expand();
                  setLocation((prev) => [
                    ...prev,
                    { image: require("../../images/pin.png"), label: "testLocation" },
                  ]);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.plus}>+</Text>
                <Text style={styles.rowText} numberOfLines={1}>
                  {t("addLocation")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.actionsRow} pointerEvents="auto">
          {o && (
            <TouchableOpacity
              style={styles.roundBtn}
              activeOpacity={0.85}
              onPress={() => {
                setOpen(false);
                filterRef.current?.expand();
              }}
            >
              <Image source={require("../../images/filter.png")} />
            </TouchableOpacity>
          )}

          {o && (
            <TouchableOpacity
              style={styles.roundBtn}
              activeOpacity={0.85}
              onPress={() => {
                const target = userCoord ?? [18.091, 48.3069];
                cameraRef.current?.setCamera({
                  centerCoordinate: target,
                  zoomLevel: 14,
                  animationDuration: 800,
                });
              }}
            >
              <Image source={require("../../images/navigation.png")} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <BottomSheet
        ref={locationRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose
        enableContentPanningGesture={locationStep !== "map"}
        backgroundStyle={
          locationStep === "search" ? styles.locationSheetSearchBackground : undefined
        }
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

                <TouchableOpacity
                  style={styles.locationField}
                  activeOpacity={0.9}
                  onPress={() => {
                    setSearchQuery(addressLine1);
                    setLocationStep("search");
                  }}
                >
                  <Text style={styles.locationFieldLabel}>Street name and number</Text>
                  <Text
                    style={[
                      styles.locationInput,
                      !addressLine1 && styles.locationInputPlaceholder,
                    ]}
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
                  onPress={() => setLocationStep("details")}
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
                  onPress={() => openMapStep("add")}
                >
                  <Text style={styles.locationSecondaryButtonText}>Set location on a map</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : locationStep === "details" ? (
            <>
              <View>
                <View style={styles.locationHeaderRow}>
                  <TouchableOpacity
                    style={styles.locationBackButton}
                    onPress={() => setLocationStep("add")}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-back" size={20} color="#111" />
                  </TouchableOpacity>
                  <Text style={styles.locationHeaderTitle}>Location detail</Text>
                </View>

                <View style={styles.locationField}>
                  <Text style={styles.locationFieldLabel}>Name</Text>
                  <TextInput
                    style={styles.locationInput}
                    defaultValue="Alexandra's apartment"
                    placeholder="Name"
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
                <TouchableOpacity style={styles.locationPrimaryButton} activeOpacity={0.9}>
                  <Text style={styles.locationPrimaryButtonText}>Save Location</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : locationStep === "search" ? (
            <>
              <View>
                <View style={styles.locationSearchBar}>
                  <Ionicons name="search" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.locationSearchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.locationSearchList}>
                  {filteredResults.map((item, index) => (
                    <TouchableOpacity
                      key={`${item.title}-${item.subtitle}`}
                      style={[
                        styles.locationSearchItem,
                        index === filteredResults.length - 1 && styles.locationSearchItemLast,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setAddressLine1(item.title);
                        setAddressLine2(item.subtitle);
                        setSearchQuery(item.title);
                        setLocationStep("add");
                      }}
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
                  onPress={() => setLocationStep("details")}
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
                  onPress={() => openMapStep("search")}
                >
                  <Text style={styles.locationSecondaryButtonText}>Set location on a map</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.locationMapStep}>
                <View style={styles.locationHeaderRow}>
                  <TouchableOpacity
                    style={styles.locationBackButton}
                    onPress={() => setLocationStep(locationReturnStep)}
                    activeOpacity={0.85}
                  >
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
                      const center = state?.properties?.center ?? state?.geometry?.coordinates;
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
                        if (hasMapMoved || mainMapCenter) {
                          return;
                        }
                        setSelectedCoord([location.coords.longitude, location.coords.latitude]);
                      }}
                    />
                  </MapView>

                  <View style={styles.locationMapOverlay} pointerEvents="none">
                    <View style={styles.locationMapLabel}>
                      <Text style={styles.locationMapLabelText}>
                        {addressLine1 || "Selected location"}
                      </Text>
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
                    onPress={handleCenterPress}
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
                  onPress={() => {
                    const lat = selectedCoord[1].toFixed(5);
                    const lng = selectedCoord[0].toFixed(5);
                    setAddressLine1("Selected location");
                    setAddressLine2(`${lat}, ${lng}`);
                    setLocationStep("add");
                  }}
                >
                  <Text style={styles.locationSecondaryButtonText}>Save Location</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
}

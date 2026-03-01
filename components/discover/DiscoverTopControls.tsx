import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, Text, View, StyleSheet, Platform, TouchableOpacity, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type BottomSheet from "@gorhom/bottom-sheet";
import { styles } from "./discoverStyles";
import type { DiscoverTopControlsProps } from "../../lib/interfaces";
import DiscoverLocationSheet from "./DiscoverLocationSheet";
import { setMapCamera } from "../../lib/maps/camera";
import {
  DISCOVER_TOP_CONTROL_GAP,
  DISCOVER_TOP_CONTROL_HEIGHT,
  DISCOVER_TOP_HORIZONTAL_PADDING,
  DISCOVER_TOP_OFFSET,
} from "../../lib/constants/discoverUi";

/**
 * DiscoverTopControls: Horné ovládanie Discover mapy: poloha, vyhľadávanie a prepnutie do list režimu.
 *
 * Prečo: Kritické mapové akcie sú na jednom mieste, takže používateľ nemusí hľadať primárne ovládanie.
 */
export default function DiscoverTopControls({
  insetsTop,
  open,
  setOpen,
  location,
  setLocation,
  option,
  setOption,
  searchText = "",
  onApplySearchText,
  o,
  filterRef,
  onOpenSearch,
  userCoord,
  mainMapCenter,
  mainMapZoom,
  pendingMapSelection,
  onPendingMapSelectionHandled,
  cameraRef,
  t,
  onLocationSheetChange,
  hasActiveFilter,
  isSearchOpen = false,
  onCloseSearch,
}: DiscoverTopControlsProps) {
  const navigation = useNavigation<any>();
  const locationRef = useRef<BottomSheet>(null);
  const { width: screenWidth } = useWindowDimensions();
  const getLocationIcon = (
    label: string,
    isSaved?: boolean
  ): keyof typeof Ionicons.glyphMap => {
    if (label === "home") return "home-outline";
    if (label === "business") return "business-outline";
    if (label === "allAddresses") return "list-outline";
    if (label === "yourLocation") return "location-outline";
    if (isSaved) return "bookmark-outline";
    return "location-outline";
  };
  const selectedOptionLabel = useMemo(() => {
    const saved = location.find((item) => item.isSaved && item.label === option);
    return saved ? saved.label : t(option);
  }, [location, option, t]);
  const selectedOption = useMemo(
    () => location.find((item) => item.label === option),
    [location, option]
  );
  const fallbackCityCoord = useMemo(
    () => location.find((item) => item.label === "nitra")?.coord ?? null,
    [location]
  );
  const selectedIcon = useMemo(
    () => getLocationIcon(option, selectedOption?.isSaved),
    [option, selectedOption]
  );
  const resolveSearchTextForLocation = useCallback(
    (label: string) => {
      const saved = location.find((item) => item.isSaved && item.label === label);
      if (saved) {
        return saved.label;
      }

      const translated = t(label);
      return typeof translated === "string" && translated.trim().length > 0 ? translated : label;
    },
    [location, t]
  );
  const applyLocationSearchText = useCallback(
    (label: string) => {
      onApplySearchText?.(resolveSearchTextForLocation(label));
    },
    [onApplySearchText, resolveSearchTextForLocation]
  );
  const searchDisplayText = useMemo(() => searchText.trim(), [searchText]);
  const targetZoom = useMemo(
    () => (typeof mainMapZoom === "number" && Number.isFinite(mainMapZoom) ? mainMapZoom : 14),
    [mainMapZoom]
  );
  const centerYourLocation = useCallback(() => {
    const target = userCoord ?? fallbackCityCoord ?? mainMapCenter ?? null;
    setOption("yourLocation");
    applyLocationSearchText("yourLocation");
    setOpen(false);
    if (target) {
      setMapCamera(cameraRef, { center: target, zoom: targetZoom, durationMs: 800 });
    }
  }, [
    applyLocationSearchText,
    cameraRef,
    fallbackCityCoord,
    mainMapCenter,
    targetZoom,
    setOpen,
    setOption,
    userCoord,
  ]);
  const focusLocation = useCallback(
    (label: string, coord?: [number, number]) => {
      if (label === "yourLocation") {
        centerYourLocation();
        return;
      }
      const target = coord ?? null;

      setOption(label);
      applyLocationSearchText(label);
      setOpen(false);

      if (target) {
        setMapCamera(cameraRef, { center: target, zoom: targetZoom, durationMs: 800 });
      }
    },
    [applyLocationSearchText, cameraRef, centerYourLocation, setOpen, setOption, targetZoom]
  );
  const topBarWidth = useMemo(
    () => Math.max(0, screenWidth - DISCOVER_TOP_HORIZONTAL_PADDING * 2),
    [screenWidth]
  );
  const openCardWidth = useMemo(
    () => Math.max(0, topBarWidth - DISCOVER_TOP_CONTROL_HEIGHT - DISCOVER_TOP_CONTROL_GAP),
    [topBarWidth]
  );
  const openCardStyle = useMemo(
    () => ({
      flex: 0,
      flexBasis: "auto" as const,
      width: openCardWidth,
      minWidth: openCardWidth,
      maxWidth: openCardWidth,
      marginRight: 0,
      borderRadius: 20,
    }),
    [openCardWidth]
  );

  useEffect(() => {
    if (isSearchOpen && open) {
      setOpen(false);
    }
  }, [isSearchOpen, open, setOpen]);

  const navigateToDiscoverList = useCallback(() => {
    navigation.navigate("DiscoverList", {
      userCoord,
    });
  }, [navigation, userCoord]);

  return (
    <>
      <View style={[styles.dropdown_main, { top: insetsTop + DISCOVER_TOP_OFFSET }]} pointerEvents="box-none">
        {open && <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />}

        
        {o && !open && !isSearchOpen && (
          <View style={localStyles.topBarRowWrap}>
            <View style={[localStyles.topBarRow, { width: topBarWidth }]}>
              <View style={localStyles.searchBar}>
                <TouchableOpacity
                  style={localStyles.searchLeadingIconButton}
                  activeOpacity={0.85}
                  onPress={() => setOpen(true)}
                >
                  <Ionicons name={selectedIcon} size={18} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={localStyles.searchInputButton}
                  activeOpacity={0.9}
                  onPress={isSearchOpen ? onCloseSearch ?? onOpenSearch : onOpenSearch}
                >
                  <Text
                    style={searchDisplayText ? localStyles.searchValue : localStyles.searchPlaceholder}
                    numberOfLines={1}
                  >
                    {searchDisplayText || t("searchbranches")}
                  </Text>
                </TouchableOpacity>
              </View>

              
              <TouchableOpacity
                style={localStyles.iconOnlyBtn}
                activeOpacity={0.85}
                onPress={navigateToDiscoverList}
              >
                <Ionicons name="list-outline" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        
        {open && !isSearchOpen && (
          <>
            <View style={[styles.card, openCardStyle]}>
              <TouchableOpacity
                style={styles.row}
                onPress={() =>
                  option === "yourLocation"
                    ? centerYourLocation()
                    : focusLocation(option, selectedOption?.coord)
                }
                activeOpacity={0.85}
              >
                <Ionicons name={selectedIcon} size={20} color="#000" style={styles.rowIcon} />
                <Text style={styles.rowTextBold} numberOfLines={1}>
                  {selectedOptionLabel}
                </Text>

                <Ionicons
                  name="chevron-up-outline"
                  size={18}
                  color="#000"
                  style={styles.caret}
                />
              </TouchableOpacity>

              <View style={styles.menu}>
                {location.map((opt, index) => {
                  return (
                    <TouchableOpacity
                      key={`${opt.label}-${index}`}
                      style={styles.menuRow}
                      onPress={() => {
                        if (opt.label === "allAddresses") {
                          setOpen(false);
                          navigation.navigate("SavedLocations");
                          return;
                        }
                        focusLocation(opt.label, opt.coord);
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={getLocationIcon(opt.label, opt.isSaved)}
                        size={20}
                        color="#000"
                        style={styles.rowIcon}
                      />
                      <Text style={styles.rowText} numberOfLines={1}>
                        {opt.isSaved ? opt.label : t(opt.label)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => {
                    locationRef.current?.expand();
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#000" style={styles.rowIcon} />
                  <Text style={styles.rowText} numberOfLines={1}>
                    {t("addLocation")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[localStyles.openActions, { top: 0, width: 42, gap: 0 }]}>
              <TouchableOpacity
                style={localStyles.roundBtn}
                activeOpacity={0.85}
                onPress={navigateToDiscoverList}
              >
                <Ionicons name="list-outline" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <DiscoverLocationSheet
        locationRef={locationRef}
        setLocation={setLocation}
        userCoord={userCoord}
        mainMapCenter={mainMapCenter}
        pendingMapSelection={pendingMapSelection}
        onPendingMapSelectionHandled={onPendingMapSelectionHandled}
        onLocationSheetChange={onLocationSheetChange}
      />
      </>
  );
}

const localStyles = StyleSheet.create({
  topBarRowWrap: {
    width: "100%",
    alignItems: "center",
  },
  topBarRow: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    height: DISCOVER_TOP_CONTROL_HEIGHT,
    gap: DISCOVER_TOP_CONTROL_GAP,
  },
  roundBtn: {
    flexGrow: 0,
    flexShrink: 0,
    width: DISCOVER_TOP_CONTROL_HEIGHT,
    height: DISCOVER_TOP_CONTROL_HEIGHT,
    borderRadius: 999,
    padding: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }),
  },
  iconOnlyBtn: {
    width: DISCOVER_TOP_CONTROL_HEIGHT,
    height: DISCOVER_TOP_CONTROL_HEIGHT,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.1)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }),
  },
  searchBar: {
    flex: 1,
    minWidth: 120,
    maxWidth: 458,
    height: DISCOVER_TOP_CONTROL_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }),
  },
  searchLeadingIconButton: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputButton: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  searchPlaceholder: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
    color: "#71717A",
  },
  searchValue: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
    color: "#111111",
  },
  openActions: {
    position: "absolute",
    right: 16,
    width: 97,
    height: DISCOVER_TOP_CONTROL_HEIGHT,
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 3,
  },
});

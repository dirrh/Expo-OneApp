import React, { useCallback, useMemo, useRef } from "react";
import { Pressable, Text, View, StyleSheet, Platform, TouchableOpacity, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type BottomSheet from "@gorhom/bottom-sheet";
import { styles } from "./discoverStyles";
import type { DiscoverTopControlsProps } from "../../lib/interfaces";
import DiscoverLocationSheet from "./DiscoverLocationSheet";
import { setMapCamera } from "../../lib/maps/camera";

export default function DiscoverTopControls({
  insetsTop,
  open,
  setOpen,
  location,
  setLocation,
  option,
  setOption,
  o,
  filterRef,
  onOpenSearch,
  userCoord,
  mainMapCenter,
  cameraRef,
  t,
  onLocationSheetChange,
  hasActiveFilter,
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
  const selectedIcon = useMemo(
    () => getLocationIcon(option, selectedOption?.isSaved),
    [option, selectedOption]
  );
  const focusLocation = useCallback(
    (label: string, coord?: [number, number]) => {
      const target =
        label === "yourLocation" ? userCoord ?? mainMapCenter ?? null : coord ?? null;

      setOption(label);
      setOpen(false);

      if (target) {
        setMapCamera(cameraRef, { center: target, zoom: 14, durationMs: 800 });
      }
    },
    [cameraRef, mainMapCenter, setOpen, setOption, userCoord]
  );
  const topBarWidth = useMemo(
    () => Math.max(0, screenWidth - 34),
    [screenWidth]
  );
  return (
    <>
      <View style={[styles.dropdown_main, { top: insetsTop + 16 }]} pointerEvents="box-none">
        {open && <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />}

        {/* Default mode: Location icon | Search bar | List icon */}
        {o && !open && (
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
                  onPress={onOpenSearch}
                >
                  <Text style={localStyles.searchPlaceholder}>{t("searchbranches")}</Text>
                </TouchableOpacity>
              </View>

              {/* List button */}
              <TouchableOpacity
                style={localStyles.iconOnlyBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("DiscoverList", { userCoord })}
              >
                <Ionicons name="list-outline" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Dropdown mode: Location dropdown */}
        {open && (
          <>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => focusLocation(option, selectedOption?.coord)}
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

            <View style={[localStyles.openActions, { top: 0 }]}>
              <TouchableOpacity
                style={localStyles.roundBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setOpen(false);
                  onOpenSearch();
                }}
              >
                <Ionicons name="search-outline" size={18} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity
                style={localStyles.roundBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("DiscoverList", { userCoord })}
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
    height: 42,
    gap: 14,
  },
  roundBtn: {
    flexGrow: 0,
    flexShrink: 0,
    width: 42,
    height: 42,
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
    width: 42,
    height: 42,
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
    height: 42,
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
  openActions: {
    position: "absolute",
    right: 16,
    width: 97,
    height: 42,
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 3,
  },
});

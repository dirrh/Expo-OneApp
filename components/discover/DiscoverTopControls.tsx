import React, { useMemo, useRef } from "react";
import { Pressable, Text, View, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
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
  const topBarWidth = useMemo(
    () => Math.max(0, screenWidth - 32),
    [screenWidth]
  );
  const { leftGap, rightGap, searchBarWidth } = useMemo(() => {
    const minSearch = 120;
    const baseGap = screenWidth < 360 ? 10 : 14;
    const maxSearch = topBarWidth - 84 - baseGap * 2;
    const resolvedGap =
      maxSearch < minSearch
        ? Math.max(0, Math.floor((topBarWidth - 84 - minSearch) / 2))
        : baseGap;
    const left = resolvedGap;
    const right = resolvedGap;
    const width = Math.max(0, topBarWidth - 84 - left - right);
    return { leftGap: left, rightGap: right, searchBarWidth: width };
  }, [screenWidth, topBarWidth]);
  return (
    <>
      <View style={[styles.dropdown_main, { top: insetsTop + 16 }]} pointerEvents="box-none">
        {open && <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />}

        {/* Default mode: Location icon | Search bar | List icon */}
        {o && !open && (
          <View style={localStyles.topBarRowWrap}>
            <View style={[localStyles.topBarRow, { width: topBarWidth }]}>
              {/* Location button */}
              <TouchableOpacity
                style={localStyles.roundBtn}
                activeOpacity={0.85}
                onPress={() => setOpen(true)}
              >
                <Ionicons name={selectedIcon} size={18} color="#000" />
              </TouchableOpacity>

              {/* Search bar */}
              <TouchableOpacity
                style={[
                  localStyles.searchBar,
                  { width: searchBarWidth, marginLeft: leftGap, marginRight: rightGap },
                ]}
                activeOpacity={0.9}
                onPress={onOpenSearch}
              >
                <Ionicons name="search-outline" size={16} color="#71717A" />
                <Text style={localStyles.searchPlaceholder}>{t("searchbranches")}</Text>
              </TouchableOpacity>

              {/* List button */}
              <TouchableOpacity
                style={localStyles.roundBtn}
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
                onPress={() => setOpen(false)}
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
                        setOption(opt.label);
                        setOpen(false);
                        if (opt.coord) {
                          setMapCamera(cameraRef, { center: opt.coord, zoom: 14, durationMs: 800 });
                        }
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

      {/* Centrovanie button - dole vpravo */}
      {o && (
        <View style={[styles.centerBtnContainer, { bottom: 140 }]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.roundBtn}
            activeOpacity={0.85}
            onPress={() => {
              const target = userCoord ?? [18.091, 48.3069];
              setMapCamera(cameraRef, { center: target, zoom: 14, durationMs: 800 });
            }}
          >
            <Ionicons name="navigate-outline" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      )}

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
    flexBasis: "100%",
    alignSelf: "center",
    justifyContent: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    height: 42,
  },
  roundBtn: {
    flexGrow: 0,
    flexShrink: 0,
    width: 42,
    height: 42,
    borderRadius: 10,
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
    minWidth: 0,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
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
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#71717A",
  },
  openActions: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    zIndex: 3,
  },
});

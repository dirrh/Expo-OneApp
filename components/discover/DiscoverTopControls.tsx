import React, { useMemo, useRef } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import type BottomSheet from "@gorhom/bottom-sheet";
import { styles } from "./discoverStyles";
import type { DiscoverTopControlsProps } from "../../lib/interfaces";
import DiscoverLocationSheet from "./DiscoverLocationSheet";

export default function DiscoverTopControls({
  insetsTop,
  open,
  setOpen,
  location,
  setLocation,
  option,
  setOption,
  o,
  sheetRef: _sheetRef,
  filterRef,
  userCoord,
  mainMapCenter,
  cameraRef,
  t,
  onLocationSheetChange,
  hasActiveFilter,
}: DiscoverTopControlsProps) {
  const navigation = useNavigation<any>();
  const locationRef = useRef<BottomSheet>(null);
  const selectedOptionLabel = useMemo(() => {
    const saved = location.find((item) => item.isSaved && item.label === option);
    return saved ? saved.label : t(option);
  }, [location, option, t]);
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
                {selectedOptionLabel}
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
                    {opt.isSaved ? opt.label : t(opt.label)}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  locationRef.current?.expand();
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
          {/* Search button - otvorí vyhľadávací sheet */}
          {o && (
            <TouchableOpacity
              style={styles.roundBtn}
              activeOpacity={0.85}
              onPress={() => {
                setOpen(false);
                _sheetRef.current?.expand();
              }}
            >
              <Image source={require("../../images/search.png")} style={styles.actionBtnIcon} />
            </TouchableOpacity>
          )}

          {/* List button - presmerovanie na zoznam pobočiek */}
          {o && (
            <TouchableOpacity
              style={styles.roundBtn}
              activeOpacity={0.85}
              onPress={() => {
                setOpen(false);
                navigation.navigate("DiscoverList", { userCoord });
              }}
            >
              <Image source={require("../../images/list.png")} style={styles.actionBtnIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Centrovanie button - dole vpravo */}
      {o && (
        <View style={[styles.centerBtnContainer, { bottom: 155 }]} pointerEvents="box-none">
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
            <Image source={require("../../images/navigation.png")} style={styles.actionBtnIcon} />
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

import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { styles } from "./discoverStyles";
import type { DiscoverTopControlsProps } from "../../lib/interfaces";

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
  cameraRef,
  t,
}: DiscoverTopControlsProps) {
  return (
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
            {location.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={styles.menuRow}
                onPress={() => {
                  setOption(opt.label);
                  setOpen(false);
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
  );
}

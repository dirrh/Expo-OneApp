import React from "react";
import { Image, Text, View } from "react-native";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { styles } from "./discoverStyles";
import type { DiscoverFilterSheetProps } from "../../lib/interfaces";

export default function DiscoverFilterSheet({
  filterRef,
  snapPoints,
  onSheetChange,
  insetsBottom,
  filter,
  setFilter,
  filterOptions,
  filterIcons,
  subcategories,
  sub,
  toggle,
  count,
  setAppliedFilter,
  setSub,
  subcategoryChipWidth,
  t,
}: DiscoverFilterSheetProps) {
  return (
    <BottomSheet
      ref={filterRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onChange={onSheetChange}
    >
      <View style={{ flex: 1 }}>
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.filterScrollContent,
            { paddingBottom: insetsBottom + 110 },
          ]}
        >
          <View style={styles.filter_header}>
            <Text style={{ fontSize: 20, fontWeight: "bold" }}>{t("filters")}</Text>
            <TouchableOpacity
              onPress={() => {
                setAppliedFilter(null);
                setSub(new Set());
              }}
            >
              <Text style={{ fontSize: 14, color: "gray" }}>{t("reset")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filter_categories}>
            <Text style={{ fontSize: 20, fontWeight: "bold", marginLeft: 10, marginTop: 22 }}>
              {t("categories")}
            </Text>

            <View style={{ flexDirection: "row" }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {filterOptions.map((option) => (
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      backgroundColor: filter === option ? "#EB8100" : "#FFFFFF",
                      borderRadius: 20,
                      padding: 15,
                      borderWidth: 1,
                      borderColor: "#eee",
                      gap: 10,
                      marginRight: 10,
                      marginTop: 10,
                      width: 125,
                      marginLeft: 9,
                    }}
                    onPress={() => setFilter(option)}
                    key={option}
                  >
                    <Image source={filterIcons[option]} />
                    <Text
                      style={{
                        fontWeight: "600",
                        fontSize: 16,
                        marginLeft: 5,
                        color: filter === option ? "white" : "black",
                      }}
                    >
                      {t(option)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                marginLeft: 10,
                marginTop: 25,
                marginBottom: 10,
              }}
            >
              {t(filter)} {t("subcategories")}
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: 10 }}>
              {subcategories.map((subs) => {
                const active = sub.has(subs);

                return (
                  <TouchableOpacity
                    key={subs}
                    onPress={() => {
                      toggle(subs);
                    }}
                    activeOpacity={0.85}
                    style={{
                      borderRadius: 20,
                      padding: 15,
                      borderWidth: 1,
                      borderColor: active ? "transparent" : "#eee",
                      backgroundColor: active ? "#EB8100" : "#FFFFFF",
                      marginLeft: 0,
                      marginTop: 10,
                      marginRight: 12,
                      width: subcategoryChipWidth,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        fontSize: 16,
                        color: active ? "white" : "black",
                        textAlign: "center",
                      }}
                    >
                      {t(subs)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </BottomSheetScrollView>

        <View style={{ paddingHorizontal: 10, paddingBottom: insetsBottom + 12 }}>
          <TouchableOpacity
            style={{
              borderRadius: 20,
              padding: 15,
              borderWidth: 1,
              backgroundColor: "#EB8100",
              width: "auto",
              justifyContent: "center",
              borderColor: "#eee",
            }}
            onPress={() => {
              setAppliedFilter(filter);
              filterRef.current?.close();
            }}
          >
            <Text style={{ fontWeight: "bold", fontSize: 18, color: "white", textAlign: "center" }}>
              Filter ({count})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

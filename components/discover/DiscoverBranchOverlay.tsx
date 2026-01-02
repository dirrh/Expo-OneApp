import React from "react";
import { Image, Text, View } from "react-native";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import BranchCard from "../BranchCard";
import { styles } from "./discoverStyles";
import type { DiscoverBranchOverlayProps } from "../../lib/interfaces";
import { useNavigation } from "@react-navigation/native";

export default function DiscoverBranchOverlay({
  insetsBottom,
  categoriesOpen,
  setCategoriesOpen,
  filterOptions,
  filterIcons,
  appliedFilter,
  setAppliedFilter,
  setFilter,
  branches,
  branchCardWidth,
  t,
}: DiscoverBranchOverlayProps) {
  const navigation = useNavigation<any>();
  return (
    <View style={[styles.branchOverlay, { bottom: insetsBottom }]} pointerEvents="box-none">
      <View style={styles.branchOverlayHandle}>
        {categoriesOpen && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {filterOptions.map((option) => {
              const active = appliedFilter === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.categoryIconBtn, active && styles.categoryIconBtnActive]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setFilter(option);
                    setAppliedFilter((prev) => (prev === option ? null : option));
                  }}
                >
                  <Image source={filterIcons[option]} style={styles.categoryIcon} />
                  {active && (
                    <Text style={[styles.categoryLabel, styles.categoryLabelActive]}>{t(option)}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setCategoriesOpen((prev) => !prev)}
          style={[styles.branchOverlayHandleToggle, categoriesOpen && styles.branchOverlayHandleToggleOpen]}
        >
          <Image
            source={require("../../images/button.png")}
            style={[styles.branchOverlayHandleIcon, categoriesOpen && styles.branchOverlayHandleIconOpen]}
          />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {branches.map((b) => {
          
          const { onPress: _onPress, ...branchData } = b;
          return (
            <TouchableOpacity
              key={b.title}
              style={{ width: branchCardWidth, marginRight: 12, padding: 7 }}
            >
              <BranchCard
                {...b}
                onPress={() => {
                  navigation.navigate("BusinessDetailScreen", { branch: branchData });
                }}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

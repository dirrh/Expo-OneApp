/**
 * BranchCard.tsx
 * 
 * Karta pobočky zobrazovaná v zoznamoch.
 * Obsahuje obrázok, názov, hodnotenie, vzdialenosť a otváracie hodiny.
 * 
 * OPTIMALIZÁCIE:
 * - memo() zabraňuje zbytočným renderom keď sa zmení parent
 * - useMemo() pre dynamické štýly (imageSize)
 */

import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BranchCardProps, BranchData } from "../lib/interfaces";
import { useNavigation } from "@react-navigation/native";

function BranchCard(props: BranchCardProps) {
  // Rozbalíme všetky props
  const {
    title,
    image,
    rating,
    distance,
    hours,
    category,
    discount,
    moreCount,
    address,
    phone,
    email,
    website,
    onPress,
  } = props;

  // Šírka obrazovky pre responzívny obrázok
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();

  /**
   * Vypočítame veľkosť obrázka podľa šírky obrazovky
   * Minimum 80px, maximum 96px, inak 20% šírky obrazovky
   * useMemo zabezpečí, že sa prepočíta len keď sa zmení width
   */
  const imageSize = useMemo(
    () => Math.min(96, Math.max(80, Math.floor(width * 0.2))),
    [width]
  );

  /**
   * Štýl pre obrázok - kombinujeme základný štýl s dynamickou veľkosťou
   * useMemo zabezpečí, že sa nevytvára nový objekt pri každom renderi
   */
  const imageStyle = useMemo(
    () => [styles.branchImage, { width: imageSize, height: imageSize }],
    [imageSize]
  );

  /**
   * Handler pre kliknutie na kartu
   * Ak je poskytnutý vlastný onPress, použijeme ho
   * Inak navigujeme na detail pobočky
   */
  const handlePress = () => {
    // Vytvoríme objekt pobočky z props
    const branch: BranchData = {
      title,
      image,
      rating,
      distance,
      hours,
      category,
      discount,
      moreCount,
      address,
      phone,
      email,
      website,
    };

    if (onPress) {
      onPress(branch);
    } else {
      navigation.navigate("BusinessDetailScreen", { branch });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={styles.branchCard}
    >
      {/* Obrázok pobočky */}
      <Image source={image} style={imageStyle} resizeMode="cover" />

      {/* Obsah karty */}
      <View style={styles.branchContent}>
        {/* Názov */}
        <Text style={styles.branchTitle}>{title}</Text>

        {/* Riadok s metadátami: hodnotenie, vzdialenosť, hodiny */}
        <View style={styles.metaRow}>
          <Ionicons name="star" size={14} color="#F5A623" />
          <Text style={styles.metaText}>{rating}</Text>

          <Ionicons name="location-outline" size={14} />
          <Text style={styles.metaText}>{distance}</Text>

          <Ionicons name="time-outline" size={14} />
          <Text style={styles.metaText}>{hours}</Text>
        </View>

        {/* Spodný riadok: zľava a počet ďalších ponúk */}
        {(discount || moreCount) && (
          <View style={styles.bottomRow}>
            {discount && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{discount}</Text>
              </View>
            )}
            {moreCount && (
              <Text style={styles.moreText}>+{moreCount} more</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// memo() zabraňuje zbytočným renderom - komponent sa prerenderuje len ak sa zmenia props
export default memo(BranchCard);

// === ŠTÝLY ===
const styles = StyleSheet.create({
  // Hlavný kontajner karty
  branchCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    // Tieň - rôzny pre web a native
    ...Platform.select({
      web: { boxShadow: "0 6px 10px rgba(0, 0, 0, 0.1)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,  // Android tieň
      },
    }),
    width: "100%",
  },

  // Obrázok pobočky
  branchImage: {
    borderRadius: 14,
    marginRight: 14,
  },

  // Obsahová časť (pravá strana)
  branchContent: {
    flex: 1,
    justifyContent: "center",
  },

  // Názov pobočky
  branchTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111",
  },

  // Riadok s metadátami (hviezdičky, vzdialenosť, čas)
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
    flexWrap: "wrap",
  },

  // Text metadát
  metaText: {
    fontSize: 12,
    color: "#4B5563",
    marginRight: 8,
  },

  // Spodný riadok (zľava, +X more)
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "nowrap",
  },

  // Badge so zľavou (oranžový)
  badge: {
    backgroundColor: "#EB8100",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },

  // Text v badge
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // Text "+X more"
  moreText: {
    fontSize: 12,
    color: "#6B7280",
  },
});

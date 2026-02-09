import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { TAB_BAR_BASE_HEIGHT, TAB_BAR_MIN_INSET } from "../lib/constants/layout";

interface RouteParams {
  cardName?: string;
  isOtherCardFlow?: boolean;
}

export default function CardsAddNewCardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanned, setIsScanned] = useState(false);
  const { cardName = t("cardsNewCard"), isOtherCardFlow = false } =
    (route.params as RouteParams) || {};
  const contentWidth = useMemo(
    () => Math.min(362, Math.max(0, screenWidth - 32)),
    [screenWidth]
  );
  const cameraHeight = useMemo(
    () => Math.max(250, Math.min(contentWidth * 0.97, screenHeight * 0.45)),
    [contentWidth, screenHeight]
  );
  const cornerSize = useMemo(
    () => Math.max(24, Math.min(33.75, contentWidth * 0.093)),
    [contentWidth]
  );
  const cornerHorizontalInset = useMemo(
    () => Math.max(44, Math.round(contentWidth * 0.193)),
    [contentWidth]
  );
  const cornerVerticalInset = useMemo(
    () => Math.max(40, Math.round(cameraHeight * 0.183)),
    [cameraHeight]
  );
  const bottomPadding = useMemo(
    () => TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, TAB_BAR_MIN_INSET) + 16,
    [insets.bottom]
  );

  useFocusEffect(
    useCallback(() => {
      setIsScanned(false);
    }, [])
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (isScanned) {
        return;
      }

      setIsScanned(true);
      const parsedNumber = data?.trim() || "123 456 7890";

      navigation.navigate("CardsSelectedCard", {
        cardName,
        cardNumber: parsedNumber,
      });
    },
    [cardName, isScanned, navigation]
  );

  const hasCameraPermission = permission?.granted ?? false;
  const handleEnterManually = useCallback(() => {
    navigation.push("CardsAddEnterManually", { cardName, isOtherCardFlow });
  }, [cardName, isOtherCardFlow, navigation]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + 8, paddingBottom: bottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={30} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{cardName}</Text>

        <TouchableOpacity
          style={styles.headerIconButton}
          activeOpacity={0.75}
          onPress={() => navigation.navigate("CardsList")}
        >
          <Ionicons name="close" size={34} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.scanTitle, { width: contentWidth }]}>
          {t("cardsScanCodeOfYourCard")}
        </Text>

        <View style={[styles.cameraBox, { width: contentWidth, height: cameraHeight }]}>
          {hasCameraPermission ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              facing="back"
              onBarcodeScanned={isScanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
              }}
            />
          ) : (
            <View style={styles.permissionOverlay}>
              <Text style={styles.permissionText}>{t("cardsAllowCameraScan")}</Text>
              <TouchableOpacity
                style={styles.permissionButton}
                activeOpacity={0.8}
                onPress={requestPermission}
              >
                <Text style={styles.permissionButtonText}>{t("cardsAllowCamera")}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[
              styles.corner,
              styles.cornerTopLeft,
              {
                width: cornerSize,
                height: cornerSize,
                left: cornerHorizontalInset,
                top: cornerVerticalInset,
              },
            ]}
          />
          <View
            style={[
              styles.corner,
              styles.cornerTopRight,
              {
                width: cornerSize,
                height: cornerSize,
                right: cornerHorizontalInset,
                top: cornerVerticalInset,
              },
            ]}
          />
          <View
            style={[
              styles.corner,
              styles.cornerBottomLeft,
              {
                width: cornerSize,
                height: cornerSize,
                left: cornerHorizontalInset,
                bottom: cornerVerticalInset,
              },
            ]}
          />
          <View
            style={[
              styles.corner,
              styles.cornerBottomRight,
              {
                width: cornerSize,
                height: cornerSize,
                right: cornerHorizontalInset,
                bottom: cornerVerticalInset,
              },
            ]}
          />
        </View>

        {isScanned ? (
          <TouchableOpacity
            style={styles.rescanButton}
            activeOpacity={0.8}
            onPress={() => setIsScanned(false)}
          >
            <Text style={styles.rescanButtonText}>{t("cardsScanAgain")}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.orRow, { width: contentWidth }]}>
          <View style={styles.separator} />
          <Text style={styles.orText}>{t("cardsOr")}</Text>
          <View style={styles.separator} />
        </View>

        <Text style={styles.manualTitle}>{t("cardsEnterCustomerNumberManually")}</Text>

        <TouchableOpacity
          style={styles.manualButton}
          activeOpacity={0.8}
          onPress={handleEnterManually}
        >
          <Text style={styles.manualButtonText}>{t("cardsEnterManually")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    color: "#000000",
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  scanTitle: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 12,
  },
  cameraBox: {
    backgroundColor: "#909090",
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    borderRadius: 20,
    position: "relative",
    marginBottom: 22,
    overflow: "hidden",
    zIndex: 1,
  },
  corner: {
    position: "absolute",
    borderColor: "#FFFFFF",
  },
  cornerTopLeft: {
    borderLeftWidth: 3,
    borderTopWidth: 3,
  },
  cornerTopRight: {
    borderRightWidth: 3,
    borderTopWidth: 3,
  },
  cornerBottomLeft: {
    borderLeftWidth: 3,
    borderBottomWidth: 3,
  },
  cornerBottomRight: {
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  permissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(144, 144, 144, 0.9)",
  },
  permissionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  permissionButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  rescanButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7D7D7",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  rescanButtonText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: "#18181B",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
    zIndex: 2,
  },
  separator: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#E4E4E7",
  },
  orText: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "500",
    color: "#000000",
  },
  manualTitle: {
    width: "100%",
    maxWidth: 283,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "500",
    color: "#000000",
    textAlign: "center",
    marginBottom: 14,
    zIndex: 2,
  },
  manualButton: {
    width: 133,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7D7D7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
    zIndex: 2,
  },
  manualButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "600",
    color: "#18181B",
  },
});

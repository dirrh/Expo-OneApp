import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { TAB_BAR_BASE_HEIGHT, TAB_BAR_MIN_INSET } from "../lib/constants/layout";

interface RouteParams {
  cardName?: string;
  isOtherCardFlow?: boolean;
}

const formatCardNumber = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const normalizedDigits = trimmed.replace(/\s/g, "");
  if (/^\d+$/.test(normalizedDigits)) {
    return normalizedDigits.match(/.{1,3}/g)?.join(" ") || normalizedDigits;
  }

  return trimmed;
};

export default function CardsAddEnterManuallyScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { cardName = t("cardsNewCard"), isOtherCardFlow = false } =
    (route.params as RouteParams) || {};
  const [cardNumberInput, setCardNumberInput] = useState("");
  const contentWidth = useMemo(
    () => Math.min(361, Math.max(0, screenWidth - 32)),
    [screenWidth]
  );

  const bottomPadding = useMemo(
    () => TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, TAB_BAR_MIN_INSET) + 12,
    [insets.bottom]
  );

  const handleNext = useCallback(() => {
    const formatted = formatCardNumber(cardNumberInput);
    if (!formatted) {
      return;
    }

    if (isOtherCardFlow) {
      navigation.navigate("CardsAddOtherCardName", {
        cardName,
        cardNumber: formatted,
      });
      return;
    }

    navigation.navigate("CardsSelectedCard", {
      cardName,
      cardNumber: formatted,
    });
  }, [cardName, cardNumberInput, isOtherCardFlow, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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

      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { maxWidth: Math.min(290, contentWidth) }]}>
            {t("cardsEnterCustomerNumberManually")}
          </Text>
          <Text style={[styles.subtitle, { maxWidth: Math.min(329, contentWidth) }]}>
            {t("cardsFindNumberHint")}
          </Text>

          <TextInput
            style={[styles.input, { maxWidth: contentWidth }]}
            placeholder={t("cardsCardNumber")}
            placeholderTextColor="#71717A"
            value={cardNumberInput}
            onChangeText={setCardNumberInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
        <TouchableOpacity
          style={[styles.addButton, { maxWidth: contentWidth }]}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <Text style={styles.addButtonText}>
            {isOtherCardFlow ? t("cardsNext") : t("cardsAddCard")}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
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
  main: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    width: "100%",
    maxWidth: 290,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 10,
  },
  subtitle: {
    width: "100%",
    maxWidth: 329,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "400",
    color: "#000000",
    marginBottom: 22,
  },
  input: {
    width: "100%",
    maxWidth: 361,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#000000",
  },
  footer: {
    marginTop: "auto",
    width: "100%",
  },
  addButton: {
    width: "100%",
    maxWidth: 361,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  addButtonText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: "#FAFAFA",
  },
});

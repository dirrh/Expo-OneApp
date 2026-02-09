import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  useWindowDimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../lib/AuthContext";
import { extractNameFromEmail } from "../lib/utils/userUtils";
import { useDynamicQRCode } from "../lib/hooks/useDynamicQRCode";
import { TAB_BAR_BASE_HEIGHT, TAB_BAR_MIN_INSET } from "../lib/constants/layout";

const USER_AVATAR = require("../images/photo.png");

export default function QRScreen() {
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { token } = useDynamicQRCode({ userId: user?.id });
  const horizontalPadding = 16;

  const userName = extractNameFromEmail(user?.email);
  const firstName = userName?.firstName || "Martin";
  const lastName = userName?.lastName || "Novak";
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;

  const cardNumber = "123 456 7890";
  const qrCardWidth = useMemo(
    () => Math.max(0, screenWidth - horizontalPadding * 2),
    [screenWidth]
  );
  const qrSize = useMemo(() => {
    const preferred = qrCardWidth - 48;
    const maxAllowed = Math.max(120, qrCardWidth - 24);
    return Math.min(maxAllowed, Math.max(140, Math.min(240, preferred)));
  }, [qrCardWidth]);
  const cardNumberLineHeight = 22;
  const cardNumberTopGap = 14;
  const sideInset = useMemo(
    () => Math.round((qrCardWidth - qrSize) / 2),
    [qrCardWidth, qrSize]
  );
  const qrContentHeight = qrSize + cardNumberTopGap + cardNumberLineHeight;
  const qrCardHeight = qrContentHeight + sideInset * 2;
  const bottomPadding = useMemo(
    () => TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, TAB_BAR_MIN_INSET) + 16,
    [insets.bottom]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: bottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.75}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={30} color="#000000" />
      </TouchableOpacity>

      <View style={styles.profileBlock}>
        <Image source={USER_AVATAR} style={styles.avatar} />
        <Text style={styles.userName}>{fullName}</Text>
      </View>

      <View style={[styles.qrCard, { width: qrCardWidth, height: qrCardHeight }]}>
        <View style={styles.qrContent}>
          <QRCode
            value={token}
            size={qrSize}
            backgroundColor="#FFFFFF"
            color="#000000"
          />
          <Text style={styles.cardNumber}>{cardNumber}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    alignSelf: "flex-start",
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  profileBlock: {
    marginTop: 22,
    alignItems: "center",
  },
  avatar: {
    width: 120,
    height: 143,
    borderRadius: 20,
  },
  userName: {
    marginTop: 14,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
  },
  qrCard: {
    marginTop: 34,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.05)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }),
  },
  qrContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardNumber: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    color: "#767676",
    textAlign: "center",
  },
});

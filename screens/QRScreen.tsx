import React from "react";
import { View, Text, StyleSheet, Image, useWindowDimensions } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../lib/AuthContext";
import { extractNameFromEmail } from "../lib/utils/userUtils";
import { useDynamicQRCode } from "../lib/hooks/useDynamicQRCode";

export default function QRScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  const qrPadding = 20;
  const qrMaxSize = 325;
  const qrSize = Math.max(
    180,
    Math.floor(Math.min(qrMaxSize, screenWidth - 32 - qrPadding * 2))
  );
  const { token } = useDynamicQRCode({ userId: user?.id });

  const userName = extractNameFromEmail(user?.email);
  const firstName = userName?.firstName || "User";
  const lastName = userName?.lastName || "";
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  const userId = user?.id || "N/A";

  return (
    <View style={styles.container}>
      <View style={styles.containerItems}>
        <Image source={require("../images/photo.png")} style={styles.image} />
        <Text style={styles.containerTextTop}>{fullName}</Text>
        <Text style={styles.containerTextBottom}>ID: {userId.substring(0, 8)}</Text>
      </View>

      <View style={[styles.containerQr, { padding: qrPadding }]}>
        <QRCode
          value={token}
          size={qrSize}
          backgroundColor="white"
          color="black"
          logoBorderRadius={5}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  image: {
    width: 120,
    height: 160,
    borderRadius: 5,
    margin: 15,
  },
  containerItems: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignContent: "center",
  },
  containerTextTop: {
    textAlign: "center",
    margin: 2,
    fontWeight: "900",
    fontSize: 22,
    fontFamily: "Inter",
  },
  containerTextBottom: {
    textAlign: "center",
    marginBottom: 25,
    color: "gray",
    fontWeight: "bold",
    fontSize: 18,
    fontFamily: "Inter",
  },
  containerQr: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    maxWidth: 420,
    width: "90%",
    alignItems: "center",
    elevation: 5,
  },
});

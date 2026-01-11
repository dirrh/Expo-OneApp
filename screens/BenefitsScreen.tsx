import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function BenefitsScreen() {
  const [ActualTab, setActualTab] = useState<"Activated" | "Claimed">("Activated");
  const [QRcode, setQRCode] = useState<boolean>(false);
  const { width: screenWidth } = useWindowDimensions();
  const qrPadding = 24;
  const qrSize = Math.max(200, Math.floor(Math.min(320, screenWidth - 32 - qrPadding * 2)));

  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.text_benefits}>{t("myBenefits")}</Text>
      <View style={styles.button_group}>

        <TouchableOpacity
          onPress={() => setActualTab("Activated")} style={ActualTab === 'Activated' ? styles.button1Active : styles.button1}>
          <Text style={ActualTab === 'Activated' ? styles.button_text : styles.button_text_inactive}>
            {t("activated")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActualTab("Claimed")} style={ActualTab === 'Claimed' ? styles.button2Active : styles.button2}>
          <Text style={ActualTab === 'Claimed' ? styles.button_text : styles.button_text_inactive}>
            {t("claimed")}
          </Text>
        </TouchableOpacity>

      </View>

      <View style={styles.text_container}>
        <Text style={styles.text_benefits_lower}>
          {t("textBenefitsLower")}
        </Text>

        <Text style={styles.text_normal}>
          {t("textNormal")}
        </Text>

        <TouchableOpacity
          onPress={() => setQRCode(true)} disabled={ActualTab === 'Claimed'} style={ActualTab === 'Activated' ? styles.button3 : styles.button3_claimed}>
          <Text style={ActualTab === 'Activated' ? styles.button3_text : styles.button3_text_claimed}>
            {ActualTab === 'Activated' ? t("showQR") : t("claimed")}
          </Text>
        </TouchableOpacity>

        <Modal visible={QRcode} transparent animationType='fade'>
          <TouchableWithoutFeedback onPress={() => setQRCode(false)}>
            <View style={styles.button_backdrop}>
              <View style={styles.container_qr}>
                <QRCode
                  value="Skuska"
                  size={qrSize}
                  backgroundColor="white"
                  color="black"
                  logoBorderRadius={5}
                >
                </QRCode>
              </View>
              <Text style={styles.text_hours}>09:55</Text>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  text_benefits: {
    fontSize: 22,
    marginLeft: 16,
    marginTop: 54,
    fontFamily: "Inter_700Bold",
  },
  text_benefits_lower: {
    fontSize: 15,
    marginLeft: 16,
    marginTop: 16,
    fontFamily: "Inter_700Bold",
  },
  text_normal: {
    fontSize: 10,
    marginLeft: 16,
    marginRight: 25,
    marginTop: 10,
    color: 'gray',
    fontFamily: "Inter_500Medium",
  },
  button1: {
    backgroundColor: 'white',
    height: 40,
    width: "50%",
    borderRadius: 40,
    justifyContent: 'center',
    borderColor: 'white',
    borderWidth: 1,
  },
  button1Active: {
    backgroundColor: 'black',
    height: 40,
    width: "50%",
    borderRadius: 40,
    justifyContent: 'center',
  },
  button2: {
    marginLeft: 5,
    backgroundColor: 'white',
    height: 40,
    width: "50%",
    borderRadius: 40,
    justifyContent: 'center',
    borderColor: 'white',
    borderWidth: 1,
  },
  button2Active: {
    marginLeft: 5,
    backgroundColor: 'black',
    height: 40,
    width: "50%",
    borderRadius: 40,
    justifyContent: 'center',
  },
  button_group: {
    flexDirection: 'row',
    marginLeft: 15,
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'white',
    justifyContent: 'center',
    borderRadius: 40,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 30,
    elevation: 2,
    backgroundColor: 'white',
  },
  button_text: {
    textAlign: 'center',
    fontFamily: "Inter_600SemiBold",
    color: 'white',
    fontSize: 14,
  },
  button_text_inactive: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: 'gray',
    fontSize: 14,
  },
  text_container: {
    flexDirection: 'column',
    marginLeft: 15,
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'white',
    justifyContent: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 30,
    elevation: 2,
    backgroundColor: 'white',

  },
  button3: {
    marginTop: 15,
    marginLeft: 15,
    marginRight: 15,
    backgroundColor: 'black',
    width: "93%",
    marginBottom: 10,
    borderRadius: 40,
    paddingTop: 10,
    paddingRight: 16,
    paddingLeft: 16,
    paddingBottom: 10,
  },
  button3_claimed: {
    marginTop: 15,
    marginLeft: 15,
    marginRight: 15,
    backgroundColor: '#e4e4e7',
    width: "90%",
    marginBottom: 10,
    borderRadius: 40,
    paddingTop: 10,
    paddingRight: 16,
    paddingLeft: 16,
    paddingBottom: 10,
  },
  button3_text: {
    color: "white",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  },
  button3_text_claimed: {
    color: "gray",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  },
  button_backdrop: {
    flex: 1,
    backgroundColor: "#00000080",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  container_qr: {
    backgroundColor: '#FFFFFF',
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    justifyContent: "center",
    alignItems: "center",

  },
  text_hours: {
    textAlign: "center",
    marginTop: 16,

    fontSize: 30,
    color: "white",
    fontFamily: "Inter_700Bold",

  }
});

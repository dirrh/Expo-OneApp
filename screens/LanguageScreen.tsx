import { useNavigation } from "@react-navigation/native";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LanguageScreen() {
  const navigation = useNavigation<any>();

  const changeLanguage = async (lang: "en" | "sk" | "cz") => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem("language", lang)
  }

  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("language")}</Text>
      </View>

      {/* SUBTITLE */}
      <Text style={styles.subtitle}>
        {t("changeLanguage")}
      </Text>

      {/* LANGUAGE CARD */}
      <View style={styles.card}>
        <LanguageItem flag="🇬🇧" label="English" onPress={() => changeLanguage("en")} />
        <Divider />
        <LanguageItem flag="🇸🇰" label="Slovak" onPress={() => changeLanguage("sk")}/>
        <Divider />
        <LanguageItem flag="🇨🇿" label="Czech" onPress={() => changeLanguage("cz")} />
      </View>
    </SafeAreaView>
  );
}

function LanguageItem({
  flag,
  label,
  onPress,
}: {
  flag: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <Text style={styles.flag}>{flag}</Text>
        <Text style={styles.itemText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#999" />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 30,
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
  },

  subtitle: {
    fontSize: 14,
    color: "#777",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  flag: {
    fontSize: 22,
  },

  itemText: {
    fontSize: 15,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginLeft: 16,
  },
});

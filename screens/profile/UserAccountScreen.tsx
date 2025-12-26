import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function UserAccountScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>{t("userAccount")}</Text>
        </View>

        {/* FULL NAME */}
        <Text style={styles.label}>{t("fullName")}</Text>
        <TextInput
          value="Martin Novák"
          editable={false}
          style={styles.input}
        />

        {/* EMAIL */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          value="novak@gmail.com"
          editable={false}
          style={styles.input}
        />
      </ScrollView>

      {/* SAVE BUTTON – FIXNE DOLE */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveText}>{t("save")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    flex: 1,
    backgroundColor: "#fff",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 120, // aby obsah nebol prekrytý buttonom
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 30,
    marginBottom: 30,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
  },

  label: {
    fontSize: 13,
    color: "#888",
    marginBottom: 6,
    marginLeft: 4,
  },

  input: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 20,
    backgroundColor: "#fff",
    color: "#000",
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },

  saveButton: {
    backgroundColor: "#000",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

import { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/AuthContext";
import { extractNameFromEmail } from "../../lib/utils/userUtils";
import { supabase } from "../../lib/supabaseClient";

export default function UserAccountScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Načítame aktuálne údaje z emailu
  const initialName = extractNameFromEmail(user?.email);
  const [firstName, setFirstName] = useState(initialName?.firstName || "");
  const [lastName, setLastName] = useState(initialName?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  // Aktualizujeme state keď sa zmení user
  useEffect(() => {
    const name = extractNameFromEmail(user?.email);
    setFirstName(name?.firstName || "");
    setLastName(name?.lastName || "");
    setEmail(user?.email || "");
  }, [user]);

  const handleSave = async () => {
    // Validácia
    if (!firstName.trim()) {
      Alert.alert(t("error") || "Error", t("firstNameRequired") || "First name is required");
      return;
    }

    if (!email.trim()) {
      Alert.alert(t("error") || "Error", t("emailRequired") || "Email is required");
      return;
    }

    // Validácia email formátu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t("error") || "Error", t("invalidEmail") || "Invalid email format");
      return;
    }

    setLoading(true);

    try {
      const emailChanged = email.trim() !== user?.email;
      
      // Aktualizujeme email ak sa zmenil
      if (emailChanged) {
        console.log("Updating email from", user?.email, "to", email.trim());
        
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          email: email.trim(),
        });

        if (updateError) {
          console.error("Email update error:", updateError);
          // Supabase vráti chybu, ak email už existuje
          if (
            updateError.message.includes("already registered") ||
            updateError.message.includes("already exists") ||
            updateError.message.includes("User already registered") ||
            updateError.message.includes("email address is already in use")
          ) {
            Alert.alert(
              t("error") || "Error",
              t("emailExists") || "This email is already registered"
            );
            setLoading(false);
            return;
          } else {
            throw updateError;
          }
        }

        console.log("Email update response:", updateData);

        // Po zmene emailu refreshneme session, aby sa aktualizoval user
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error("Session refresh error:", refreshError);
        } else {
          console.log("Session refreshed, new email:", session?.user?.email);
        }

        // Skontrolujeme, či sa email skutočne zmenil
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        console.log("Current user email after update:", currentUser?.email);
        
        // Supabase môže vyžadovať potvrdenie emailu - v takom prípade sa email nezmení okamžite
        if (currentUser?.email !== email.trim()) {
          Alert.alert(
            t("emailChange") || "Email Change",
            t("emailChangeMessage") || "Email change requested. Please check your new email for confirmation link.",
            [{ text: "OK" }]
          );
        }
      }

      // Uložíme meno do user metadata (vždy, aj keď sa email nezmenil)
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      });

      if (metadataError) {
        console.error("Metadata update error:", metadataError);
        // Necháme to prejsť, metadata nie je kritické
      }

      // Refresh session, aby sa aktualizovali údaje
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error("Session refresh error:", refreshError);
      }

      Alert.alert(
        t("success") || "Success",
        emailChanged 
          ? (t("profileUpdatedEmail") || "Profile updated. Please check your email for confirmation.")
          : (t("profileUpdated") || "Profile updated successfully"),
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert(
        t("error") || "Error",
        error?.message || t("updateFailed") || "Failed to update profile"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top}
      >
        {/* CONTENT */}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>{t("userAccount")}</Text>
          </View>

          {/* FIRST NAME */}
          <Text style={styles.label}>{t("firstName") || "First Name"}</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            editable={!loading}
            style={[styles.input, !loading && styles.inputEditable]}
            placeholder={t("firstName") || "First Name"}
          />

          {/* LAST NAME */}
          <Text style={styles.label}>{t("lastName") || "Last Name"}</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            editable={!loading}
            style={[styles.input, !loading && styles.inputEditable]}
            placeholder={t("lastName") || "Last Name"}
          />

          {/* EMAIL */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, !loading && styles.inputEditable]}
            placeholder="email@example.com"
          />
        </ScrollView>

        {/* SAVE BUTTON – FIXNE DOLE */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>{t("save")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
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

  inputEditable: {
    borderColor: "#000",
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  footer: {
    position: "absolute",
    bottom: 0,
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

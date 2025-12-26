import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import SelectableCard, { PlanId } from "../../components/SelectableCard";
import { useTranslation } from "react-i18next";

export default function SubscriptionActivationScreen() {
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("subscriptionActivation")}</Text>
      </View>

      <Text style={styles.subtitle}>
        {t("subsScreenDesc")}
      </Text>

      <SelectableCard
        id="starter"
        title="Starter"
        price="5.99"
        description={t("starterDesc")}
        selected={selectedPlan === "starter"}
        onPress={setSelectedPlan}
      />

      <SelectableCard
        id="medium"
        title="Medium"
        price="9.99"
        popular
        description={t("mediumDesc")}
        selected={selectedPlan === "medium"}
        onPress={setSelectedPlan}
      />

      <SelectableCard
        id="gold"
        title="Gold"
        price="15.99"
        description={t("goldDesc")}
        selected={selectedPlan === "gold"}
        onPress={setSelectedPlan}
      />

      <TouchableOpacity
        style={[styles.button, !selectedPlan && styles.buttonDisabled]}
        disabled={!selectedPlan}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", paddingVertical: 20, },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 16,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: "600" },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 20 },
  button: {
    marginTop: "auto",
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

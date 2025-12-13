import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import SelectableCard, { PlanId } from "../components/SelectableCard";

export default function SubscriptionActivationScreen() {
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Subscription activation</Text>
      </View>

      <Text style={styles.subtitle}>
        OneApp offers three types of subscriptions: starter, medium, gold.
        Each has different benefits, which one will you try?
      </Text>

      <SelectableCard
        id="starter"
        title="Starter"
        price="5.99"
        description="Basic access to core benefits with a lower monthly cost."
        selected={selectedPlan === "starter"}
        onPress={setSelectedPlan}
      />

      <SelectableCard
        id="medium"
        title="Medium"
        price="9.99"
        popular
        description="More benefits, higher limits and better overall value."
        selected={selectedPlan === "medium"}
        onPress={setSelectedPlan}
      />

      <SelectableCard
        id="gold"
        title="Gold"
        price="15.99"
        description="All-inclusive experience with maximum flexibility."
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
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

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export type PlanId = "starter" | "medium" | "gold";

interface SelectableCardProps {
  id: PlanId;
  title: string;
  price: string;
  description: string;
  popular?: boolean;
  selected: boolean;
  onPress: (id: PlanId) => void;
}

export default function SelectableCard({
  id,
  title,
  price,
  description,
  popular = false,
  selected,
  onPress,
}: SelectableCardProps) {
  const Wrapper: any = selected ? LinearGradient : View;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(id)}>
      <Wrapper
        style={[styles.card, selected && styles.selectedCard]}
        {...(selected && {
          colors: ["#FFA726", "#FFFFFF"],
          start: { x: 0, y: 0 },
          end: { x: 1, y: 0 },
        })}
      >
        <View style={styles.row}>
          <Text style={[styles.cardTitle, selected && styles.selectedTitle]}>
            {title}
          </Text>

          {popular && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Popular</Text>
            </View>
          )}
        </View>

        <Text style={styles.price}>
          {price} € <Text style={styles.per}>/ month</Text>
        </Text>

        <Text style={styles.desc}>{description}</Text>
      </Wrapper>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  selectedCard: {
    borderWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  selectedTitle: { fontSize: 18, fontWeight: "700" },
  price: { fontSize: 15, marginVertical: 4, fontWeight: "500" },
  per: { fontSize: 13, color: "#444" },
  desc: { fontSize: 13, color: "#666" },
  badge: {
    backgroundColor: "#000",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
});

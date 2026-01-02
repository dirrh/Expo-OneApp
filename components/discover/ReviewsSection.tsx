import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  daysAgo: number;
};

type Props = {
  rating: number;
  total: number;
  reviews: Review[];
};

export function ReviewsSection({ rating, total, reviews }: Props) {
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>{rating.toFixed(1)}</Text>

            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name={i <= Math.round(rating) ? "star" : "star-outline"}
                  size={16}
                  color="#F5A623"
                />
              ))}
            </View>
          </View>

          <Text style={styles.count}>
            {total} ratings • {reviews.length} reviews
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#F97316" />
        </TouchableOpacity>
      </View>

      {/* REVIEWS */}
      {reviews.map((r) => (
        <View key={r.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {r.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{r.name}</Text>

              <View style={styles.reviewStars}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= r.rating ? "star" : "star-outline"}
                    size={14}
                    color="#F5A623"
                  />
                ))}
              </View>
            </View>

            <Text style={styles.time}>{r.daysAgo} days ago</Text>
          </View>

          <Text style={styles.text}>{r.text}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.action}>
              <Ionicons name="thumbs-up-outline" size={16} />
              <Text style={styles.actionText}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action}>
              <Ionicons name="chatbubble-outline" size={16} />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* LOAD MORE */}
      <TouchableOpacity style={styles.loadMore}>
        <Text style={styles.loadMoreText}>Load More Reviews</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  rating: {
    fontSize: 28,
    fontWeight: "700",
  },

  stars: {
    flexDirection: "row",
  },

  count: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  addBtn: {
    backgroundColor: "#FFF7ED",
    borderRadius: 20,
    padding: 6,
  },

  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },

  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  avatarText: {
    fontWeight: "700",
    color: "#374151",
  },

  name: {
    fontWeight: "600",
    fontSize: 14,
  },

  reviewStars: {
    flexDirection: "row",
    marginTop: 2,
  },

  time: {
    fontSize: 11,
    color: "#6B7280",
  },

  text: {
    fontSize: 14,
    color: "#111827",
    marginVertical: 8,
  },

  actions: {
    flexDirection: "row",
    gap: 16,
  },

  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  actionText: {
    fontSize: 12,
    color: "#6B7280",
  },

  loadMore: {
    alignItems: "center",
    paddingVertical: 14,
  },

  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F97316",
  },
});

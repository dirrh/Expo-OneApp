/**
 * AddReviewModal.tsx
 * 
 * Modal pre pridávanie novej recenzie s hodnotením.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, text: string) => void;
  branchName?: string;
};

export function AddReviewModal({ visible, onClose, onSubmit, branchName }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleSubmit = useCallback(() => {
    if (rating === 0) {
      Alert.alert(t("error"), t("ratingRequired"));
      return;
    }
    if (reviewText.trim().length < 10) {
      Alert.alert(t("error"), t("reviewRequired"));
      return;
    }
    
    onSubmit(rating, reviewText.trim());
    
    // Reset form
    setRating(0);
    setReviewText("");
    
    // Show success message
    Alert.alert(t("success"), t("thankYouReview"));
    onClose();
  }, [rating, reviewText, onSubmit, onClose, t]);

  const handleClose = useCallback(() => {
    setRating(0);
    setReviewText("");
    onClose();
  }, [onClose]);

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isActive = i <= (hoveredStar || rating);
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          onPressIn={() => setHoveredStar(i)}
          onPressOut={() => setHoveredStar(0)}
          activeOpacity={0.7}
          style={styles.starButton}
        >
          <Ionicons
            name={isActive ? "star" : "star-outline"}
            size={36}
            color={isActive ? "#F5A623" : "#D1D5DB"}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.backdropTouchable} onPress={handleClose} />
        </View>

        <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t("writeReview")}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Branch name */}
          {branchName && (
            <Text style={styles.branchName}>{branchName}</Text>
          )}

          {/* Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionLabel}>{t("selectRating")}</Text>
            <View style={styles.starsContainer}>
              {renderStars()}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 5 ? "⭐ Excellent!" : 
                 rating === 4 ? "👍 Great!" : 
                 rating === 3 ? "😊 Good" : 
                 rating === 2 ? "😐 Fair" : "😕 Poor"}
              </Text>
            )}
          </View>

          {/* Review text */}
          <View style={styles.textSection}>
            <Text style={styles.sectionLabel}>{t("yourReview")}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t("reviewPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={5}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{reviewText.length}/500</Text>
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || reviewText.trim().length < 10) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color="#FFF" style={styles.submitIcon} />
            <Text style={styles.submitButtonText}>{t("submitReview")}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdropTouchable: {
    flex: 1,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  branchName: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  ratingSection: {
    marginBottom: 20,
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  textSection: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: "#F97316",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

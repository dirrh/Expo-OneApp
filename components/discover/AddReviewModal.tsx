import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ReviewPhotoDraft } from "../../lib/reviews/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, text: string, photos?: ReviewPhotoDraft[]) => void;
  branchName?: string;
  photosEnabled?: boolean;
  maxPhotos?: number;
};

const createPhotoDraft = (asset: ImagePicker.ImagePickerAsset): ReviewPhotoDraft => ({
  id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  uri: asset.uri,
  fileName: asset.fileName ?? undefined,
  fileSize: asset.fileSize ?? undefined,
  width: asset.width,
  height: asset.height,
  mimeType: asset.mimeType ?? undefined,
  status: "local",
});

const dedupePhotosByUri = (photos: ReviewPhotoDraft[]) => {
  const unique = new Map<string, ReviewPhotoDraft>();
  photos.forEach((photo) => {
    if (!unique.has(photo.uri)) {
      unique.set(photo.uri, photo);
    }
  });
  return Array.from(unique.values());
};

const resolveLabel = (translated: string, key: string, fallback: string): string =>
  translated === key ? fallback : translated;

/**
 * AddReviewModal: Bottom sheet formular na vytvorenie recenzie s hodnotenim, textom a fotkami.
 *
 * Preco: Jednoduchy flow v jednom paneli udrzi focus pouzivatela a zodpoveda navrhu detailu prevadzky.
 */
export function AddReviewModal({
  visible,
  onClose,
  onSubmit,
  branchName: _branchName,
  photosEnabled = false,
  maxPhotos = 3,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [photos, setPhotos] = useState<ReviewPhotoDraft[]>([]);

  const modalTitle = resolveLabel(t("addReviewSheetTitle"), "addReviewSheetTitle", "Add a review");
  const ratingQuestion = resolveLabel(
    t("reviewRatingQuestion"),
    "reviewRatingQuestion",
    "What is your rating?"
  );
  const shareExperienceLabel = resolveLabel(
    t("reviewShareExperience"),
    "reviewShareExperience",
    "Share your experience with this place"
  );
  const reviewInputPlaceholder = resolveLabel(
    t("reviewInputPlaceholder"),
    "reviewInputPlaceholder",
    resolveLabel(t("yourReview"), "yourReview", "Your review")
  );
  const sendReviewLabel = resolveLabel(t("sendReview"), "sendReview", "Send review");

  const resetState = useCallback(() => {
    setRating(0);
    setReviewText("");
    setPhotos([]);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmedReviewText = reviewText.trim();

    if (rating === 0) {
      Alert.alert(t("error"), t("ratingRequired"));
      return;
    }
    if (trimmedReviewText.length === 0) {
      Alert.alert(t("error"), t("reviewRequired"));
      return;
    }

    const selectedPhotos = photosEnabled && photos.length > 0 ? photos : undefined;
    onSubmit(rating, trimmedReviewText, selectedPhotos);
    resetState();
    Alert.alert(t("success"), t("thankYouReview"));
    onClose();
  }, [onClose, onSubmit, photos, photosEnabled, rating, resetState, reviewText, t]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handlePickPhotos = useCallback(async () => {
    if (!photosEnabled) {
      return;
    }

    const remainingSlots = Math.max(0, maxPhotos - photos.length);
    if (remainingSlots === 0) {
      Alert.alert(t("error"), t("reviewPhotoLimitReached", { count: maxPhotos }));
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: remainingSlots > 1,
        selectionLimit: remainingSlots,
        quality: 0.82,
      });

      if (result.canceled) {
        return;
      }

      const drafts = result.assets.map(createPhotoDraft);
      setPhotos((prev) => dedupePhotosByUri([...prev, ...drafts]).slice(0, maxPhotos));
    } catch {
      Alert.alert(t("error"), t("reviewPhotoPickerError"));
    }
  }, [maxPhotos, photos.length, photosEnabled, t]);

  const handleRemovePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  }, []);

  const renderStars = () => {
    const stars = [];
    for (let index = 1; index <= 5; index += 1) {
      const isActive = index <= rating;
      stars.push(
        <TouchableOpacity
          key={index}
          onPress={() => setRating(index)}
          activeOpacity={0.7}
          style={styles.starButton}
          accessibilityRole="button"
          accessibilityLabel={t("selectRating")}
        >
          <Ionicons
            name={isActive ? "star" : "star-outline"}
            size={37}
            color={isActive ? "#111111" : "rgba(0, 0, 0, 0.3)"}
          />
        </TouchableOpacity>
      );
    }

    return stars;
  };

  const canSubmit = rating > 0 && reviewText.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t("cancel")}
        />

        <View style={styles.sheet}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(20, insets.bottom + 10) },
            ]}
          >
            <Text style={styles.title}>{modalTitle}</Text>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingQuestion}>{ratingQuestion}</Text>
              <View style={styles.starsRow}>{renderStars()}</View>
            </View>

            <View style={styles.textSection}>
              <Text style={styles.sectionLabel}>{shareExperienceLabel}</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder={reviewInputPlaceholder}
                placeholderTextColor="#71717A"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={5}
                maxLength={500}
                scrollEnabled
                textAlignVertical="top"
              />
            </View>

            {photosEnabled ? (
              <View style={styles.photosSection}>
                <View style={styles.photosHeader}>
                  <Text style={styles.sectionLabel}>{t("reviewPhotoAdd")}</Text>
                  <Text style={styles.photoCount}>
                    {photos.length}/{maxPhotos}
                  </Text>
                </View>

                <View style={styles.photoGrid}>
                  {photos.map((photo) => (
                    <View key={photo.id} style={styles.photoTile}>
                      <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.photoRemoveButton}
                        onPress={() => handleRemovePhoto(photo.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t("reviewPhotoRemoveA11y")}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {photos.length < maxPhotos ? (
                    <TouchableOpacity
                      style={styles.photoAddTile}
                      onPress={handlePickPhotos}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={t("reviewPhotoAddA11y")}
                    >
                      <Ionicons name="add" size={30} color="#000000" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!canSubmit}
            >
              <Text style={styles.submitButtonText}>{sendReviewLabel}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.34)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 6,
    paddingHorizontal: 16,
    maxHeight: "86%",
  },
  handleWrap: {
    alignItems: "center",
    paddingBottom: 10,
  },
  handle: {
    width: 63,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#B9B9B9",
  },
  content: {
    width: "100%",
    maxWidth: 358,
    alignSelf: "center",
    gap: 32,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 19,
    color: "#000000",
    textAlign: "center",
  },
  ratingSection: {
    width: "100%",
    alignItems: "center",
    gap: 15,
  },
  ratingQuestion: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 19,
    color: "#000000",
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  starButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  textSection: {
    width: "100%",
    gap: 15,
  },
  sectionLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 19,
    color: "#000000",
  },
  reviewInput: {
    height: 117,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: "#000000",
  },
  photosSection: {
    width: "100%",
    gap: 15,
  },
  photosHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  photoCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 17,
    color: "#000000",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 12,
  },
  photoTile: {
    width: 110,
    height: 107,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoRemoveButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAddTile: {
    width: 111,
    height: 107,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    width: "100%",
    height: 50,
    borderRadius: 999,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    lineHeight: 19,
    color: "#FFFFFF",
    textAlign: "center",
  },
});





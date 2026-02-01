import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { AddReviewModal } from "./AddReviewModal";

export type ReviewComment = {
  id: string;
  name: string;
  text: string;
  daysAgo: number;
};

export type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  daysAgo: number;
  likes?: number;
  comments?: ReviewComment[];
};

type Props = {
  rating: number;
  total: number;
  reviews: Review[];
  branchName?: string;
  onAddReview?: (rating: number, text: string) => void;
};

export function ReviewsSection({ rating, total, reviews, branchName, onAddReview }: Props) {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(3);
  const [likedReviews, setLikedReviews] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [localComments, setLocalComments] = useState<Record<string, ReviewComment[]>>({});

  const handleAddReview = useCallback((reviewRating: number, text: string) => {
    onAddReview?.(reviewRating, text);
    setShowAddModal(false);
  }, [onAddReview]);

  const handleLike = useCallback((reviewId: string) => {
    setLikedReviews(prev => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    setDisplayCount(prev => Math.min(prev + 3, reviews.length));
  }, [reviews.length]);

  const handleReply = useCallback((reviewId: string) => {
    if (replyingTo === reviewId) {
      setReplyingTo(null);
      setReplyText("");
    } else {
      setReplyingTo(reviewId);
      setReplyText("");
    }
  }, [replyingTo]);

  const handleSubmitReply = useCallback((reviewId: string) => {
    if (replyText.trim().length < 2) return;
    
    const newComment: ReviewComment = {
      id: `comment-${Date.now()}`,
      name: "You",
      text: replyText.trim(),
      daysAgo: 0,
    };

    setLocalComments(prev => ({
      ...prev,
      [reviewId]: [...(prev[reviewId] || []), newComment],
    }));
    
    setReplyText("");
    setReplyingTo(null);
  }, [replyText]);

  const displayedReviews = reviews.slice(0, displayCount);
  const hasMore = displayCount < reviews.length;

  const getCommentsForReview = (review: Review) => {
    const existingComments = review.comments || [];
    const addedComments = localComments[review.id] || [];
    return [...existingComments, ...addedComments];
  };
  
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>{rating.toFixed(1)}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name="star"
                  size={15}
                  color={i <= Math.round(rating) ? "#FFD000" : "rgba(0,0,0,0.15)"}
                />
              ))}
            </View>
          </View>
          <Text style={styles.count}>
            {total} {t("ratings")} · {reviews.length} {t("reviews")}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* SEPARATOR */}
      <View style={styles.separator} />

      {/* REVIEWS */}
      {displayedReviews.map((r) => {
        const isLiked = likedReviews.has(r.id);
        const likeCount = (r.likes ?? 0) + (isLiked ? 1 : 0);
        const allComments = getCommentsForReview(r);
        const commentCount = allComments.length;
        const isReplying = replyingTo === r.id;
        
        return (
          <View key={r.id}>
            <View style={styles.reviewCard}>
              {/* CUSTOMER ROW */}
              <View style={styles.customerRow}>
                <View style={styles.customerProfile}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {r.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.nameContainer}>
                    <Text style={styles.name}>{r.name}</Text>
                    <Text style={styles.time}>{t("daysAgo", { count: r.daysAgo })}</Text>
                  </View>
                </View>

                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons
                      key={i}
                      name="star"
                      size={13}
                      color={i <= r.rating ? "#FFD000" : "rgba(0,0,0,0.3)"}
                    />
                  ))}
                </View>
              </View>

              {/* REVIEW TEXT */}
              <Text style={styles.text}>{r.text}</Text>

              {/* ACTIONS */}
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.action}
                  onPress={() => handleLike(r.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isLiked ? "thumbs-up" : "thumbs-up-outline"} 
                    size={18} 
                    color={isLiked ? "#EB8100" : "rgba(0,0,0,0.5)"}
                  />
                  <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                    {likeCount}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.action}
                  onPress={() => handleReply(r.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isReplying ? "chatbubble" : "chatbubble-outline"} 
                    size={18} 
                    color={isReplying ? "#EB8100" : "rgba(0,0,0,0.5)"}
                  />
                  <Text style={[styles.actionText, isReplying && styles.actionTextActive]}>
                    {commentCount}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* COMMENTS */}
              {allComments.length > 0 && (
                <View style={styles.commentsContainer}>
                  {allComments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>
                          {comment.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentName}>{comment.name}</Text>
                          <Text style={styles.commentTime}>
                            {comment.daysAgo === 0 ? t("justNow") : t("daysAgo", { count: comment.daysAgo })}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>{comment.text}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* REPLY INPUT */}
              {isReplying && (
                <View style={styles.replyContainer}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder={t("writeReply")}
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    maxLength={200}
                  />
                  <TouchableOpacity 
                    style={[
                      styles.replyButton,
                      replyText.trim().length < 2 && styles.replyButtonDisabled
                    ]}
                    onPress={() => handleSubmitReply(r.id)}
                    disabled={replyText.trim().length < 2}
                  >
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* SEPARATOR BETWEEN REVIEWS */}
            <View style={styles.separator} />
          </View>
        );
      })}

      {/* LOAD MORE */}
      {hasMore && (
        <TouchableOpacity style={styles.loadMore} onPress={handleLoadMore}>
          <Text style={styles.loadMoreText}>{t("loadMoreReviews")}</Text>
        </TouchableOpacity>
      )}

      {/* ADD REVIEW MODAL */}
      <AddReviewModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddReview}
        branchName={branchName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    gap: 4,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  rating: {
    fontSize: 25,
    fontWeight: "700",
    color: "#000000",
    lineHeight: 30,
  },

  stars: {
    flexDirection: "row",
    gap: 5,
  },

  count: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(0, 0, 0, 0.5)",
  },

  addBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#EB8100",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  separator: {
    height: 1,
    backgroundColor: "#E4E4E7",
    marginVertical: 16,
  },

  reviewCard: {
    gap: 6,
  },

  customerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  customerProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 25,
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontWeight: "700",
    fontSize: 12,
    color: "#000000",
    lineHeight: 17,
  },

  nameContainer: {
    gap: 0,
  },

  name: {
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 17,
    color: "#000000",
  },

  time: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
    color: "rgba(0, 0, 0, 0.5)",
  },

  reviewStars: {
    flexDirection: "row",
    gap: 5,
  },

  text: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 16,
    color: "#000000",
    marginTop: 6,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },

  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  actionText: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 15,
    color: "rgba(0, 0, 0, 0.5)",
  },

  actionTextActive: {
    color: "#EB8100",
  },

  commentsContainer: {
    marginTop: 12,
    paddingLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: "#E4E4E7",
    gap: 10,
  },

  commentItem: {
    flexDirection: "row",
    gap: 10,
  },

  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  commentAvatarText: {
    fontWeight: "700",
    fontSize: 10,
    color: "#374151",
  },

  commentContent: {
    flex: 1,
  },

  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  commentName: {
    fontWeight: "600",
    fontSize: 12,
    color: "#000000",
  },

  commentTime: {
    fontSize: 10,
    color: "rgba(0, 0, 0, 0.5)",
  },

  commentText: {
    fontSize: 12,
    lineHeight: 16,
    color: "#374151",
    marginTop: 2,
  },

  replyContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  replyInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#000000",
    maxHeight: 80,
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },

  replyButton: {
    width: 36,
    height: 36,
    backgroundColor: "#EB8100",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  replyButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },

  loadMore: {
    alignItems: "center",
    paddingVertical: 8,
  },

  loadMoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
    textAlign: "center",
  },
});

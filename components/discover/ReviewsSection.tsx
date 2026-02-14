import React, { memo, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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

export type ReviewItemProps = {
  review: Review;
  isLiked: boolean;
  likeCount: number;
  comments: ReviewComment[];
  isReplying: boolean;
  replyDraft: string;
  onLike: (reviewId: string) => void;
  onReplyToggle: (reviewId: string) => void;
  onReplyDraftChange: (reviewId: string, text: string) => void;
  onSubmitReply: (reviewId: string) => void;
};

type Props = {
  rating: number;
  total: number;
  reviews: Review[];
  branchName?: string;
  onAddReview?: (rating: number, text: string) => void;
};

const EMPTY_COMMENTS: ReviewComment[] = [];

const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((value) => value[0])
    .join("")
    .toUpperCase();

const ReviewItem = memo(function ReviewItem({
  review,
  isLiked,
  likeCount,
  comments,
  isReplying,
  replyDraft,
  onLike,
  onReplyToggle,
  onReplyDraftChange,
  onSubmitReply,
}: ReviewItemProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.reviewCard}>
      <View style={styles.customerRow}>
        <View style={styles.customerProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(review.name)}</Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{review.name}</Text>
            <Text style={styles.time}>{t("daysAgo", { count: review.daysAgo })}</Text>
          </View>
        </View>

        <View style={styles.reviewStars}>
          {[1, 2, 3, 4, 5].map((index) => (
            <Ionicons
              key={`${review.id}-star-${index}`}
              name="star"
              size={13}
              color={index <= review.rating ? "#FFD000" : "rgba(0,0,0,0.3)"}
            />
          ))}
        </View>
      </View>

      <Text style={styles.text}>{review.text}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={() => onLike(review.id)} activeOpacity={0.7}>
          <Ionicons
            name={isLiked ? "thumbs-up" : "thumbs-up-outline"}
            size={18}
            color={isLiked ? "#EB8100" : "rgba(0,0,0,0.5)"}
          />
          <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={() => onReplyToggle(review.id)} activeOpacity={0.7}>
          <Ionicons
            name={isReplying ? "chatbubble" : "chatbubble-outline"}
            size={18}
            color={isReplying ? "#EB8100" : "rgba(0,0,0,0.5)"}
          />
          <Text style={[styles.actionText, isReplying && styles.actionTextActive]}>{comments.length}</Text>
        </TouchableOpacity>
      </View>

      {comments.length > 0 && (
        <View style={styles.commentsContainer}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{getInitials(comment.name)}</Text>
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

      {isReplying && (
        <View style={styles.replyContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder={t("writeReply")}
            placeholderTextColor="rgba(0,0,0,0.4)"
            value={replyDraft}
            onChangeText={(text) => onReplyDraftChange(review.id, text)}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.replyButton, replyDraft.trim().length < 2 && styles.replyButtonDisabled]}
            onPress={() => onSubmitReply(review.id)}
            disabled={replyDraft.trim().length < 2}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

export function ReviewsSection({ rating, total, reviews, branchName, onAddReview }: Props) {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(3);
  const [likedReviews, setLikedReviews] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [localComments, setLocalComments] = useState<Record<string, ReviewComment[]>>({});

  const handleAddReview = useCallback(
    (reviewRating: number, text: string) => {
      onAddReview?.(reviewRating, text);
      setShowAddModal(false);
    },
    [onAddReview]
  );

  const handleLike = useCallback((reviewId: string) => {
    setLikedReviews((prev) => {
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
    setDisplayCount((prev) => Math.min(prev + 3, reviews.length));
  }, [reviews.length]);

  const handleReplyToggle = useCallback((reviewId: string) => {
    setReplyingTo((prev) => (prev === reviewId ? null : reviewId));
  }, []);

  const handleReplyDraftChange = useCallback((reviewId: string, text: string) => {
    setReplyDrafts((prev) => {
      if (prev[reviewId] === text) {
        return prev;
      }
      return {
        ...prev,
        [reviewId]: text,
      };
    });
  }, []);

  const handleSubmitReply = useCallback(
    (reviewId: string) => {
      let draft = "";
      setReplyDrafts((prev) => {
        draft = (prev[reviewId] ?? "").trim();
        if (draft.length < 2) {
          return prev;
        }

        const next = { ...prev };
        delete next[reviewId];
        return next;
      });

      if (draft.length < 2) {
        return;
      }

      const newComment: ReviewComment = {
        id: `comment-${Date.now()}`,
        name: t("you"),
        text: draft,
        daysAgo: 0,
      };

      setLocalComments((prev) => ({
        ...prev,
        [reviewId]: [...(prev[reviewId] || []), newComment],
      }));

      setReplyingTo(null);
    },
    [t]
  );

  const displayedReviews = useMemo(() => reviews.slice(0, displayCount), [reviews, displayCount]);
  const hasMore = displayCount < reviews.length;

  const getCommentsForReview = useCallback(
    (review: Review): ReviewComment[] => {
      const existingComments = review.comments || EMPTY_COMMENTS;
      const addedComments = localComments[review.id] || EMPTY_COMMENTS;
      if (addedComments.length === 0) {
        return existingComments;
      }
      return [...existingComments, ...addedComments];
    },
    [localComments]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>{rating.toFixed(1)}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((index) => (
                <Ionicons
                  key={`rating-star-${index}`}
                  name="star"
                  size={15}
                  color={index <= Math.round(rating) ? "#FFD000" : "rgba(0,0,0,0.15)"}
                />
              ))}
            </View>
          </View>
          <Text style={styles.count}>
            {total} {t("ratings")} | {reviews.length} {t("reviews")}
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.separator} />

      {displayedReviews.map((review, index) => {
        const isLiked = likedReviews.has(review.id);
        const likeCount = (review.likes ?? 0) + (isLiked ? 1 : 0);
        const comments = getCommentsForReview(review);
        const isReplying = replyingTo === review.id;
        const replyDraft = replyDrafts[review.id] ?? "";

        return (
          <View key={review.id}>
            <ReviewItem
              review={review}
              isLiked={isLiked}
              likeCount={likeCount}
              comments={comments}
              isReplying={isReplying}
              replyDraft={replyDraft}
              onLike={handleLike}
              onReplyToggle={handleReplyToggle}
              onReplyDraftChange={handleReplyDraftChange}
              onSubmitReply={handleSubmitReply}
            />
            {index < displayedReviews.length - 1 && <View style={styles.separator} />}
          </View>
        );
      })}

      {hasMore && (
        <TouchableOpacity style={styles.loadMore} onPress={handleLoadMore}>
          <Text style={styles.loadMoreText}>{t("loadMoreReviews")}</Text>
        </TouchableOpacity>
      )}

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
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5,
    borderColor: "#E4E4E7",
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
    fontFamily: "Inter_700Bold",
    fontSize: 25,
    color: "#000000",
    lineHeight: 30,
  },
  stars: {
    flexDirection: "row",
    gap: 5,
  },
  count: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
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
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#000000",
    lineHeight: 17,
  },
  nameContainer: {
    gap: 0,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 17,
    color: "#000000",
  },
  time: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    lineHeight: 12,
    color: "rgba(0, 0, 0, 0.5)",
  },
  reviewStars: {
    flexDirection: "row",
    gap: 5,
  },
  text: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
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
    fontFamily: "Inter_400Regular",
    fontSize: 12,
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
    fontFamily: "Inter_700Bold",
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
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#000000",
  },
  commentTime: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "rgba(0, 0, 0, 0.5)",
  },
  commentText: {
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_400Regular",
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
    marginTop: 8,
  },
  loadMoreText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#18181B",
    textAlign: "center",
  },
});

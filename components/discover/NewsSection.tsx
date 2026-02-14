import React, { memo, useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ImageSourcePropType,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type NewsComment = {
  id: string;
  name: string;
  textKey: string;
  timeAgo: string;
};

type NewsPost = {
  id: string;
  image: ImageSourcePropType;
  textKey: string;
  likes: number;
  comments: NewsComment[];
  timeAgo: string;
};

type UserComment = {
  id: string;
  name: string;
  text: string;
  timeAgo: string;
};

export type NewsPostItemProps = {
  post: NewsPost;
  title: string;
  branchImage?: ImageSourcePropType;
  isLiked: boolean;
  likeCount: number;
  showComments: boolean;
  isCommenting: boolean;
  draftText: string;
  userComments: UserComment[];
  onLike: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  onToggleCommentInput: (postId: string) => void;
  onDraftChange: (postId: string, text: string) => void;
  onSubmitComment: (postId: string) => void;
  onShare: (post: NewsPost) => void;
};

type Props = {
  title: string;
  branchImage?: ImageSourcePropType;
  limit?: number;
};

const BASE_POSTS: NewsPost[] = [
  {
    id: "1",
    image: require("../../assets/news1.jpg"),
    textKey: "newsPost1",
    likes: 28,
    comments: [
      { id: "c1", name: "Jana M.", textKey: "newsComment1", timeAgo: "2h" },
      { id: "c2", name: "Peter K.", textKey: "newsComment2", timeAgo: "1h" },
    ],
    timeAgo: "3h",
  },
  {
    id: "2",
    image: require("../../assets/news2.jpg"),
    textKey: "newsPost2",
    likes: 45,
    comments: [{ id: "c3", name: "Martin B.", textKey: "newsComment3", timeAgo: "5h" }],
    timeAgo: "8h",
  },
  {
    id: "3",
    image: require("../../assets/news3.jpg"),
    textKey: "newsPost3",
    likes: 67,
    comments: [],
    timeAgo: "1d",
  },
  {
    id: "4",
    image: require("../../assets/news4.jpg"),
    textKey: "newsPost4",
    likes: 32,
    comments: [
      { id: "c4", name: "Eva S.", textKey: "newsComment4", timeAgo: "1d" },
      { id: "c5", name: "Lucia N.", textKey: "newsComment5", timeAgo: "20h" },
    ],
    timeAgo: "2d",
  },
  {
    id: "5",
    image: require("../../assets/news5.jpg"),
    textKey: "newsPost5",
    likes: 89,
    comments: [],
    timeAgo: "3d",
  },
  {
    id: "6",
    image: require("../../assets/news1.jpg"),
    textKey: "newsPost1",
    likes: 24,
    comments: [{ id: "c6", name: "Marek H.", textKey: "newsComment2", timeAgo: "4h" }],
    timeAgo: "4d",
  },
  {
    id: "7",
    image: require("../../assets/news2.jpg"),
    textKey: "newsPost2",
    likes: 51,
    comments: [],
    timeAgo: "5d",
  },
  {
    id: "8",
    image: require("../../assets/news3.jpg"),
    textKey: "newsPost3",
    likes: 39,
    comments: [{ id: "c8", name: "Zuzana R.", textKey: "newsComment1", timeAgo: "7h" }],
    timeAgo: "6d",
  },
  {
    id: "9",
    image: require("../../assets/news4.jpg"),
    textKey: "newsPost4",
    likes: 76,
    comments: [
      { id: "c9", name: "Tomas B.", textKey: "newsComment4", timeAgo: "3h" },
      { id: "c10", name: "Nina V.", textKey: "newsComment5", timeAgo: "2h" },
    ],
    timeAgo: "1w",
  },
  {
    id: "10",
    image: require("../../assets/news5.jpg"),
    textKey: "newsPost5",
    likes: 62,
    comments: [],
    timeAgo: "1w",
  },
  {
    id: "11",
    image: require("../../assets/news1.jpg"),
    textKey: "newsPost1",
    likes: 35,
    comments: [{ id: "c11", name: "Klara M.", textKey: "newsComment3", timeAgo: "9h" }],
    timeAgo: "8d",
  },
  {
    id: "12",
    image: require("../../assets/news2.jpg"),
    textKey: "newsPost2",
    likes: 58,
    comments: [],
    timeAgo: "9d",
  },
];

export const NEWS_IMAGE_SOURCES: ImageSourcePropType[] = BASE_POSTS.map((post) => post.image);
export const NEWS_POST_COUNT = BASE_POSTS.length;

const PLACEHOLDER_AVATAR = require("../../images/placeholder_pfp.png");
const EMPTY_USER_COMMENTS: UserComment[] = [];

const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((value) => value[0])
    .join("")
    .toUpperCase();

const NewsPostItem = memo(function NewsPostItem({
  post,
  title,
  branchImage,
  isLiked,
  likeCount,
  showComments,
  isCommenting,
  draftText,
  userComments,
  onLike,
  onToggleComments,
  onToggleCommentInput,
  onDraftChange,
  onSubmitComment,
  onShare,
}: NewsPostItemProps) {
  const { t } = useTranslation();
  const totalComments = post.comments.length + userComments.length;

  return (
    <View style={styles.postContainer}>
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <Image source={branchImage || PLACEHOLDER_AVATAR} style={styles.avatar} />
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.timeAgo}>{post.timeAgo}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <Image
        source={post.image}
        style={styles.postImage}
        resizeMode="cover"
        resizeMethod="resize"
        fadeDuration={0}
      />

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onLike(post.id)} activeOpacity={0.7}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "#EB8100" : "#000"} />
          <Text style={[styles.actionCount, isLiked && styles.actionCountActive]}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onToggleCommentInput(post.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showComments ? "chatbubble" : "chatbubble-outline"}
            size={22}
            color={showComments ? "#EB8100" : "#000"}
          />
          <Text style={[styles.actionCount, showComments && styles.actionCountActive]}>{totalComments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => onShare(post)} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.captionBold}>{title} </Text>
          {t(post.textKey)}
        </Text>
      </View>

      {totalComments > 0 && !showComments && (
        <TouchableOpacity onPress={() => onToggleComments(post.id)}>
          <Text style={styles.viewComments}>{t("viewAllComments", { count: totalComments })}</Text>
        </TouchableOpacity>
      )}

      {showComments && totalComments > 0 && (
        <View style={styles.commentsContainer}>
          {post.comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{getInitials(comment.name)}</Text>
                </View>
                <View style={styles.commentNameContainer}>
                  <Text style={styles.commentName}>{comment.name}</Text>
                  <Text style={styles.commentTime}>{comment.timeAgo}</Text>
                </View>
              </View>
              <Text style={styles.commentText}>{t(comment.textKey)}</Text>
            </View>
          ))}

          {userComments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{getInitials(comment.name)}</Text>
                </View>
                <View style={styles.commentNameContainer}>
                  <Text style={styles.commentName}>{comment.name}</Text>
                  <Text style={styles.commentTime}>{comment.timeAgo}</Text>
                </View>
              </View>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          ))}

          <TouchableOpacity onPress={() => onToggleComments(post.id)}>
            <Text style={styles.hideComments}>{t("hideComments")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isCommenting && (
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder={t("addComment")}
            placeholderTextColor="rgba(0,0,0,0.4)"
            value={draftText}
            onChangeText={(text) => onDraftChange(post.id, text)}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendButton, draftText.trim().length < 2 && styles.sendButtonDisabled]}
            onPress={() => onSubmitComment(post.id)}
            disabled={draftText.trim().length < 2}
          >
            <Ionicons name="send" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

export function NewsSection({ title, branchImage, limit }: Props) {
  const { t } = useTranslation();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [userComments, setUserComments] = useState<Record<string, UserComment[]>>({});
  const visiblePosts = typeof limit === "number" ? BASE_POSTS.slice(0, limit) : BASE_POSTS;

  const handleLike = useCallback((postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const handleToggleComments = useCallback((postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        setCommentingOn((active) => (active === postId ? null : active));
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const handleToggleCommentInput = useCallback((postId: string) => {
    setExpandedComments((prev) => {
      if (prev.has(postId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
    setCommentingOn((prev) => (prev === postId ? null : postId));
  }, []);

  const handleDraftChange = useCallback((postId: string, text: string) => {
    setCommentDrafts((prev) => {
      if (prev[postId] === text) {
        return prev;
      }
      return {
        ...prev,
        [postId]: text,
      };
    });
  }, []);

  const handleSubmitComment = useCallback(
    (postId: string) => {
      let draft = "";
      setCommentDrafts((prev) => {
        draft = (prev[postId] ?? "").trim();
        if (draft.length < 2) {
          return prev;
        }
        const next = { ...prev };
        delete next[postId];
        return next;
      });

      if (draft.length < 2) {
        return;
      }

      const newComment: UserComment = {
        id: `new-${Date.now()}`,
        name: t("you"),
        text: draft,
        timeAgo: t("justNow"),
      };

      setUserComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));

      setCommentingOn(null);
    },
    [t]
  );

  const handleShare = useCallback(
    (post: NewsPost) => {
      const message = `${title}\n\n${t(post.textKey)}`;
      void Share.share({ message, title }).catch(() => undefined);
    },
    [t, title]
  );

  return (
    <View style={styles.listContent}>
      {visiblePosts.map((post, index) => {
        const isLiked = likedPosts.has(post.id);
        const likeCount = post.likes + (isLiked ? 1 : 0);
        const showComments = expandedComments.has(post.id);
        const isCommenting = commentingOn === post.id;
        const postUserComments = userComments[post.id] || EMPTY_USER_COMMENTS;
        const draftText = commentDrafts[post.id] ?? "";

        return (
          <View key={post.id}>
            <NewsPostItem
              post={post}
              title={title}
              branchImage={branchImage}
              isLiked={isLiked}
              likeCount={likeCount}
              showComments={showComments}
              isCommenting={isCommenting}
              draftText={draftText}
              userComments={postUserComments}
              onLike={handleLike}
              onToggleComments={handleToggleComments}
              onToggleCommentInput={handleToggleCommentInput}
              onDraftChange={handleDraftChange}
              onSubmitComment={handleSubmitComment}
              onShare={handleShare}
            />
            {index < visiblePosts.length - 1 && <View style={styles.separator} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
  postContainer: {
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  headerText: {
    gap: 2,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#000",
  },
  timeAgo: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(0,0,0,0.5)",
  },
  moreButton: {
    padding: 4,
  },
  postImage: {
    width: "100%",
    height: 280,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#000",
  },
  actionCountActive: {
    color: "#EB8100",
  },
  captionContainer: {
    marginTop: 10,
  },
  caption: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#000",
  },
  captionBold: {
    fontFamily: "Inter_700Bold",
  },
  viewComments: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(0,0,0,0.5)",
    marginTop: 8,
  },
  commentsContainer: {
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#E4E4E7",
    gap: 12,
  },
  commentCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#000",
  },
  commentNameContainer: {
    flex: 1,
  },
  commentName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#000",
  },
  commentTime: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "rgba(0,0,0,0.5)",
    marginTop: 1,
  },
  commentText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
  },
  hideComments: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#EB8100",
    marginTop: 4,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#000",
    maxHeight: 80,
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  sendButton: {
    width: 36,
    height: 36,
    backgroundColor: "#EB8100",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  separator: {
    height: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 16,
  },
});

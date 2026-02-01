import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
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

type Props = {
  title: string;
  branchImage?: ImageSourcePropType;
};

export function NewsSection({ title, branchImage }: Props) {
  const { t } = useTranslation();
  
  // Dummy posts data - static, not memoized with t
  const basePosts: NewsPost[] = [
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
      comments: [
        { id: "c3", name: "Martin B.", textKey: "newsComment3", timeAgo: "5h" },
      ],
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
  ];

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [userComments, setUserComments] = useState<Record<string, UserComment[]>>({});

  const handleLike = useCallback((postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const toggleComments = useCallback((postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        setCommentingOn(null);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const handleComment = useCallback((postId: string) => {
    // If comments are expanded, close everything
    if (expandedComments.has(postId)) {
      setExpandedComments(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      setCommentingOn(null);
    } else {
      // Open comments
      setExpandedComments(prev => new Set(prev).add(postId));
    }
  }, [expandedComments]);

  const submitComment = useCallback((postId: string) => {
    if (commentText.trim().length < 2) return;

    const newComment: UserComment = {
      id: `new-${Date.now()}`,
      name: t("you"),
      text: commentText.trim(),
      timeAgo: t("justNow"),
    };

    setUserComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment],
    }));

    setCommentText("");
    setCommentingOn(null);
  }, [commentText, t]);

  const renderPost = useCallback(({ item: post }: { item: NewsPost }) => {
    const isLiked = likedPosts.has(post.id);
    const likeCount = post.likes + (isLiked ? 1 : 0);
    const showComments = expandedComments.has(post.id);
    const isCommenting = commentingOn === post.id;
    const postUserComments = userComments[post.id] || [];
    const totalComments = post.comments.length + postUserComments.length;

    return (
      <View style={styles.postContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <Image 
              source={branchImage || require("../../images/placeholder_pfp.png")} 
              style={styles.avatar}
            />
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.timeAgo}>{post.timeAgo}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <Image source={post.image} style={styles.postImage} />

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(post.id)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color={isLiked ? "#EB8100" : "#000"} 
            />
            <Text style={[styles.actionCount, isLiked && styles.actionCountActive]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleComment(post.id)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showComments ? "chatbubble" : "chatbubble-outline"} 
              size={22} 
              color={showComments ? "#EB8100" : "#000"} 
            />
            <Text style={[styles.actionCount, showComments && styles.actionCountActive]}>
              {totalComments}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>
            <Text style={styles.captionBold}>{title} </Text>
            {t(post.textKey)}
          </Text>
        </View>

        {/* View all comments link */}
        {totalComments > 0 && !showComments && (
          <TouchableOpacity onPress={() => toggleComments(post.id)}>
            <Text style={styles.viewComments}>
              {t("viewAllComments", { count: totalComments })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Comments */}
        {showComments && totalComments > 0 && (
          <View style={styles.commentsContainer}>
            {/* Base comments - use t() for textKey */}
            {post.comments.map(comment => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {comment.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentNameContainer}>
                    <Text style={styles.commentName}>{comment.name}</Text>
                    <Text style={styles.commentTime}>{comment.timeAgo}</Text>
                  </View>
                </View>
                <Text style={styles.commentText}>{t(comment.textKey)}</Text>
              </View>
            ))}
            {/* User comments - use text directly */}
            {postUserComments.map(comment => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {comment.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentNameContainer}>
                    <Text style={styles.commentName}>{comment.name}</Text>
                    <Text style={styles.commentTime}>{comment.timeAgo}</Text>
                  </View>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={() => toggleComments(post.id)}>
              <Text style={styles.hideComments}>{t("hideComments")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Comment input */}
        {isCommenting && (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder={t("addComment")}
              placeholderTextColor="rgba(0,0,0,0.4)"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                commentText.trim().length < 2 && styles.sendButtonDisabled
              ]}
              onPress={() => submitComment(post.id)}
              disabled={commentText.trim().length < 2}
            >
              <Ionicons name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [
    branchImage,
    commentText,
    commentingOn,
    expandedComments,
    handleComment,
    handleLike,
    likedPosts,
    submitComment,
    t,
    title,
    toggleComments,
    userComments,
  ]);

  const keyExtractor = useCallback((item: NewsPost) => item.id, []);
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  return (
    <FlatList
      data={basePosts}
      renderItem={renderPost}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={ItemSeparator}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
    />
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
    fontWeight: "700",
    fontSize: 14,
    color: "#000",
  },

  timeAgo: {
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
    fontWeight: "600",
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
    fontSize: 14,
    lineHeight: 20,
    color: "#000",
  },

  captionBold: {
    fontWeight: "700",
  },

  viewComments: {
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
    fontWeight: "700",
    fontSize: 11,
    color: "#000",
  },

  commentNameContainer: {
    flex: 1,
  },

  commentName: {
    fontWeight: "600",
    fontSize: 13,
    color: "#000",
  },

  commentTime: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(0,0,0,0.5)",
    marginTop: 1,
  },

  commentText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
  },

  hideComments: {
    fontSize: 12,
    color: "#EB8100",
    fontWeight: "600",
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

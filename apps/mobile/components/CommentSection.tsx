import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Modal, Platform, SafeAreaView, StyleSheet, Keyboard, Animated } from 'react-native';
import useSWR, { mutate as globalMutate } from 'swr';
import { X, Heart, MessageSquare, Send } from 'lucide-react-native';
import { Image } from 'expo-image';

const API_URL = "https://orcanime.pages.dev";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CommentProps {
  anilistId: string;
  episode: string;
  user: any;
  onClose: () => void;
  visible: boolean;
  isFullscreen?: boolean;
}

export function CommentSection({ anilistId, episode, user, onClose, visible, isFullscreen = false }: CommentProps) {
  const [sortBy, setSortBy] = useState<"top" | "newest">("top");
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: number, username: string } | null>(null);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKbHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKbHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { data: allComments = [], isLoading, mutate } = useSWR(
    visible ? `${API_URL}/api/v2/comments?anilistId=${anilistId}&episodeNumber=${episode}&sort_by=${sortBy}${user ? `&user_id=${user.id}` : ''}` : null,
    fetcher
  );

  const comments = Array.isArray(allComments) ? allComments.filter((c: any) => !c.parent_id) : [];

  const handlePostComment = async () => {
    if (!user || !text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v2/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          anilistId: parseInt(anilistId),
          episodeNumber: parseFloat(episode),
          text: text.trim(),
          timestamp_sec: 0,
          parent_id: replyingTo ? replyingTo.id : null
        }),
      });
      if (res.ok) {
        setText("");
        setReplyingTo(null);
        mutate();
        // Also mutate global stats if necessary, but this is fine.
      } else {
        const errorText = await res.text();
        console.error("[CommentSection] API Error:", res.status, errorText);
      }
    } catch (e) {
      console.error("[CommentSection] Network/Catch Error:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: number, currentlyLiked: boolean) => {
    if (!user) return;
    
    // Optimistic update
    mutate(
      allComments.map((c: any) => {
        if (c.id === commentId) {
          return {
            ...c,
            user_liked: !currentlyLiked,
            reactions: currentlyLiked ? (c.reactions || 0) - 1 : (c.reactions || 0) + 1
          };
        }
        return c;
      }),
      false
    );

    try {
      const res = await fetch(`${API_URL}/api/v2/comments/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: commentId,
          user_id: user.id,
          emoji: '🔥' // Web uses fire emoji, or like
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[Like Comment] API Error:", res.status, errorText);
        throw new Error("Failed to like comment");
      }
      
      mutate();
    } catch (e) {
      console.error("[Like Comment] Network/Catch Error:", e);
      mutate();
    }
  };

  const EMOJIS = ['😂', '😍', '😭', '🔥', '🤔', '👍', '🙏', '🤯'];

  const renderComment = (c: any, isReply = false) => {
    const isMe = user && c.user_id === user.id;
    return (
      <View key={c.id} style={[styles.commentRow, isReply && styles.replyRow]}>
        <View style={[styles.avatarContainer, isReply && styles.avatarContainerSmall]}>
          {c.avatar ? (
            <Image source={{ uri: c.avatar }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          ) : (
            <Text style={[styles.avatarFallback, isReply && styles.avatarFallbackSmall]}>{(c.username || "U").charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={[styles.commentUsername, isMe && styles.commentUsernameMe]}>@{c.username?.toLowerCase()}</Text>
            <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </View>
          <Text style={styles.commentText}>{c.text}</Text>
          <View style={styles.commentActions}>
            <Pressable style={styles.actionButton} onPress={() => handleLikeComment(c.id, c.user_liked || (c.reactions > 0 && isMe))}>
              <Heart color={(c.user_liked || c.reactions > 0) ? "#ff2d55" : "#8e8e93"} size={14} fill={(c.user_liked || c.reactions > 0) ? "#ff2d55" : "none"} />
              <Text style={styles.actionText}>{c.reactions || c.likes_count || ''}</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => setReplyingTo({ id: c.id, username: c.username })}>
              <Text style={styles.replyText}>
                {c.reply_count > 0 && !isReply ? `― ${c.reply_count} Balasan` : 'Balas'}
              </Text>
            </Pressable>
          </View>
          
          {/* Render Replies */}
          {!isReply && c.replies && c.replies.length > 0 && (
            <View style={styles.repliesContainer}>
               {c.replies.map((reply: any) => renderComment(reply, true))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType={isFullscreen ? "fade" : "slide"} transparent={true} onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={[
        styles.modalOverlay, 
        { paddingBottom: kbHeight },
        isFullscreen && { justifyContent: 'flex-end', flexDirection: 'row' }
      ]}>
        <View style={[styles.backdrop, { backgroundColor: 'transparent' }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </View>
        <Animated.View style={[
          styles.container,
          isFullscreen && { 
            height: '100%', 
            width: 380, 
            borderTopLeftRadius: 24, 
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 24,
            borderLeftWidth: 1,
            borderTopWidth: 0,
          }
        ]}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Komentar <Text style={styles.headerCount}>{comments.length}</Text></Text>
              <View style={styles.filterContainer}>
                <Pressable onPress={() => setSortBy("top")} style={[styles.filterButton, sortBy === "top" && styles.filterButtonActive]}>
                  <Text style={[styles.filterText, sortBy === "top" ? styles.filterTextActive : styles.filterTextInactive]}>Populer</Text>
                </Pressable>
                <Pressable onPress={() => setSortBy("newest")} style={[styles.filterButton, sortBy === "newest" && styles.filterButtonActive]}>
                  <Text style={[styles.filterText, sortBy === "newest" ? styles.filterTextActive : styles.filterTextInactive]}>Terbaru</Text>
                </Pressable>
              </View>
            </View>
            <Pressable onPress={onClose} style={({pressed}) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
              <X color="#8e8e93" size={20} />
            </Pressable>
          </View>

          {/* Comment List */}
          <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#0A84FF" style={styles.loader} />
            ) : comments.length > 0 ? (
              comments.map((c: any) => renderComment(c))
            ) : (
              <Text style={styles.emptyText}>Mulai diskusi...</Text>
            )}
          </ScrollView>

          {/* Composer */}
          <View style={styles.composerWrapper}>
            {/* Emoji Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" style={styles.emojiRow} contentContainerStyle={styles.emojiContent}>
               {EMOJIS.map(emoji => (
                 <Pressable key={emoji} onPress={() => setText(prev => prev + emoji)} style={styles.emojiBtn}>
                   <Text style={styles.emojiText}>{emoji}</Text>
                 </Pressable>
               ))}
            </ScrollView>

            {replyingTo && (
               <View style={styles.replyIndicator}>
                 <Text style={styles.replyIndicatorText}>Balasan ke <Text style={{color: '#fff'}}>@{replyingTo.username.toLowerCase()}</Text></Text>
                 <Pressable onPress={() => setReplyingTo(null)} style={styles.cancelReplyBtn}>
                   <X color="#8e8e93" size={14} />
                 </Pressable>
               </View>
            )}
            
            <View style={styles.composerContainer}>
              {user && (
                <View style={styles.composerAvatar}>
                  {user.picture || user.image ? (
                    <Image source={{ uri: user.picture || user.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  ) : (
                    <Text style={styles.composerAvatarFallback}>{(user.name || "U").charAt(0).toUpperCase()}</Text>
                  )}
                </View>
              )}
              <View style={styles.inputWrapper}>
                <TextInput 
                  value={text}
                  onChangeText={setText}
                  placeholder={user ? "Komentar..." : "Login untuk komentar..."}
                  placeholderTextColor="#8e8e93"
                  editable={!!user}
                  multiline
                  style={styles.textInput}
                />
                {text.trim() ? (
                  <Pressable 
                    onPress={handlePostComment}
                    disabled={isSubmitting}
                    style={styles.sendButton}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <View style={styles.sendIconContainer}>
                         <Send color="white" size={14} />
                      </View>
                    )}
                  </Pressable>
                ) : null}
              </View>
              <Pressable 
                onPress={() => Alert.alert("Segera Hadir", "Fitur dukungan/Thanks (Saweria) akan segera hadir!")} 
                style={({pressed}) => [styles.thanksButton, pressed && styles.thanksButtonPressed]}
              >
                <Heart color="white" size={22} strokeWidth={2} />
                <Text style={styles.thanksIconText}>$</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    height: '60%', 
    backgroundColor: '#0a0c10', // Web dark bg
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  },
  headerCount: {
    color: '#8e8e93',
    fontWeight: '500',
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 4,
    borderRadius: 9999,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  filterButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: 'black',
  },
  filterTextInactive: {
    color: '#8e8e93',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  loader: {
    marginTop: 40,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2536',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarFallback: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUsername: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  commentUsernameMe: {
    color: '#0a84ff',
  },
  commentDate: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: '500',
  },
  commentText: {
    color: '#e5e5ea',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8e8e93',
  },
  replyText: {
    color: '#0a84ff',
    fontSize: 11,
    fontWeight: '900',
  },
  emptyText: {
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 40,
    fontWeight: '500',
  },
  composerWrapper: {
    backgroundColor: '#0a0c10',
    paddingBottom: Platform.OS === 'ios' ? 0 : 12,
  },
  emojiRow: {
    paddingVertical: 8,
  },
  emojiContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  emojiBtn: {
    padding: 4,
  },
  emojiText: {
    fontSize: 24,
  },
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#13111a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  replyIndicatorText: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cancelReplyBtn: {
    padding: 4,
  },
  composerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  composerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2536',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  composerAvatarFallback: {
    color: 'white',
    fontWeight: '900',
    fontSize: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingRight: 6,
  },
  thanksButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thanksButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  thanksIconText: {
    position: 'absolute',
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: -1, // Adjust vertically to sit perfectly inside the Heart shape
  },
  textInput: {
    flex: 1,
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  replyRow: {
    marginTop: 12,
    marginBottom: 0,
    gap: 8,
  },
  avatarContainerSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarFallbackSmall: {
    fontSize: 10,
  },
  repliesContainer: {
    marginTop: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    paddingLeft: 12,
    marginLeft: -16,
  },
});

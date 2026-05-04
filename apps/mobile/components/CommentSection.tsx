import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet } from 'react-native';
import useSWR from 'swr';
import { X, Heart, MessageSquare } from 'lucide-react-native';
import { Image } from 'expo-image';

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CommentProps {
  anilistId: string;
  episode: string;
  user: any;
  onClose: () => void;
  visible: boolean;
}

export function CommentSection({ anilistId, episode, user, onClose, visible }: CommentProps) {
  const [sortBy, setSortBy] = useState<"top" | "newest">("top");
  const [text, setText] = useState("");

  const { data: allComments = [], isLoading } = useSWR(
    visible ? `${API_URL}/api/v2/comments?anilistId=${anilistId}&episodeNumber=${episode}&sort_by=${sortBy}` : null,
    fetcher
  );

  const comments = Array.isArray(allComments) ? allComments.filter((c: any) => !c.parent_id) : [];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.container}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Komentar</Text>
              <View style={styles.filterContainer}>
                <Pressable onPress={() => setSortBy("top")} style={[styles.filterButton, sortBy === "top" && styles.filterButtonActive]}>
                  <Text style={[styles.filterText, sortBy === "top" ? styles.filterTextActive : styles.filterTextInactive]}>Populer</Text>
                </Pressable>
                <Pressable onPress={() => setSortBy("newest")} style={[styles.filterButton, sortBy === "newest" && styles.filterButtonActive]}>
                  <Text style={[styles.filterText, sortBy === "newest" ? styles.filterTextActive : styles.filterTextInactive]}>Terbaru</Text>
                </Pressable>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color="#8e8e93" size={20} />
            </Pressable>
          </View>

          {/* Comment List */}
          <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#0A84FF" style={styles.loader} />
            ) : comments.length > 0 ? (
              comments.map((c: any) => (
                <View key={c.id} style={styles.commentRow}>
                  <View style={styles.avatarContainer}>
                    {c.avatar ? (
                      <Image source={{ uri: c.avatar }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    ) : (
                      <Text style={styles.avatarFallback}>{c.username?.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUsername}>@{c.username.toLowerCase()}</Text>
                      <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                    <View style={styles.commentActions}>
                      <Pressable style={styles.actionButton}>
                        <Heart color={c.reactions > 0 ? "#ff2d55" : "#8e8e93"} size={14} fill={c.reactions > 0 ? "#ff2d55" : "none"} />
                        <Text style={styles.actionText}>{c.reactions || ''}</Text>
                      </Pressable>
                      <Pressable style={styles.actionButton}>
                        <Text style={styles.replyText}>
                          {c.reply_count > 0 ? `${c.reply_count} Balasan` : 'Balas'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Jadilah yang pertama berkomentar!</Text>
            )}
          </ScrollView>

          {/* Composer */}
          <View style={styles.composerContainer}>
            <TextInput 
              value={text}
              onChangeText={setText}
              placeholder={user ? "Tambahkan komentar..." : "Login untuk komentar..."}
              placeholderTextColor="#8e8e93"
              editable={!!user}
              style={styles.textInput}
            />
            <Pressable 
              style={[styles.sendButton, text.trim() ? styles.sendButtonActive : styles.sendButtonInactive]}
            >
              <MessageSquare color={text.trim() ? "white" : "rgba(255,255,255,0.4)"} size={16} />
            </Pressable>
          </View>
        </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    height: '65%',
    backgroundColor: '#0a0c10',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56, // 14 * 4
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#13111a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // gap-4
  },
  headerTitle: {
    color: 'white',
    fontWeight: '900', // black
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  filterButtonActive: {
    backgroundColor: 'white',
  },
  filterText: {
    fontSize: 10,
    fontWeight: '900', // black
    textTransform: 'uppercase',
    letterSpacing: 0.5, // tracking-wider
  },
  filterTextActive: {
    color: 'black',
  },
  filterTextInactive: {
    color: '#8e8e93',
  },
  closeButton: {
    padding: 8,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  loader: {
    marginTop: 40, // mt-10
  },
  commentRow: {
    flexDirection: 'row',
    gap: 12, // gap-3
    marginBottom: 24, // mb-6
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2536',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarFallback: {
    color: 'white',
    fontWeight: 'bold',
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
  commentDate: {
    color: '#8e8e93',
    fontSize: 10,
  },
  commentText: {
    color: '#e5e5ea',
    fontSize: 14,
    lineHeight: 22, // leading-relaxed
    marginBottom: 12, // mb-3
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24, // gap-6
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // gap-1.5
  },
  actionText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8e8e93',
  },
  replyText: {
    color: '#0a84ff',
    fontSize: 11,
    fontWeight: '900', // black
  },
  emptyText: {
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 40, // mt-10
  },
  composerContainer: {
    padding: 12, // p-3
    backgroundColor: '#13111a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // gap-3
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1f1c29',
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10, // py-2.5
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#0a84ff',
  },
  sendButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
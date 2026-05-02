import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-[#0a0c10]">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="h-14 flex-row items-center justify-between px-4 border-b border-white/10 bg-[#13111a]">
            <View className="flex-row items-center gap-4">
              <Text className="text-white font-black text-base">Komentar</Text>
              <View className="flex-row gap-2 bg-white/5 p-1 rounded-full border border-white/5">
                <Pressable onPress={() => setSortBy("top")} className={`px-3 py-1 rounded-full ${sortBy === "top" ? 'bg-white' : ''}`}>
                  <Text className={`text-[10px] font-black uppercase tracking-wider ${sortBy === "top" ? 'text-black' : 'text-[#8e8e93]'}`}>Populer</Text>
                </Pressable>
                <Pressable onPress={() => setSortBy("newest")} className={`px-3 py-1 rounded-full ${sortBy === "newest" ? 'bg-white' : ''}`}>
                  <Text className={`text-[10px] font-black uppercase tracking-wider ${sortBy === "newest" ? 'text-black' : 'text-[#8e8e93]'}`}>Terbaru</Text>
                </Pressable>
              </View>
            </View>
            <Pressable onPress={onClose} className="p-2">
              <X color="#8e8e93" size={20} />
            </Pressable>
          </View>

          {/* Comment List */}
          <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 20 }}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#0A84FF" className="mt-10" />
            ) : comments.length > 0 ? (
              comments.map((c: any) => (
                <View key={c.id} className="flex-row gap-3 mb-6">
                  <View className="w-10 h-10 rounded-full bg-[#2a2536] items-center justify-center overflow-hidden border border-white/10">
                    {c.avatar ? (
                      <Image source={{ uri: c.avatar }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <Text className="text-white font-bold">{c.username?.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="text-white font-bold text-[13px]">@{c.username.toLowerCase()}</Text>
                      <Text className="text-[#8e8e93] text-[10px]">{new Date(c.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text className="text-[#e5e5ea] text-sm leading-relaxed mb-3">{c.text}</Text>
                    <View className="flex-row items-center gap-6">
                      <Pressable className="flex-row items-center gap-1.5">
                        <Heart color={c.reactions > 0 ? "#ff2d55" : "#8e8e93"} size={14} fill={c.reactions > 0 ? "#ff2d55" : "none"} />
                        <Text className="text-[11px] font-bold text-[#8e8e93]">{c.reactions || ''}</Text>
                      </Pressable>
                      <Pressable className="flex-row items-center gap-1.5">
                        <Text className="text-[#0a84ff] text-[11px] font-black">
                          {c.reply_count > 0 ? `${c.reply_count} Balasan` : 'Balas'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-[#8e8e93] text-center mt-10">Jadilah yang pertama berkomentar!</Text>
            )}
          </ScrollView>

          {/* Composer */}
          <View className="p-3 bg-[#13111a] border-t border-white/10 flex-row items-center gap-3">
            <TextInput 
              value={text}
              onChangeText={setText}
              placeholder={user ? "Tambahkan komentar..." : "Login untuk komentar..."}
              placeholderTextColor="#8e8e93"
              editable={!!user}
              className="flex-1 bg-[#1f1c29] text-white px-4 py-2.5 rounded-full border border-white/5"
            />
            <Pressable 
              className={`w-10 h-10 rounded-full items-center justify-center ${text.trim() ? 'bg-[#0a84ff]' : 'bg-white/10'}`}
            >
              <MessageSquare color={text.trim() ? "white" : "rgba(255,255,255,0.4)"} size={16} />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

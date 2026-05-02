import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Share, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Link } from 'expo-router';
import useSWR from 'swr';
import { Bookmark, Share as ShareIcon, ArrowLeft, Heart, Eye, Flag, DollarSign } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { useAuth } from '../../../lib/auth';
import { AnimeCard } from '../../../components/AnimeCard';

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WatchScreen() {
  const { id, episode } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  
  const { data: animeData } = useSWR(`${API_URL}/api/v2/anime/${id}`, fetcher);
  const { data: streamData, isLoading: streamLoading } = useSWR(
    `${API_URL}/api/v2/anime/${id}/episodes/${episode}/stream`,
    fetcher
  );

  const anime = animeData?.data;
  const sources = streamData?.sources || [];
  const episodes = anime?.episodes || [];
  const recommendations = anime?.recommendations || [];
  const realViews = anime?.views || 0;
  
  const bestSource = sources.find((s: any) => s.quality === "1080p" || s.quality === "720p" || s.quality === "auto" || s.quality === "default") || sources[0];
  const videoUrl = bestSource?.url;

  const player = useVideoPlayer(videoUrl || null, player => {
    if (videoUrl) {
      player.play();
    }
  });

  const handleShare = async () => {
    if (!anime) return;
    try {
      await Share.share({
        message: `Nonton ${anime.cleanTitle || anime.title} Episode ${episode} di Orca Anime!`,
        url: `https://orcanime.pages.dev/watch/${id}/${episode}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEpisodeChange = (newEp: string) => {
    router.replace(`/watch/${id}/${newEp}`);
  };

  const handleAuthRequiredAction = (action: string) => {
    if (!user) {
      Alert.alert("Login Dibutuhkan", `Silakan login untuk ${action}.`);
    } else {
      Alert.alert("Berhasil", `Fitur ${action} akan segera hadir.`);
    }
  };

  const sortedEpisodes = [...episodes].sort((a, b) => a.number - b.number);
  const displayTitle = anime?.cleanTitle || anime?.nativeTitle || anime?.title || "Anime";
  const poster = anime?.poster || anime?.img || anime?.coverImage;

  return (
    <View className="flex-1 bg-[#13111a]">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Video Player Container */}
      <View className="w-full aspect-video bg-black relative justify-center mt-12 md:mt-0">
        <View className="absolute top-4 left-4 z-50">
          <Pressable 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center border border-white/10"
          >
            <ArrowLeft color="white" size={20} />
          </Pressable>
        </View>

        {streamLoading ? (
          <View className="flex-1 items-center justify-center bg-black">
            <ActivityIndicator size="large" color="#0A84FF" />
            <Text className="text-[#8e8e93] text-sm font-medium mt-3">Mencari sumber video...</Text>
          </View>
        ) : videoUrl ? (
          <VideoView 
            style={StyleSheet.absoluteFill} 
            player={player} 
            allowsFullscreen 
            allowsPictureInPicture
            showsTimecodes
            contentFit="contain"
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-[#1c1c1e]">
            <Text className="text-[#8e8e93] font-medium">Video belum tersedia untuk episode ini.</Text>
          </View>
        )}
      </View>

      {/* Konten Halaman */}
      <ScrollView className="flex-1 px-4 lg:px-6 pt-4 space-y-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {anime ? (
          <>
            {/* Judul & Detail Singkat */}
            <View className="mb-2">
              <Text className="text-white font-bold text-lg md:text-xl leading-tight">
                {displayTitle} <Text className="text-white/50 font-medium text-base">· Eps {episode}</Text>
              </Text>
            </View>

            {/* Scrollable Action Bar */}
            <View className="mb-6 -mx-4">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
                <Link href={`/anime/${id}`} asChild>
                  <Pressable className="mr-1 active:scale-95 transition-transform">
                    <Image 
                      source={{ uri: poster || "https://api.dicebear.com/7.x/notionists/svg" }} 
                      style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} 
                      contentFit="cover"
                    />
                  </Pressable>
                </Link>

                <Pressable 
                  onPress={() => handleAuthRequiredAction("Simpan Koleksi")}
                  className="px-4 py-2 rounded-full bg-white active:bg-gray-200"
                >
                  <Text className="text-black font-bold text-sm">Simpan</Text>
                </Pressable>

                <View className="flex-row items-center gap-1.5 px-4 py-2 bg-white/10 rounded-full">
                  <Eye color="#e5e5ea" size={16} />
                  <Text className="text-white font-bold text-sm">
                    {realViews > 1000 ? (realViews/1000).toFixed(1) + 'K' : realViews}
                  </Text>
                </View>

                <Pressable 
                  onPress={() => handleAuthRequiredAction("Suka")}
                  className="flex-row items-center gap-2 px-4 py-2 bg-white/10 rounded-full active:bg-white/20"
                >
                  <Heart color="white" size={16} />
                  <Text className="text-white font-bold text-sm">0</Text>
                </Pressable>

                <Pressable 
                  onPress={handleShare}
                  className="px-4 py-2 bg-white/10 rounded-full items-center justify-center active:bg-white/20"
                >
                  <ShareIcon color="white" size={16} />
                </Pressable>

                <Pressable 
                  onPress={() => handleAuthRequiredAction("Kirim Dukungan")}
                  className="flex-row items-center gap-1.5 px-4 py-2 bg-white/10 rounded-full active:bg-white/20"
                >
                  <DollarSign color="white" size={14} />
                  <Text className="text-white font-bold text-sm">Thanks</Text>
                </Pressable>

                <Pressable 
                  onPress={() => Alert.alert("Laporkan", "Fitur pelaporan akan segera hadir")}
                  className="flex-row items-center gap-1.5 px-4 py-2 bg-white/10 rounded-full active:bg-white/20"
                >
                  <Flag color="white" size={14} />
                  <Text className="text-white font-bold text-sm">Lapor</Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* List Episode */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white font-bold text-base tracking-tight">
                  {showAllEpisodes ? `Episode (${sortedEpisodes.length})` : 'Episode'}
                </Text>
                <Pressable 
                  onPress={() => setShowAllEpisodes(!showAllEpisodes)}
                  className="bg-[#0a84ff]/10 active:bg-[#0a84ff]/20 px-3 py-1.5 rounded-lg"
                >
                  <Text className="text-[#0a84ff] text-sm font-bold">{showAllEpisodes ? "Tutup" : "Semua"}</Text>
                </Pressable>
              </View>
              
              {showAllEpisodes ? (
                <View className="flex-row flex-wrap gap-2">
                  {sortedEpisodes.map((ep: any) => {
                    const isActive = String(ep.number) === String(episode);
                    return (
                      <Pressable 
                        key={ep.number}
                        onPress={() => handleEpisodeChange(String(ep.number))}
                        className={`w-[18%] aspect-square rounded-[10px] items-center justify-center border ${
                          isActive 
                            ? 'bg-white border-white' 
                            : 'bg-[#1f1c29] border-transparent active:bg-white/10'
                        }`}
                      >
                        <Text className={`font-bold text-[14px] ${isActive ? 'text-black' : 'text-[#8e8e93]'}`}>
                          {ep.number}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                  <View className="flex-row gap-2.5 pr-8">
                    {sortedEpisodes.map((ep: any) => {
                      const isActive = String(ep.number) === String(episode);
                      return (
                        <Pressable 
                          key={ep.number}
                          onPress={() => handleEpisodeChange(String(ep.number))}
                          className={`h-[48px] min-w-[64px] px-4 rounded-[14px] flex-row items-center justify-center border transition-all ${
                            isActive 
                              ? 'bg-white border-white' 
                              : 'bg-[#1f1c29] border-transparent active:bg-white/10'
                          }`}
                        >
                          <Text className={`font-bold text-[15px] ${isActive ? 'text-black' : 'text-[#8e8e93]'}`}>
                            {ep.number}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <View className="mb-6">
                <Text className="text-white font-bold text-base tracking-tight mb-3">Rekomendasi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                  <View className="flex-row gap-3 pr-8">
                    {recommendations.slice(0, 10).map((rec: any, i: number) => {
                      const recId = String(rec.id || rec.anilistId);
                      if (!recId) return null;
                      return (
                        <View key={i} className="w-[120px]">
                          <AnimeCard 
                            id={recId} 
                            title={rec.title?.english || rec.title?.romaji || rec.title || ''} 
                            img={rec.cover || rec.poster || rec.image || rec.coverImage?.extraLarge} 
                            totalEps={rec.latestEpisode || rec.totalEpisodes || rec.episodes} 
                          />
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
            
          </>
        ) : (
          <ActivityIndicator size="small" color="#0A84FF" className="mt-8" />
        )}
      </ScrollView>
    </View>
  );
}

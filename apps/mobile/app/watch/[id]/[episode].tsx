import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Share, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import useSWR from 'swr';
import { Bookmark, Share as ShareIcon, ArrowLeft, Heart, Eye } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WatchScreen() {
  const { id, episode } = useLocalSearchParams();
  const router = useRouter();
  
  const { data: animeData } = useSWR(`${API_URL}/api/v2/anime/${id}`, fetcher);
  const { data: streamData, isLoading: streamLoading } = useSWR(
    `${API_URL}/api/v2/anime/${id}/episodes/${episode}/stream`,
    fetcher
  );

  const anime = animeData?.data;
  const sources = streamData?.sources || [];
  const episodes = anime?.episodes || [];
  
  // Ambil resolusi tertinggi (disarankan 720p/1080p, atau auto)
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
        message: `Nonton ${anime.title} Episode ${episode} di Orca Anime!`,
        url: `https://orca-anime.com/watch/${id}/${episode}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEpisodeChange = (newEp: string) => {
    router.replace(`/watch/${id}/${newEp}`);
  };

  // Sortir episode dari kecil ke besar
  const sortedEpisodes = [...episodes].sort((a, b) => a.number - b.number);

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
      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 80 }}>
        {anime ? (
          <>
            {/* Judul & Detail Singkat */}
            <Text className="text-xl font-black text-white leading-tight mb-1">
              {anime.title}
            </Text>
            <Text className="text-[15px] font-medium text-[#8e8e93] mb-6">
              Episode {episode}
            </Text>

            {/* Deretan Aksi */}
            <View className="flex-row items-center gap-2.5 mb-8">
              <Pressable 
                className="flex-1 py-3 bg-[#1c1c1e] rounded-xl flex-row items-center justify-center gap-2 active:bg-white/10 border border-white/5"
              >
                <Bookmark color="#0A84FF" size={18} />
                <Text className="text-white font-bold text-sm">Simpan</Text>
              </Pressable>
              
              <Pressable 
                className="flex-1 py-3 bg-[#1c1c1e] rounded-xl flex-row items-center justify-center gap-2 active:bg-white/10 border border-white/5"
              >
                <Heart color="#ff453a" size={18} />
                <Text className="text-white font-bold text-sm">Suka</Text>
              </Pressable>
              
              <Pressable 
                className="flex-1 py-3 bg-[#1c1c1e] rounded-xl flex-row items-center justify-center gap-2 active:bg-white/10 border border-white/5"
                onPress={handleShare}
              >
                <ShareIcon color="white" size={18} />
                <Text className="text-white font-bold text-sm">Bagikan</Text>
              </Pressable>
            </View>

            {/* List Episode Slider */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white font-bold text-base">Pilih Episode</Text>
                <Text className="text-[#8e8e93] text-sm font-medium">{sortedEpisodes.length} Eps</Text>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                <View className="flex-row gap-2.5 pr-10">
                  {sortedEpisodes.map((ep: any) => {
                    const isActive = String(ep.number) === String(episode);
                    return (
                      <Pressable 
                        key={ep.number}
                        onPress={() => handleEpisodeChange(String(ep.number))}
                        className={`h-[52px] min-w-[64px] px-4 rounded-xl flex items-center justify-center border transition-all ${
                          isActive 
                            ? 'bg-white border-white' 
                            : 'bg-[#1c1c1e] border-white/5 active:bg-white/10'
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
            </View>
            
            {/* Sinopsis Singkat */}
            <View className="p-4 bg-[#1c1c1e] rounded-2xl border border-white/5 mb-6">
              <Text className="text-white font-bold text-sm mb-2">Tentang Anime Ini</Text>
              <Text className="text-[#8e8e93] text-sm leading-relaxed" numberOfLines={4}>
                {anime.synopsis ? anime.synopsis.replace(/<[^>]*>?/gm, '') : "Sinopsis belum tersedia."}
              </Text>
            </View>
            
          </>
        ) : (
          <ActivityIndicator size="small" color="#0A84FF" className="mt-8" />
        )}
      </ScrollView>
    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Link } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import useSWR from 'swr';
import { Play, Bookmark, Share as ShareIcon, Star, ArrowLeft, Eye, Check, Calendar } from 'lucide-react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../lib/auth';
import { Alert, Dimensions } from 'react-native';

const { width: W } = Dimensions.get('window');
const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatSynopsis(text: string) {
  if (!text) return "Sinopsis belum tersedia.";
  let clean = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " ").trim();
  const sourceIndex = clean.search(/\(?\[?(Sumber|Source|Written by)\s*:/i);
  if (sourceIndex !== -1) {
    clean = clean.substring(0, sourceIndex).trim();
  }
  clean = clean.replace(/\n{3,}/g, '\n\n');
  clean = clean.replace(/ {2,}/g, ' ');
  return clean;
}

export default function AnimeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || user?.email;

  const [isExpanded, setIsExpanded] = useState(false);
  const [epChunkIndex, setEpChunkIndex] = useState(0);
  const [isToggling, setIsToggling] = useState(false);

  const { data, isLoading, error } = useSWR(
    `${API_URL}/api/v2/anime/${id}`,
    fetcher
  );

  const { data: collectionResponse, mutate: mutateCollection } = useSWR(
    userId ? `${API_URL}/api/v2/collection?user_id=${userId}` : null,
    fetcher
  );

  const rawItems = Array.isArray(collectionResponse) ? collectionResponse : (collectionResponse?.data || []);
  const isSaved = rawItems.some((h: any) => String(h.animeSlug || h.anilistId) === String(id));

  const d = data?.data;

  const toggleCollection = async () => {
    if (!user) {
      Alert.alert("Login Dibutuhkan", "Silakan login di tab Koleksi untuk menyimpan anime.");
      return;
    }
    
    setIsToggling(true);
    
    try {
      if (isSaved) {
        // Remove from collection
        await fetch(`${API_URL}/api/v2/collection?user_id=${userId}&anilistId=${id}`, {
          method: "DELETE"
        });
      } else {
        // Add to collection
        const payload = {
          user_id: userId,
          anilistId: String(id),
          status: "plan_to_watch",
          progress: 0
        };
        await fetch(`${API_URL}/api/v2/collection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      
      // Revalidate collection
      await mutateCollection();
    } catch (e) {
      Alert.alert("Gagal", "Terjadi kesalahan saat menyimpan koleksi.");
      console.error(e);
    } finally {
      setIsToggling(false);
    }
  };

  const handleShare = async () => {
    if (!d) return;
    try {
      await Share.share({
        message: `Nonton ${d.title} di Orca Anime!`,
        url: `https://orca-anime.com/anime/${id}`, // Ganti dengan domain asli jika ada
        title: d.title,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#13111a]">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="w-full h-[500px] relative bg-[#13111a]">
           <Skeleton w="100%" h="100%" r={0} />
           <LinearGradient
            colors={['transparent', '#13111a']}
            style={{ position: 'absolute', width: '100%', height: 150, bottom: 0 }}
          />
        </View>
        <View className="px-5 -mt-[140px] relative z-10">
          <Skeleton w={100} h={20} r={10} style={{ marginBottom: 8 }} />
          <Skeleton w={W - 60} h={32} r={12} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
             <Skeleton w={40} h={20} r={10} />
             <Skeleton w={60} h={20} r={10} />
             <Skeleton w={80} h={20} r={10} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
            <Skeleton w="75%" h={56} r={28} />
            <Skeleton w="20%" h={56} r={28} />
          </View>
          <Skeleton w={80} h={24} r={8} style={{ marginBottom: 12 }} />
          <Skeleton w="100%" h={16} r={6} style={{ marginBottom: 8 }} />
          <Skeleton w="90%" h={16} r={6} style={{ marginBottom: 8 }} />
          <Skeleton w="95%" h={16} r={6} style={{ marginBottom: 8 }} />
        </View>
      </View>
    );
  }

  if (error || !d) {
    return (
      <View className="flex-1 bg-[#13111a] items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-white text-lg">Gagal memuat data anime.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-white/10 rounded-full">
          <Text className="text-white">Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const desc = formatSynopsis(d.synopsis || "");
  const eps = d.episodes || [];
  const realViews = d.views || 0;
  
  let scheduleDay = d.airSchedule;
  if (!scheduleDay && d.nextAiringEpisode?.airingAt) {
    const dt = new Date(d.nextAiringEpisode.airingAt * 1000);
    const daysArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    scheduleDay = daysArr[dt.getDay()];
  }

  const firstEp = eps.length > 0 ? (eps[0].number || eps[0].url?.split("episode=").pop() || "1") : null;

  return (
    <View className="flex-1 bg-[#13111a]">
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} bounces={false}>
        {/* Hero Section */}
        <View className="w-full h-[500px] relative bg-[#13111a]">
          <Image
            source={{ uri: d.poster || d.img || d.coverImage || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg" }}
            style={{ width: '100%', height: '100%', opacity: 0.8 }}
            contentFit="cover"
            transition={300}
          />
          
          <LinearGradient
            colors={['rgba(19, 17, 26, 0.6)', 'rgba(19, 17, 26, 0)']}
            style={{ position: 'absolute', width: '100%', height: 120, top: 0 }}
          />

          <LinearGradient
            colors={['transparent', 'rgba(19, 17, 26, 0.6)', '#13111a']}
            locations={[0, 0.5, 1]}
            style={{ position: 'absolute', width: '100%', height: '80%', bottom: 0 }}
          />
          <LinearGradient
            colors={['transparent', '#13111a']}
            style={{ position: 'absolute', width: '100%', height: 150, bottom: 0 }}
          />

          {/* Top Bar (Absolute) */}
          <View className="absolute top-12 left-0 right-0 px-5 flex-row justify-between items-center z-50">
            <Pressable 
              onPress={() => router.back()}
              className="w-9 h-9 rounded-full bg-[#13111a]/50 items-center justify-center border border-white/20 active:opacity-50"
            >
              <ArrowLeft color="white" size={20} />
            </Pressable>
            <Pressable 
              onPress={handleShare}
              className="w-9 h-9 rounded-full bg-[#13111a]/50 items-center justify-center border border-white/20 active:opacity-50"
            >
              <ShareIcon color="white" size={18} />
            </Pressable>
          </View>
        </View>

        <View className="px-5 -mt-[140px] relative z-10">
          {/* Title Area */}
          <View className="mb-8">
            {d.status === "FINISHED" ? (
              <View className="self-start flex-row items-center gap-1.5 px-2 py-1 bg-[#30D158]/20 rounded-full border border-[#30D158]/30 mb-2">
                <View className="w-1.5 h-1.5 rounded-full bg-[#30D158] shadow-[0_0_8px_rgba(48,209,88,0.5)]" />
                <Text className="text-[#30D158] text-[10px] font-bold uppercase tracking-wider mt-0.5">Tamat</Text>
              </View>
            ) : scheduleDay ? (
              <View className="self-start flex-row items-center gap-1.5 px-2.5 py-1 bg-[#FFD60A]/20 rounded-full border border-[#FFD60A]/30 mb-2">
                <Calendar size={12} color="#FFD60A" strokeWidth={2.5} />
                <Text className="text-white text-[10px] font-bold uppercase tracking-wider mt-0.5">Tiap {scheduleDay}</Text>
              </View>
            ) : null}
            
            <Text className="text-2xl font-black text-white leading-tight mb-1">
              {d.cleanTitle || d.nativeTitle || d.title?.english || d.title?.romaji || d.title}
            </Text>
            {d.nativeTitle && d.nativeTitle !== d.cleanTitle && <Text className="text-sm text-[#8e8e93] mb-3">{d.nativeTitle}</Text>}
            
            <View className="flex-row items-center flex-wrap gap-x-2 gap-y-2 mb-6">
              {d.score && (
                <View className="flex-row items-center gap-1">
                  <Star color="#30D158" fill="#30D158" size={14} />
                  <Text className="text-[#30D158] text-[13px] font-bold">{(d.score / 10).toFixed(1)}</Text>
                  <Text className="text-[#48484a] text-[10px] ml-1">●</Text>
                </View>
              )}
              {d.season && d.seasonYear && (
                <View className="flex-row items-center gap-1">
                  <Text className="text-[#e5e5ea] text-[13px] capitalize font-medium">{d.season.toLowerCase()} {d.seasonYear}</Text>
                  <Text className="text-[#48484a] text-[10px] ml-1">●</Text>
                </View>
              )}
              {d.studios?.[0] && (
                <View className="flex-row items-center gap-1">
                  <Text className="text-[#e5e5ea] text-[13px] font-medium">{d.studios[0]}</Text>
                  <Text className="text-[#48484a] text-[10px] ml-1">●</Text>
                </View>
              )}
              
              {d.genres?.length > 0 && (
                <View className="flex-row items-center gap-1.5 flex-wrap">
                  {d.genres.slice(0, 3).map((g: string) => (
                    <View key={g} className="px-2.5 py-0.5 bg-white/10 border border-white/10 rounded-full">
                      <Text className="text-[11px] font-bold text-white">{g}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Actions */}
            <View className="flex-row items-center gap-3 w-full">
              {firstEp ? (
                <Link href={`/watch/${id}/${firstEp}`} asChild>
                  <Pressable 
                    className="py-4 rounded-full flex-row items-center justify-center gap-2.5 bg-[#0A84FF] active:opacity-80 shadow-[0_4px_14px_rgba(10,132,255,0.4)]"
                    style={{ flex: 3.5 }}
                  >
                    <Play color="white" fill="white" size={20} />
                    <Text className="font-bold text-[16px] text-white">
                      Mulai Tonton
                    </Text>
                  </Pressable>
                </Link>
              ) : (
                <Pressable 
                  className="py-4 rounded-full flex-row items-center justify-center gap-2.5 bg-[#1f1c29]"
                  style={{ flex: 3.5 }}
                >
                  <Text className="font-bold text-[16px] text-[#8e8e93]">
                    Belum Tersedia
                  </Text>
                </Pressable>
              )}

              <Pressable 
                onPress={toggleCollection}
                disabled={isToggling}
                className={`py-4 rounded-full flex-row items-center justify-center bg-[#1f1c29] border border-white/5 active:opacity-80 ${isToggling ? "opacity-50" : ""}`} 
                style={{ flex: 1 }}
              >
                {isToggling ? (
                  <ActivityIndicator size="small" color="#e5e5ea" />
                ) : isSaved ? (
                  <Bookmark color="#0A84FF" fill="#0A84FF" size={24} />
                ) : (
                  <Bookmark color="#e5e5ea" size={24} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Synopsis */}
          <View className="mb-8">
            <Text className="text-white font-bold text-base mb-2">Sinopsis</Text>
            <Text 
              className="text-[#e5e5ea] text-[14px] leading-relaxed" 
              numberOfLines={isExpanded ? undefined : 3}
            >
              {desc}
            </Text>
            {desc.length > 150 && (
              <Pressable onPress={() => setIsExpanded(!isExpanded)} className="mt-2">
                <Text className="text-[#0A84FF] text-[13px] font-bold">
                  {isExpanded ? "Sembunyikan" : "Selengkapnya"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Episode List */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-base">Daftar Episode</Text>
              <Text className="text-[#8e8e93] text-xs font-bold">{eps.length} Episode</Text>
            </View>
            
            {eps.length === 0 ? (
              <View className="py-10 items-center justify-center bg-[#1c1c1e] rounded-2xl border border-white/5">
                <Text className="text-[#8e8e93]">Belum ada episode</Text>
              </View>
            ) : (
              <View>
                {/* Chunk Filter (if more than 50 eps) */}
                {eps.length > 50 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-5 px-5">
                    <View className="flex-row gap-2 pr-10">
                      {Array.from({ length: Math.ceil(eps.length / 50) }).map((_, i) => {
                        const chunk = eps.slice(i * 50, (i + 1) * 50);
                        if (chunk.length === 0) return null;
                        
                        const getNum = (e: any) => e.episodeNumber ?? e.number ?? e.url?.split("episode=").pop() ?? "?";
                        const firstNum = getNum(chunk[0]);
                        const lastNum = getNum(chunk[chunk.length - 1]);
                        
                        // Because eps are descending, lastNum is the smaller number in the chunk
                        const label = `${lastNum} - ${firstNum}`;
                        const isActive = epChunkIndex === i;

                        return (
                          <Pressable 
                            key={i} 
                            onPress={() => setEpChunkIndex(i)}
                            className={`px-4 py-2 rounded-full border transition-colors ${
                              isActive ? "bg-white border-white" : "bg-[#1f1c29] border-white/10 active:bg-white/10"
                            }`}
                          >
                            <Text className={`font-bold text-xs ${isActive ? "text-black" : "text-[#8e8e93]"}`}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
                
                {/* Episode Grid for Current Chunk */}
                <View className="flex-row flex-wrap gap-2.5">
                  {eps.slice(epChunkIndex * 50, (epChunkIndex + 1) * 50).map((ep: any, index: number) => {
                    const epNum = ep.episodeNumber ?? ep.number ?? ep.url?.split("episode=").pop();
                    return (
                      <Link href={`/watch/${id}/${epNum}`} key={index} asChild>
                        <Pressable 
                          className="items-center justify-center bg-[#1f1c29] border border-white/10 w-[60px] h-[45px] rounded-xl active:bg-white/10 active:border-white/20"
                        >
                          <Text className="text-white font-black text-xs">Eps {epNum}</Text>
                        </Pressable>
                      </Link>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Recommendations */}
          {d.recommendations && d.recommendations.length > 0 && (
            <View className="mb-8">
              <Text className="text-white font-bold text-base mb-4">Rekomendasi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                <View className="flex-row gap-3 pr-10">
                  {d.recommendations.map((r: any, i: number) => {
                    const recId = String(r.id || r.anilistId);
                    if (!recId) return null;
                    return (
                      <View key={i} className="w-[120px]">
                        <AnimeCard 
                          id={recId} 
                          title={r.title?.english || r.title?.romaji || r.title || ''} 
                          img={r.cover || r.poster || r.image || r.coverImage?.extraLarge} 
                          totalEps={r.latestEpisode || r.totalEpisodes || r.episodes} 
                        />
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

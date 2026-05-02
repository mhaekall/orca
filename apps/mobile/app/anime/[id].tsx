import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Link } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import useSWR from 'swr';
import { Play, Bookmark, Share as ShareIcon, Star, ArrowLeft, Eye } from 'lucide-react-native';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const accent = "#0A84FF";

  const { data, isLoading, error } = useSWR(
    `${API_URL}/api/v2/anime/${id}`,
    fetcher
  );

  const d = data?.data;

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
      <View className="flex-1 bg-[#13111a] items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0A84FF" />
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
        <View className="w-full relative" style={{ aspectRatio: 0.75 }}>
          <Image
            source={{ uri: d.poster || d.img || d.coverImage || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg" }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={300}
          />
          
          <LinearGradient
            colors={['rgba(19, 17, 26, 0.8)', 'transparent', '#13111a']}
            locations={[0, 0.4, 1]}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />

          {/* Top Bar (Absolute) */}
          <View className="absolute top-12 left-0 right-0 px-4 flex-row justify-between items-center z-50">
            <Pressable 
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-[#13111a]/60 items-center justify-center border border-white/20"
            >
              <ArrowLeft color="white" size={20} />
            </Pressable>
            <Pressable 
              onPress={handleShare}
              className="w-10 h-10 rounded-full bg-[#13111a]/60 items-center justify-center border border-white/20"
            >
              <ShareIcon color="white" size={18} />
            </Pressable>
          </View>

          {/* Title Area overlaid on bottom of poster */}
          <View className="absolute bottom-0 left-0 right-0 px-6 pb-6">
            {d.status === "FINISHED" ? (
              <View className="self-start flex-row items-center gap-1.5 px-3 py-1 bg-[#30D158]/20 rounded-full border border-[#30D158]/30 mb-3">
                <View className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
                <Text className="text-[#30D158] text-[11px] font-bold">Anime Tamat</Text>
              </View>
            ) : scheduleDay ? (
              <View className="self-start flex-row items-center gap-1.5 px-3 py-1 bg-[#FFD60A]/20 rounded-full border border-[#FFD60A]/30 mb-3">
                <View className="w-1.5 h-1.5 rounded-full bg-[#FFD60A]" />
                <Text className="text-white text-[11px] font-bold">Update setiap {scheduleDay}</Text>
              </View>
            ) : null}
            
            <Text className="text-3xl font-black text-white leading-tight mb-1">{d.title}</Text>
            {d.nativeTitle && <Text className="text-sm text-[#8e8e93] mb-3">{d.nativeTitle}</Text>}
            
            <View className="flex-row items-center flex-wrap gap-x-2 gap-y-1">
              {realViews > 0 && (
                <View className="flex-row items-center gap-1">
                  <Eye color="#e5e5ea" size={12} />
                  <Text className="text-[#e5e5ea] text-xs font-bold">
                    {Intl.NumberFormat('id-ID', { notation: "compact", maximumFractionDigits: 1 }).format(realViews)}
                  </Text>
                </View>
              )}
              {d.score && (
                <View className="flex-row items-center gap-1">
                  <Text className="text-[#48484a] text-[10px]">●</Text>
                  <View className="flex-row items-center gap-1">
                    <Star color="#30D158" fill="#30D158" size={12} />
                    <Text className="text-[#30D158] text-xs font-bold">{(d.score / 10).toFixed(1)}</Text>
                  </View>
                </View>
              )}
              {d.season && d.seasonYear && (
                <View className="flex-row items-center gap-1">
                  <Text className="text-[#48484a] text-[10px]">●</Text>
                  <Text className="text-[#e5e5ea] text-xs capitalize">{d.season.toLowerCase()} {d.seasonYear}</Text>
                </View>
              )}
              {d.studios?.[0] && (
                <View className="flex-row items-center gap-1">
                  <Text className="text-[#48484a] text-[10px]">●</Text>
                  <Text className="text-[#e5e5ea] text-xs">{d.studios[0]}</Text>
                </View>
              )}
            </View>
            
            {d.genres?.length > 0 && (
              <View className="flex-row items-center gap-2 mt-3">
                {d.genres.slice(0, 3).map((g: string) => (
                  <View key={g} className="px-2.5 py-0.5 bg-white/10 border border-white/10 rounded-full">
                    <Text className="text-[11px] font-bold text-white">{g}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View className="px-6 pt-4">
          {/* Actions */}
          <View className="flex-row items-center gap-3 mb-8">
            {firstEp ? (
              <Link href={`/watch/${id}/${firstEp}`} asChild>
                <Pressable 
                  className="flex-1 py-3.5 rounded-full flex-row items-center justify-center gap-2 bg-[#0A84FF] active:opacity-80"
                >
                  <Play color="white" fill="white" size={18} />
                  <Text className="font-bold text-[14px] text-white">
                    Mulai Tonton
                  </Text>
                </Pressable>
              </Link>
            ) : (
              <Pressable 
                className="flex-1 py-3.5 rounded-full flex-row items-center justify-center gap-2 bg-[#1f1c29]"
              >
                <Text className="font-bold text-[14px] text-[#8e8e93]">
                  Belum Tersedia
                </Text>
              </Pressable>
            )}

            <Pressable className="flex-1 py-3.5 rounded-full flex-row items-center justify-center gap-2 bg-[#1f1c29] border border-white/5 active:opacity-80">
              <Bookmark color="#e5e5ea" size={18} />
              <Text className="font-bold text-[14px] text-[#e5e5ea]">Koleksi</Text>
            </Pressable>
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
            <Text className="text-white font-bold text-base mb-4">Daftar Episode</Text>
            {eps.length === 0 ? (
              <View className="py-10 items-center justify-center bg-[#1c1c1e] rounded-2xl border border-white/5">
                <Text className="text-[#8e8e93]">Belum ada episode</Text>
              </View>
            ) : (
              <View className="gap-3">
                {eps.map((ep: any, index: number) => {
                  const epNum = ep.number || ep.url?.split("episode=").pop();
                  return (
                    <Link href={`/watch/${id}/${epNum}`} key={index} asChild>
                      <Pressable 
                        className="flex-row items-center bg-[#1c1c1e] p-3 rounded-2xl border border-white/5 active:bg-white/5"
                      >
                        <View className="w-10 h-10 bg-white/5 rounded-full items-center justify-center mr-4">
                          <Play color="#0A84FF" fill="#0A84FF" size={16} className="ml-1" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-bold text-sm">Episode {ep.number}</Text>
                          {ep.title && <Text className="text-[#8e8e93] text-xs mt-0.5" numberOfLines={1}>{ep.title}</Text>}
                        </View>
                      </Pressable>
                    </Link>
                  );
                })}
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

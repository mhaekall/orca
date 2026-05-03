import React, { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, Dimensions } from "react-native";
import { Bookmark, RefreshCcw } from "lucide-react-native";
import useSWR from "swr";
import { useAuth } from "../../lib/auth";
import { AnimeCard } from "../../components/AnimeCard";
import { Skeleton } from "../../components/Skeleton";

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CollectionScreen() {
  const { user, isLoading: authLoading, signInWithGoogle } = useAuth();
  const userId = user?.id || user?.email; // fallback to email for mock user

  const { data: collectionResponse, isLoading: collectionLoading, error, mutate } = useSWR(
    userId ? `${API_URL}/api/v2/collection?user_id=${userId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  const rawItems = Array.isArray(collectionResponse) ? collectionResponse : (collectionResponse?.data || []);
  
  const sortedItems = [...rawItems].map((h: any) => ({
    id: String(h.animeSlug || h.anilistId),
    title: h.cleanTitle || h.nativeTitle || h.animeTitle || `Anime #${h.animeSlug}`,
    img: h.coverImage || h.animeCover,
    totalEps: h.totalEpisodes || 0,
    status: h.status,
    progress: h.progress || 0,
    updatedAt: new Date(h.updatedAt).getTime()
  })).sort((a, b) => b.updatedAt - a.updatedAt);

  const windowWidth = Dimensions.get('window').width;
  const padding = 24; // px-6 is 24px
  const gap = 12; // gap-3
  // 3 columns
  const itemWidth = (windowWidth - (padding * 2) - (gap * 2)) / 3;

  if (authLoading) {
    return (
      <View className="flex-1 bg-[#13111a]">
        <View className="pt-16 pb-4 bg-[#13111a] border-b border-white/5 z-10 px-6">
          <Skeleton w={140} h={32} r={8} />
        </View>
        <View className="flex-1 px-6 pt-5" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={{ width: itemWidth, marginBottom: 16 }}>
               <Skeleton w="100%" h={itemWidth * 1.5} r={16} style={{ marginBottom: 8 }} />
               <Skeleton w="90%" h={14} r={6} style={{ marginBottom: 4 }} />
               <Skeleton w="60%" h={14} r={6} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a0812]">
      {/* Header Fixed */}
      <View className="pt-16 pb-4 bg-[#0a0812] z-10 px-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-[28px] font-black text-white tracking-tight mb-1">
            Koleksi
          </Text>
          {sortedItems.length > 0 && (
            <View className="bg-white/10 px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-white/80">{sortedItems.length} Judul</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        className="flex-1 px-6" 
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 20 }}
      >
        {!user ? (
          <View className="py-20 items-center justify-center">
            <View className="w-20 h-20 bg-[#1f1c29] rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-xl">
              <Bookmark size={40} color="rgba(255,255,255,0.2)" />
            </View>
            <Text className="text-white font-bold text-xl mb-2">Silakan Login</Text>
            <Text className="text-[#8e8e93] text-sm text-center mb-8 max-w-[250px]">
              Simpan anime yang ingin Anda tonton untuk diakses di perangkat mana pun.
            </Text>
            <Pressable 
              onPress={signInWithGoogle}
              className="bg-white px-6 py-3 rounded-full active:opacity-80"
            >
              <Text className="text-black font-bold text-base">Login dengan Google</Text>
            </Pressable>
          </View>
        ) : collectionLoading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={{ width: itemWidth, marginBottom: 16 }}>
                 <Skeleton w="100%" h={itemWidth * 1.5} r={16} style={{ marginBottom: 8 }} />
                 <Skeleton w="90%" h={14} r={6} style={{ marginBottom: 4 }} />
                 <Skeleton w="60%" h={14} r={6} />
              </View>
            ))}
          </View>
        ) : error ? (
           <View className="py-20 items-center justify-center">
            <Text className="text-[#FF453A] text-sm mb-4 font-medium">Gagal memuat koleksi</Text>
            <Pressable onPress={() => mutate()} className="flex-row items-center gap-2 bg-white/10 px-4 py-2 rounded-full active:opacity-80">
              <RefreshCcw size={14} color="white" />
              <Text className="text-white font-bold text-sm">Coba Lagi</Text>
            </Pressable>
          </View>
        ) : sortedItems.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <View className="w-20 h-20 bg-[#1f1c29] rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-xl">
              <Bookmark size={40} color="rgba(255,255,255,0.2)" />
            </View>
            <Text className="text-white font-bold text-xl mb-2">Belum ada koleksi</Text>
            <Text className="text-[#8e8e93] text-sm text-center max-w-[200px]">
              Simpan anime yang ingin Anda tonton di sini.
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {sortedItems.map((item) => (
              <View key={item.id} style={{ width: itemWidth }}>
                <AnimeCard
                  id={item.id}
                  title={item.title}
                  img={item.img}
                  totalEps={item.totalEps}
                  epId={item.progress ? String(item.progress) : undefined}
                  variant="vertical"
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

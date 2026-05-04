import React from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import useSWR from "swr";
import { LatestGrid } from "../../components/LatestGrid";
import { LinearGradient } from "expo-linear-gradient";

// Hardcoded API or from env if available
const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function greet() {
  const h = new Date().getHours();
  if (h < 5) return "Konbanwa";
  if (h < 12) return "Ohayou";
  if (h < 17) return "Konnichiwa";
  return "Konbanwa";
}

export default function HomeScreen() {
  const { data: swrData, isLoading, isValidating, mutate } = useSWR(
    `${API_URL}/api/v2/home?v=3`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const d = swrData?.data || {};
  const sLatest = d.latest || [];
  const sAiring = d.airing || [];
  const sPopular = d.popular || [];
  const sTopRated = d.top_rated || [];
  const sCompleted = d.completed || [];
  const sMovies = d.movies || [];

  // 1. Gabungkan Tayangan Terbaru + Airing (Deduplikasi)
  const ongoingMap = new Map();
  [...sLatest, ...sAiring].forEach((i: any) => {
    const id = String(i.anilistId || i.id);
    if (!ongoingMap.has(id)) ongoingMap.set(id, i);
  });
  const ongoingItems = Array.from(ongoingMap.values());

  // 2. Gabungkan Populer + Skor Tertinggi + Tamat (Deduplikasi)
  const bestMap = new Map();
  [...sPopular, ...sTopRated, ...sCompleted].forEach((i: any) => {
    const id = String(i.anilistId || i.id);
    if (!bestMap.has(id)) bestMap.set(id, i);
  });
  const bestItems = Array.from(bestMap.values());

  return (
    <View className="flex-1 bg-[#13111a]">
      <ScrollView
        className="flex-1 w-full"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isValidating}
            onRefresh={() => mutate()}
            tintColor="#0A84FF" // iOS
            colors={["#0A84FF"]} // Android
          />
        }
      >
        {/* Header */}
        <View className="px-6 pt-16 pb-6">
          <Text className="text-[28px] font-black text-white tracking-tight mb-6">
            Orca
          </Text>
          
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-[#32D74B]" />
            <Text className="text-[#8e8e93] text-[11px] font-bold tracking-widest uppercase">
              {greet()}, Guest
            </Text>
          </View>
        </View>

        {/* Section 1: Ongoing */}
        {ongoingItems.length > 0 && (
          <LatestGrid title="Sedang Tayang & Terbaru" items={ongoingItems} badge="NEW" />
        )}

        {/* Section 2: Best */}
        {bestItems.length > 0 && (
          <LatestGrid title="Terpopuler & Terbaik" items={bestItems} badge="BEST" />
        )}

        {/* Section 3: Movies */}
        {sMovies.length > 0 && (
          <LatestGrid title="Film Anime (Movies)" items={sMovies} badge="MOVIE" />
        )}
      </ScrollView>

      {/* Decorative Gradient Overlay at bottom for tab bar padding */}
      <LinearGradient
        colors={['transparent', '#13111a']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }}
        pointerEvents="none"
      />
    </View>
  );
}

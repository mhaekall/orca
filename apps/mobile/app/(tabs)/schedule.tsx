import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import useSWR from "swr";
import { Play, Star, ChevronRight } from "lucide-react-native";
import { Skeleton } from "../../components/Skeleton";

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ScheduleScreen() {
  const [activeDay, setActiveDay] = useState<string>("Senin");

  const { data: swrData, isLoading } = useSWR(
    `${API_URL}/api/v2/schedule?v=2`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const schedData = swrData?.data || {};
  const days = Object.keys(schedData).filter(k => k !== "TBA");
  if (schedData["TBA"]) days.push("TBA");

  // Set default day to today once data is available
  useEffect(() => {
    if (Object.keys(schedData).length > 0) {
      const todayIndex = new Date().getDay() - 1;
      const daysArr = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      const today = daysArr[todayIndex < 0 ? 6 : todayIndex];
      if (schedData[today]) {
        setActiveDay(today);
      } else {
        setActiveDay(Object.keys(schedData)[0] || "Senin");
      }
    }
  }, [schedData]);

  const currentItems = schedData[activeDay] || [];

  return (
    <View className="flex-1 bg-[#0a0812]">
      {/* Header Fixed */}
      <View className="pt-16 pb-4 bg-[#0a0812] px-6">
        <Text className="text-[28px] font-black text-white tracking-tight mb-1">
          Jadwal Rilis
        </Text>
        <Text className="text-[#8e8e93] text-sm font-medium mb-6">
          Cek jadwal tayang episode terbaru minggu ini.
        </Text>

        {/* Segmented Control / Day Picker */}
        <View className="bg-[#1f1c29] p-1 rounded-full border border-white/5 flex-row">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2 }}>
            {days.length === 0 && isLoading ? (
              <ActivityIndicator size="small" color="#8e8e93" className="my-2 mx-auto" />
            ) : (
              days.map((day) => {
                const isActive = activeDay === day;
                return (
                  <Pressable
                    key={day}
                    onPress={() => setActiveDay(day)}
                    className={`px-5 py-2 rounded-full transition-colors ${
                      isActive ? "bg-white" : "bg-transparent active:bg-white/10"
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        isActive ? "text-black" : "text-[#8e8e93]"
                      }`}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>

      {/* List Jadwal */}
      <ScrollView 
        className="flex-1 px-6" 
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
      >
        {isLoading && days.length === 0 ? (
          <View>
             {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} className="flex-row items-center bg-[#1f1c29] p-3 rounded-2xl border border-white/5 mb-3">
                   <Skeleton w={70} h={70} r={12} />
                   <View className="flex-1 ml-4 justify-center">
                     <Skeleton w="80%" h={16} r={6} style={{ marginBottom: 8 }} />
                     <Skeleton w="50%" h={12} r={4} />
                   </View>
                </View>
             ))}
          </View>
        ) : currentItems.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <Text className="text-[#8e8e93] text-base font-medium">Tidak ada rilis pada hari ini.</Text>
          </View>
        ) : (
          currentItems.map((item: any, idx: number) => {
            const id = item.id || item.anilistId;
            if (!id) return null;
            return (
              <Link href={`/anime/${id}`} key={`${id}-${idx}`} asChild>
                <Pressable className="flex-row items-center gap-4 py-4 border-b border-white/5 active:opacity-50">
                  <View className="w-16 h-16 rounded-[14px] overflow-hidden bg-[#1f1c29] border border-white/10">
                    <Image 
                      source={{ uri: item.img || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg" }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                    />
                    <View className="absolute inset-0 bg-black/20 items-center justify-center">
                      <Play color="white" fill="white" size={20} className="opacity-80" />
                    </View>
                  </View>
                  
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-[#f2f2f7] leading-tight mb-1.5" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View className="flex-row items-center gap-2 flex-wrap">
                      {item.airingTime && (
                        <View className="flex-row items-center gap-2">
                          <View className="bg-[#32D74B]/10 px-1.5 py-0.5 rounded">
                            <Text className="text-[#32D74B] text-xs font-bold">{item.airingTime}</Text>
                          </View>
                          <Text className="text-[#48484a] text-[10px]">●</Text>
                        </View>
                      )}
                      <Text className="text-[#8e8e93] text-xs font-medium">Ep. {item.latestEpisode || '?'}</Text>
                      {item.score ? (
                        <View className="flex-row items-center gap-1">
                          <Text className="text-[#48484a] text-[10px]">●</Text>
                          <View className="flex-row items-center gap-1">
                            <Star color="#FFD60A" fill="#FFD60A" size={10} />
                            <Text className="text-[#FFD60A] text-xs font-bold">{(item.score / 10).toFixed(1)}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center">
                    <ChevronRight color="rgba(255,255,255,0.4)" size={16} />
                  </View>
                </Pressable>
              </Link>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

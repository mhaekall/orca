import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
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
    <View style={styles.container}>
      {/* Header Fixed */}
      <View style={styles.header}>
        <Text style={styles.titleText}>
          Jadwal Rilis
        </Text>
        <Text style={styles.subtitleText}>
          Cek jadwal tayang episode terbaru minggu ini.
        </Text>

        {/* Segmented Control / Day Picker */}
        <View style={styles.pickerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScrollContent}>
            {days.length === 0 && isLoading ? (
              <ActivityIndicator size="small" color="#8e8e93" style={styles.pickerLoader} />
            ) : (
              days.map((day) => {
                const isActive = activeDay === day;
                return (
                  <Pressable
                    key={day}
                    onPress={() => setActiveDay(day)}
                    style={({pressed}) => [
                      styles.dayButton,
                      isActive ? styles.dayButtonActive : styles.dayButtonInactive,
                      pressed && !isActive && styles.dayButtonPressed
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        isActive ? styles.dayButtonTextActive : styles.dayButtonTextInactive
                      ]}
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
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
      >
        {isLoading && days.length === 0 ? (
          <View>
             {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={styles.skeletonRow}>
                   <Skeleton w={70} h={70} r={12} />
                   <View style={styles.skeletonContent}>
                     <Skeleton w="80%" h={16} r={6} style={{ marginBottom: 8 }} />
                     <Skeleton w="50%" h={12} r={4} />
                   </View>
                </View>
             ))}
          </View>
        ) : currentItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada rilis pada hari ini.</Text>
          </View>
        ) : (
          currentItems.map((item: any, idx: number) => {
            const id = item.id || item.anilistId;
            if (!id) return null;
            return (
              <Link href={`/anime/${id}`} key={`${id}-${idx}`} asChild>
                <Pressable style={({pressed}) => [styles.itemRow, pressed && styles.itemRowPressed]}>
                  <View style={styles.itemImageContainer}>
                    <Image 
                      source={{ uri: item.img || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg" }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.itemImageOverlay}>
                      <Play color="white" fill="white" size={20} style={styles.playIcon} />
                    </View>
                  </View>
                  
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.itemStats}>
                      {item.airingTime && (
                        <View style={styles.statGroup}>
                          <View style={styles.airingTimeBadge}>
                            <Text style={styles.airingTimeText}>{item.airingTime}</Text>
                          </View>
                          <Text style={styles.dotSeparator}>●</Text>
                        </View>
                      )}
                      <Text style={styles.epText}>Ep. {item.latestEpisode || '?'}</Text>
                      {item.score ? (
                        <View style={styles.statGroup}>
                          <Text style={[styles.dotSeparator, {marginLeft: 4}]}>●</Text>
                          <View style={[styles.statGroup, {gap: 4, marginLeft: 4}]}>
                            <Star color="#FFD60A" fill="#FFD60A" size={10} />
                            <Text style={styles.scoreText}>{(item.score / 10).toFixed(1)}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.chevronContainer}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0812',
  },
  header: {
    paddingTop: 64,
    paddingBottom: 16,
    backgroundColor: '#0a0812',
    paddingHorizontal: 24,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitleText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
  pickerContainer: {
    backgroundColor: '#1f1c29',
    padding: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
  },
  pickerScrollContent: {
    paddingHorizontal: 8,
  },
  pickerLoader: {
    marginVertical: 8,
    marginHorizontal: 'auto',
  },
  dayButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  dayButtonActive: {
    backgroundColor: 'white',
  },
  dayButtonInactive: {
    backgroundColor: 'transparent',
  },
  dayButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dayButtonTextActive: {
    color: 'black',
  },
  dayButtonTextInactive: {
    color: '#8e8e93',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  listContent: {
    paddingBottom: 120,
    paddingTop: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1c29',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 16,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemRowPressed: {
    opacity: 0.5,
  },
  itemImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1f1c29',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  itemImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    opacity: 0.8,
  },
  itemDetails: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f2f2f7',
    lineHeight: 20,
    marginBottom: 6,
  },
  itemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  airingTimeBadge: {
    backgroundColor: 'rgba(50, 215, 75, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  airingTimeText: {
    color: '#32D74B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dotSeparator: {
    color: '#48484a',
    fontSize: 10,
  },
  epText: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '500',
  },
  scoreText: {
    color: '#FFD60A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
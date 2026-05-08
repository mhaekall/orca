import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Dimensions, Alert } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import useSWR from "swr";
import { Play, Star, Eye, Plus, Bookmark } from "lucide-react-native";
import { Skeleton } from "../../components/Skeleton";
import { useAuth } from "../../lib/auth";

import { ChevronRight } from "lucide-react-native";

const API_URL = "https://orcanime.pages.dev";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const { width: WINDOW_WIDTH } = Dimensions.get("window");

const absoluteFill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

// Memoized Card Component to prevent re-renders
const ScheduleCard = memo(({ item, idx, isToday, isPast }: { item: any, idx: number, isToday: boolean, isPast: boolean }) => {
  const router = useRouter();
  const { user } = useAuth();
  const id = String(item.anilistId || item.id);
  if (!id || id === "undefined") return null;
  
  const img = item.poster || item.img || item.coverImage?.extraLarge || item.banner || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg";
  let title = "";
  if (typeof item.title === "string") {
    title = item.title;
  } else if (item.title) {
    title = item.title.english || item.title.romaji || item.title.userPreferred || item.title.native || "";
  }
  if (!title) title = "Unknown Title";

  const score = item.score || item.averageScore || 0;
  const airingTime = item.airingTime ? String(item.airingTime) : "";
  const eps = item.latestEpisode ? String(item.latestEpisode) : "?";

  let isAired = false;
  if (isPast) {
     isAired = true;
  } else if (isToday && airingTime) {
     const match = airingTime.match(/(\d+):(\d+)/);
     if (match) {
        const hour = parseInt(match[1], 10);
        const minute = parseInt(match[2], 10);
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        if (currentHour > hour || (currentHour === hour && currentMinute >= minute)) {
           isAired = true;
        }
     }
  }

  const statusText = isAired ? `Eps ${eps} Rilis` : `Eps ${eps} Segera Rilis`;
  const statusColor = isAired ? "#0A84FF" : "rgba(255,255,255,0.5)";

  const handleSaveCollection = async () => {
    if (!user) {
      Alert.alert("Login Dibutuhkan", "Silakan login untuk menyimpan ke koleksi.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/v2/collection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          anilistId: id,
          status: "Watching",
          progress: 0
        }),
      });
      if (res.ok) {
        Alert.alert("Tersimpan", "Anime berhasil ditambahkan ke Koleksi.");
      } else {
        Alert.alert("Gagal", "Terjadi kesalahan saat menyimpan.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Gagal", "Jaringan bermasalah.");
    }
  };
  
  return (
    <Pressable onPress={() => router.push(`/anime/${id}` as any)} style={styles.itemRow}>
      <View style={styles.itemImageContainer}>
        <Image 
          source={{ uri: img }}
          style={absoluteFill}
          contentFit="cover"
        />
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.itemStats}>
          {airingTime !== "" && (
            <View style={styles.statGroup}>
              <View style={styles.airingTimeBadge}>
                <Text style={styles.airingTimeText}>{airingTime}</Text>
              </View>
              <Text style={styles.dotSeparator}>●</Text>
            </View>
          )}
          <Text style={[styles.epText, { color: statusColor }]}>{statusText}</Text>
          {score > 0 ? (
            <View style={styles.statGroup}>
              <Text style={[styles.dotSeparator, {marginLeft: 4}]}>●</Text>
              <View style={[styles.statGroup, {gap: 4, marginLeft: 4}]}>
                <Star color="#FFD60A" fill="#FFD60A" size={10} />
                <Text style={styles.scoreText}>{(score / 10).toFixed(1)}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable onPress={handleSaveCollection} hitSlop={10} style={styles.actionButton}>
        <Bookmark size={18} color="rgba(255,255,255,0.6)" />
      </Pressable>
    </Pressable>
  );
});

const DayPage: any = memo(({ dayPage }: { dayPage: any }) => {
  const isToday = dayPage.isToday;
  const isPast = dayPage.isPast;

  const renderItemFn = useCallback(({ item, index }: any) => {
     return <ScheduleCard item={item} idx={index} isToday={isToday} isPast={isPast} />;
  }, [isToday, isPast]);

  return (
    <View style={{ width: WINDOW_WIDTH }}>
      {dayPage.data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Tidak ada rilis pada hari ini.</Text>
        </View>
      ) : (
        <FlatList<any>
          showsVerticalScrollIndicator={false}
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          data={dayPage.data}
          keyExtractor={(item: any, index: number) => String(item.anilistId || item.id || '') + '-' + index}
          renderItem={renderItemFn}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      )}
    </View>
  );
});

const renderDayPage = ({ item }: { item: any }) => <DayPage dayPage={item} />;

export default function ScheduleScreen() {
  const [activeDay, setActiveDay] = useState<string>("Senin");
  const [weekDates, setWeekDates] = useState<any[]>([]);

  const { data: swrData, isLoading } = useSWR(
    `${API_URL}/api/v2/schedule?v=2`,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    // Safe method to calculate WIB in React Native (Hermes without full ICU)
    const realNow = new Date();
    const utc = realNow.getTime() + (realNow.getTimezoneOffset() * 60000);
    const today = new Date(utc + (7 * 3600000)); // Shift +7 hours for WIB
    
    const currentDay = today.getDay(); // 0 = Sunday
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    monday.setHours(0,0,0,0);
    
    const todayStart = new Date(today);
    todayStart.setHours(0,0,0,0);

    const week = [];
    const daysArr = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    const shortDaysArr = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    
    let initialActive = "Senin";
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
      if (isToday) {
        initialActive = daysArr[i];
      }
      week.push({
        fullDay: daysArr[i],
        shortDay: shortDaysArr[i],
        dateNum: d.getDate(),
        isToday,
        isPast: d.getTime() < todayStart.getTime()
      });
    }
    setWeekDates(week);
    setActiveDay(initialActive);
  }, []);

  const schedData = swrData?.data || {};
  
  // Memoize sorted items for ALL days to support swipeable pages
  const allDaysData = useMemo(() => {
    return weekDates.map((dayObj) => {
      let items = schedData[dayObj.fullDay] || [];
      if (!Array.isArray(items)) items = [];
      
      const sorted = [...items].sort((a, b) => {
        const timeA = a?.airingTime ? String(a.airingTime) : "";
        const timeB = b?.airingTime ? String(b.airingTime) : "";
        if (!timeA) return 1;
        if (!timeB) return -1;
        return timeA.localeCompare(timeB);
      });

      return {
        ...dayObj,
        data: sorted
      };
    });
  }, [schedData, weekDates]);

  const flatListRef = useRef<any>(null);

  // Sync scroll to activeDay when header is pressed
  const handleDayPress = useCallback((index: number, dayName: string) => {
    setActiveDay(dayName);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  // Update activeDay when user swipes
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const newDay = viewableItems[0].item.fullDay;
      if (newDay) {
        setActiveDay(newDay);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Use an effect to scroll to the initial active day on first render
  useEffect(() => {
    if (weekDates.length > 0 && activeDay) {
       const idx = weekDates.findIndex(d => d.fullDay === activeDay);
       if (idx !== -1) {
         // setTimeout to ensure flatlist is fully mounted before scrolling
         setTimeout(() => {
           flatListRef.current?.scrollToIndex({ index: idx, animated: false });
         }, 100);
       }
    }
  }, [weekDates]);

  return (
    <View style={styles.container}>
      {/* Header Fixed */}
      <View style={styles.header}>
        <Text style={styles.titleText}>
          Jadwal Rilis
        </Text>

        {/* Static Day Picker */}
        <View style={styles.pickerContainer}>
          {weekDates.map((dayObj: any, index: number) => {
            const isActive = activeDay === dayObj.fullDay;
            return (
              <Pressable
                key={dayObj.fullDay}
                onPress={() => handleDayPress(index, dayObj.fullDay)}
                style={({pressed}) => [
                  styles.dayButton,
                  isActive ? styles.dayButtonActive : styles.dayButtonInactive,
                  pressed && !isActive && styles.dayButtonPressed,
                ]}
              >
                <Text style={[styles.dayButtonText, isActive ? styles.dayButtonTextActive : styles.dayButtonTextInactive]}>
                  {dayObj.shortDay}
                </Text>
                <Text style={[styles.dateNumberText, isActive ? styles.dateNumberTextActive : styles.dateNumberTextInactive]}>
                  {dayObj.dateNum}
                </Text>
                {dayObj.isToday && (
                  <View style={[styles.todayIndicator, isActive ? styles.todayIndicatorActive : styles.todayIndicatorInactive]} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* List Jadwal Horizontal Pager */}
      {isLoading && Object.keys(schedData).length === 0 ? (
        <View style={styles.listContainer}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.skeletonRow}>
                <View style={{ width: 64, height: 64 }}>
                  <Skeleton w={64} h={64} r={14} />
                </View>
                <View style={styles.skeletonContent}>
                  <Skeleton w="80%" h={16} r={6} style={{ marginBottom: 8 }} />
                  <Skeleton w="50%" h={12} r={4} />
                </View>
            </View>
          ))}        </View>
      ) : (
        <FlatList<any>
          ref={flatListRef}
          data={allDaysData}
          keyExtractor={(item) => item.fullDay}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({ length: WINDOW_WIDTH, offset: WINDOW_WIDTH * index, index })}
          renderItem={renderDayPage}
        />
      )}
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
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#f2f2f7',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingVertical: 6,
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    position: 'relative',
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
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dayButtonTextActive: {
    color: '#0a0812',
  },
  dayButtonTextInactive: {
    color: '#8e8e93',
  },
  dateNumberText: {
    fontSize: 15,
    fontWeight: '900',
  },
  dateNumberTextActive: {
    color: '#0a0812',
  },
  dateNumberTextInactive: {
    color: '#f2f2f7',
  },
  todayIndicator: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  todayIndicatorActive: {
    backgroundColor: '#0A84FF',
  },
  todayIndicatorInactive: {
    backgroundColor: '#30D158',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
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
  itemImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1f1c29',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    fontSize: 12,
    fontWeight: '500',
  },
  scoreText: {
    color: '#FFD60A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
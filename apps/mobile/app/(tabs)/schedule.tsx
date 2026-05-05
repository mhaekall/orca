import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import useSWR from "swr";
import { Play, Star, ChevronRight } from "lucide-react-native";
import { Skeleton } from "../../components/Skeleton";

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ScheduleScreen() {
  const [activeDay, setActiveDay] = useState<string>("Senin");
  const [weekDates, setWeekDates] = useState<any[]>([]);

  const { data: swrData, isLoading } = useSWR(
    `${API_URL}/api/v2/schedule?v=2`,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    
    const week = [];
    const daysArr = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    const shortDaysArr = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    
    let initialActive = "Senin";
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      if (isToday) {
        initialActive = daysArr[i];
      }
      week.push({
        fullDay: daysArr[i],
        shortDay: shortDaysArr[i],
        dateNum: d.getDate(),
        isToday
      });
    }
    setWeekDates(week);
    setActiveDay(initialActive);
  }, []);

  const schedData = swrData?.data || {};
  const currentItems = schedData[activeDay] || [];

  return (
    <View style={styles.container}>
      {/* Header Fixed */}
      <View style={styles.header}>
        <Text style={styles.titleText}>
          Jadwal Rilis
        </Text>

        {/* Static Day Picker */}
        <View style={styles.pickerContainer}>
          {weekDates.map((dayObj) => {
            const isActive = activeDay === dayObj.fullDay;
            return (
              <Pressable
                key={dayObj.fullDay}
                onPress={() => setActiveDay(dayObj.fullDay)}
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

      {/* List Jadwal */}
      <ScrollView 
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
      >
        {isLoading && Object.keys(schedData).length === 0 ? (
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
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#f2f2f7',
    marginBottom: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1f1c29',
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
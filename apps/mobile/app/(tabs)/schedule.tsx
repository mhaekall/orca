import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import useSWR from "swr";
import { Play, Star, Eye } from "lucide-react-native";
import { Skeleton } from "../../components/Skeleton";

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatViews(v: number): string {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toString();
}

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
  let currentItems = schedData[activeDay] || [];
  if (!Array.isArray(currentItems)) {
    currentItems = [];
  }
  
  // Sort items safely by airing time
  currentItems = [...currentItems].sort((a, b) => {
    const timeA = a?.airingTime ? String(a.airingTime) : "";
    const timeB = b?.airingTime ? String(b.airingTime) : "";
    if (!timeA) return 1;
    if (!timeB) return -1;
    return timeA.localeCompare(timeB);
  });

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
        showsVerticalScrollIndicator={false}
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
      >
        {isLoading && Object.keys(schedData).length === 0 ? (
          <View>
             {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={styles.skeletonRow}>
                   <View style={{ width: 100, height: "100%" }}>
                     <Skeleton w={100} h={130} r={0} />
                   </View>
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
            
            return (
              <View key={`${id}-${idx}`} style={styles.cardWrapper}>
                <Link href={`/anime/${id}` as any} asChild>
                  <Pressable style={styles.cardPressable}>
                    <View style={styles.cardImageContainer}>
                      <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                      <LinearGradient colors={["transparent", "rgba(10,8,18,0.8)"]} style={StyleSheet.absoluteFillObject} />
                    </View>
                    
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {title}
                      </Text>
                      
                      <View style={styles.cardMetaRow}>
                        {airingTime !== "" && (
                          <View style={styles.timeBadge}>
                            <Text style={styles.timeText}>{airingTime}</Text>
                          </View>
                        )}
                        
                        {(score > 0 && airingTime !== "") && (
                           <Text style={styles.dotSeparator}>•</Text>
                        )}

                        {score > 0 && (
                          <View style={styles.scoreBadge}>
                            <Star size={11} color="#FFD60A" fill="#FFD60A" />
                            <Text style={styles.scoreText}>{(score / 10).toFixed(1)}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.cardBottomRow}>
                        <Text style={styles.epLabelText}>
                          Episode {eps}
                        </Text>
                        <View style={styles.playButtonCircle}>
                          <Play size={12} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </Link>
              </View>
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
    backgroundColor: '#1a1825',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
    overflow: 'hidden',
    height: 130,
  },
  skeletonContent: {
    flex: 1,
    padding: 14,
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
  cardWrapper: {
    width: "100%",
    height: 130,
    marginBottom: 16,
  },
  cardPressable: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#1a1825",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardImageContainer: {
    width: 100,
    height: "100%",
    backgroundColor: "#0a0812",
  },
  cardContent: {
    flex: 1,
    padding: 14,
    justifyContent: "center",
    paddingLeft: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 20,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  timeBadge: {
    backgroundColor: "rgba(50, 215, 75, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeText: {
    color: "#32D74B",
    fontSize: 11,
    fontWeight: "700",
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  scoreText: {
    color: "#FFD60A",
    fontSize: 11,
    fontWeight: "700",
  },
  dotSeparator: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 10,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  epLabelText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
  },
  playButtonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
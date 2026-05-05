import React, { useState, useMemo, useRef, useCallback } from "react";
import { View, Text, ScrollView, FlatList, Pressable, Dimensions, StyleSheet } from "react-native";
import { Bookmark, Clock, RefreshCcw } from "lucide-react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import useSWR from "swr";
import { useAuth } from "../../lib/auth";
import { AnimeCard } from "../../components/AnimeCard";
import { Skeleton } from "../../components/Skeleton";

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const { width: WINDOW_WIDTH } = Dimensions.get("window");

const TABS = [
  { id: "all", label: "Semua", icon: Bookmark },
  { id: "history", label: "Riwayat Menonton", icon: Clock }
];

function formatHistoryDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    return `${date} • ${time}`;
  } catch (e) {
    return "Waktu tidak diketahui";
  }
}

function formatDuration(sec: number) {
  if (!sec) return "0m";
  const m = Math.floor(sec / 60);
  return `${m}m`;
}

const HistoryItem = React.memo(({ item, isLast }: { item: any, isLast: boolean }) => {
  const router = useRouter();
  const id = String(item.animeSlug || item.anilistId);
  const title = item.cleanTitle || item.nativeTitle || `Anime #${id}`;
  const img = item.coverImage || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg";
  const ep = item.episode || "?";
  const ts = item.timestampSec || 0;
  const dur = item.durationSec || 0;
  const pct = dur > 0 ? Math.min(100, Math.max(0, (ts / dur) * 100)) : 0;
  const updatedAt = item.updatedAt;

  return (
    <Pressable onPress={() => router.push(`/anime/${id}` as any)} style={styles.historyItemRow as any}>
      {/* Timeline Column */}
      <View style={styles.timelineCol}>
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      
      {/* Content Column */}
      <View style={styles.historyContent}>
        <View style={styles.historyTimeRow}>
           <Text style={styles.historyTimeText}>{updatedAt ? formatHistoryDate(updatedAt) : "Baru saja"}</Text>
        </View>
        <View style={styles.historyCard}>
           <Image source={{ uri: img }} style={styles.historyImg} contentFit="cover" />
           <View style={styles.historyDetails}>
             <Text style={styles.historyTitle} numberOfLines={2}>{title}</Text>
             <Text style={styles.historyEp}>Episode {ep}</Text>
             
             {dur > 0 && (
               <>
                 <View style={styles.historyProgBarBg}>
                   <View style={[styles.historyProgBarFill, { width: `${pct}%` }] as any} />
                 </View>
                 <Text style={styles.historyProgText}>{formatDuration(ts)} / {formatDuration(dur)} ditonton</Text>
               </>
             )}
           </View>
        </View>
      </View>
    </Pressable>
  );
});

const CollectionGrid = React.memo(({ items, itemWidth }: { items: any[], itemWidth: number }) => {
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.iconCircleDim}>
          <Bookmark size={32} color="rgba(255,255,255,0.3)" />
        </View>
        <Text style={styles.emptyTitle}>Koleksi Kosong</Text>
        <Text style={styles.emptyDesc}>
          Anda belum menyimpan anime apa pun ke dalam koleksi.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.gridList}>
      {items.map((item) => {
        const pct = item.totalEps > 0 ? Math.min(100, Math.max(0, (item.progress / item.totalEps) * 100)) : 0;
        const isComp = item.status === "COMPLETED";
        return (
          <View key={item.id} style={{ width: itemWidth } as any}>
            <AnimeCard
              id={item.id}
              title={item.title}
              img={item.img}
              totalEps={item.totalEps}
              epId={item.progress ? String(item.progress) : undefined}
              progressPercent={pct}
              isCompleted={isComp}
              variant="vertical"
            />
          </View>
        );
      })}
    </View>
  );
});

const HistoryList = React.memo(({ items }: { items: any[] }) => {
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.iconCircleDim}>
          <Clock size={32} color="rgba(255,255,255,0.3)" />
        </View>
        <Text style={styles.emptyTitle}>Riwayat Kosong</Text>
        <Text style={styles.emptyDesc}>
          Anda belum menonton anime apa pun.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: 40 }}>
      {items.map((item, idx) => (
        <HistoryItem key={`${item.animeSlug}-${item.episode}-${idx}`} item={item} isLast={idx === items.length - 1} />
      ))}
    </View>
  );
});

const TabPage = React.memo(({ item, itemWidth, user, signInWithGoogle }: any) => {
  return (
    <View style={{ width: WINDOW_WIDTH }}>
      {!user ? (
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <View style={styles.iconCircle}>
              <Bookmark size={36} color="white" />
            </View>
            <Text style={styles.emptyTitle}>Silakan Login</Text>
            <Text style={styles.emptyDesc}>
              Masuk untuk menyimpan koleksi dan menyinkronkan riwayat tontonan Anda.
            </Text>
            <Pressable 
              onPress={signInWithGoogle}
              style={styles.loginButton as any}
            >
              <Text style={styles.loginText}>Lanjutkan dengan Google</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
        >
          {item.isLoading ? (
            item.id === "all" ? (
              <View style={styles.gridList}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <View key={i} style={{ width: itemWidth, marginBottom: 16 } as any}>
                     <Skeleton w="100%" h={itemWidth * 1.5} r={16} style={{ marginBottom: 8 } as any} />
                     <Skeleton w="90%" h={14} r={6} style={{ marginBottom: 4 } as any} />
                     <Skeleton w="60%" h={14} r={6} />
                  </View>
                ))}
              </View>
            ) : (
              <View>
                {Array.from({ length: 5 }).map((_, i) => (
                  <View key={i} style={[styles.historyItemRow, { marginBottom: 20 }] as any}>
                    <Skeleton w={48} h={64} r={8} style={{ marginRight: 16 } as any} />
                    <View style={{ flex: 1 } as any}>
                      <Skeleton w="80%" h={16} r={6} style={{ marginBottom: 8 } as any} />
                      <Skeleton w="40%" h={12} r={4} />
                    </View>
                  </View>
                ))}
              </View>
            )
          ) : item.error ? (
             <View style={styles.emptyState}>
              <Text style={styles.errorText}>Koneksi Terputus</Text>
              <Text style={styles.emptyDesc}>Gagal memuat data dari server.</Text>
              <Pressable onPress={item.mutate} style={styles.retryButton as any}>
                <RefreshCcw size={14} color="white" />
                <Text style={styles.retryText}>Muat Ulang</Text>
              </Pressable>
            </View>
          ) : (
             item.id === "all" ? <CollectionGrid items={item.data} itemWidth={itemWidth} /> : <HistoryList items={item.data} />
          )}
        </ScrollView>
      )}
    </View>
  );
});

export default function CollectionScreen() {
  const { user, isLoading: authLoading, signInWithGoogle } = useAuth();
  const userId = user?.id || user?.email; // fallback to email for mock user

  const [activeTab, setActiveTab] = useState("all");

  const { data: collectionRes, isLoading: colLoading, error: colError, mutate: mutateCol } = useSWR(
    userId ? `${API_URL}/api/v2/collection?user_id=${userId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  const { data: historyRes, isLoading: hisLoading, error: hisError, mutate: mutateHis } = useSWR(
    userId ? `${API_URL}/api/v2/social/progress?user_id=${userId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  const allItems = useMemo(() => {
    const raw = Array.isArray(collectionRes) ? collectionRes : (collectionRes?.data || []);
    return [...raw].map((h: any) => ({
      id: String(h.animeSlug || h.anilistId),
      title: h.cleanTitle || h.nativeTitle || h.animeTitle || `Anime #${h.animeSlug}`,
      img: h.coverImage || h.animeCover,
      totalEps: h.totalEpisodes || 0,
      status: String(h.status || "").toUpperCase(),
      progress: h.progress || 0,
      updatedAt: new Date(h.updatedAt).getTime()
    })).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [collectionRes]);

  const historyItems = useMemo(() => {
    return Array.isArray(historyRes) ? historyRes : [];
  }, [historyRes]);

  const padding = 20; 
  const gap = 12; 
  const itemWidth = (WINDOW_WIDTH - (padding * 2) - (gap * 2)) / 3;

  const flatListRef = useRef<any>(null);

  const handleTabPress = useCallback((index: number, tabId: string) => {
    setActiveTab(tabId);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const newTab = viewableItems[0].item.id;
      if (newTab) {
        setActiveTab(newTab);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const pagesData = useMemo(() => [
    { id: "all", data: allItems, isLoading: colLoading, error: colError, mutate: mutateCol },
    { id: "history", data: historyItems, isLoading: hisLoading, error: hisError, mutate: mutateHis }
  ], [allItems, historyItems, colLoading, hisLoading, colError, hisError, mutateCol, mutateHis]);

  const renderItemFn = useCallback(({ item }: any) => {
     return <TabPage item={item} itemWidth={itemWidth} user={user} signInWithGoogle={signInWithGoogle} />;
  }, [itemWidth, user, signInWithGoogle]);

  return (
    <View style={styles.container}>
      {/* Header Fixed */}
      <View style={styles.headerFixed}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>
            Koleksi
          </Text>
        </View>

        {user && (
          <View style={styles.tabContainer}>
            {TABS.map((tab, index) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => handleTabPress(index, tab.id)}
                  style={styles.tabButton as any}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive] as any}>
                    {tab.label}
                  </Text>
                  {isActive && <View style={styles.activeTabIndicator as any} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Main Content Pages */}
      {authLoading ? (
         <View style={styles.scrollContent}>
           <View style={styles.gridContainer}>
             {Array.from({ length: 9 }).map((_, i) => (
               <View key={i} style={{ width: itemWidth, marginBottom: 16 } as any}>
                  <Skeleton w="100%" h={itemWidth * 1.5} r={16} style={{ marginBottom: 8 } as any} />
                  <Skeleton w="90%" h={14} r={6} style={{ marginBottom: 4 } as any} />
               </View>
             ))}
           </View>
         </View>
      ) : (
        <FlatList<any>
          ref={flatListRef}
          data={pagesData}
          keyExtractor={(item: any) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({ length: WINDOW_WIDTH, offset: WINDOW_WIDTH * index, index })}
          renderItem={renderItemFn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0812'
  },
  headerFixed: {
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: '#0a0812',
    zIndex: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 4,
  },
  tabButton: {
    position: 'relative',
    paddingVertical: 8,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -11,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#0A84FF',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  tabTextActive: {
    color: '#fff',
  },
  gridContainer: {
    flex: 1,
    paddingTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20
  },
  scrollContainer: {
    paddingBottom: 120,
    paddingTop: 16
  },
  emptyState: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconCircle: {
    width: 72,
    height: 72,
    backgroundColor: '#0A84FF',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircleDim: {
    width: 64,
    height: 64,
    backgroundColor: '#1f1c29',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  emptyDesc: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 9999,
  },
  loginText: {
    color: '#0a0812',
    fontWeight: '800',
    fontSize: 15
  },
  errorText: {
    color: '#FF453A',
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '700'
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    marginTop: 16,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  gridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  
  // Timeline History Styles
  historyItemRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineCol: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0A84FF',
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#0a0812',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
    paddingBottom: 24,
  },
  historyTimeRow: {
    marginBottom: 8,
  },
  historyTimeText: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '600',
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1825',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  historyImg: {
    width: 48,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#0a0812',
  },
  historyDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    lineHeight: 18,
  },
  historyEp: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    fontWeight: '500',
  },
  historyProgBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    width: '80%',
    marginBottom: 4,
    overflow: 'hidden',
  },
  historyProgBarFill: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 2,
  },
  historyProgText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  }
});
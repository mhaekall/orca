import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, Dimensions, StyleSheet } from "react-native";
import { Bookmark, RefreshCcw, CheckCircle2, PlayCircle, Layers } from "lucide-react-native";
import useSWR from "swr";
import { useAuth } from "../../lib/auth";
import { AnimeCard } from "../../components/AnimeCard";
import { Skeleton } from "../../components/Skeleton";

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TABS = [
  { id: "all", label: "Semua", icon: Layers },
  { id: "watching", label: "Menonton", icon: PlayCircle },
  { id: "completed", label: "Selesai", icon: CheckCircle2 }
];

export default function CollectionScreen() {
  const { user, isLoading: authLoading, signInWithGoogle } = useAuth();
  const userId = user?.id || user?.email; // fallback to email for mock user

  const [activeTab, setActiveTab] = useState("all");

  const { data: collectionResponse, isLoading: collectionLoading, error, mutate } = useSWR(
    userId ? `${API_URL}/api/v2/collection?user_id=${userId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  const rawItems = Array.isArray(collectionResponse) ? collectionResponse : (collectionResponse?.data || []);
  
  const allItems = useMemo(() => {
    return [...rawItems].map((h: any) => ({
      id: String(h.animeSlug || h.anilistId),
      title: h.cleanTitle || h.nativeTitle || h.animeTitle || `Anime #${h.animeSlug}`,
      img: h.coverImage || h.animeCover,
      totalEps: h.totalEpisodes || 0,
      status: String(h.status || "").toUpperCase(),
      progress: h.progress || 0,
      updatedAt: new Date(h.updatedAt).getTime()
    })).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [rawItems]);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return allItems;
    if (activeTab === "watching") return allItems.filter(i => i.status === "WATCHING" || i.status === "CURRENT");
    if (activeTab === "completed") return allItems.filter(i => i.status === "COMPLETED");
    return allItems;
  }, [allItems, activeTab]);

  const windowWidth = Dimensions.get('window').width;
  const padding = 20; 
  const gap = 12; 
  const itemWidth = (windowWidth - (padding * 2) - (gap * 2)) / 3;

  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerFixed}>
          <Skeleton w={140} h={32} r={8} />
        </View>
        <View style={styles.gridContainer}>
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
    <View style={styles.container}>
      {/* Header Fixed */}
      <View style={styles.headerFixed}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>
            Koleksi
          </Text>
          {allItems.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeText}>{allItems.length}</Text>
            </View>
          )}
        </View>

        {user && allItems.length > 0 && (
          <View style={styles.tabContainer}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                >
                  <Icon size={14} color={isActive ? "#0a0812" : "#8e8e93"} style={{ marginRight: 6 }} />
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
      >
        {!user ? (
          <View style={styles.emptyState}>
            <View style={styles.iconCircle}>
              <Bookmark size={36} color="white" />
            </View>
            <Text style={styles.emptyTitle}>Koleksi Kosong</Text>
            <Text style={styles.emptyDesc}>
              Masuk untuk menyimpan dan menyinkronkan anime favorit Anda di semua perangkat.
            </Text>
            <Pressable 
              onPress={signInWithGoogle}
              style={styles.loginButton as any}
            >
              <Text style={styles.loginText}>Lanjutkan dengan Google</Text>
            </Pressable>
          </View>
        ) : collectionLoading ? (
          <View style={styles.gridList}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={{ width: itemWidth, marginBottom: 16 }}>
                 <Skeleton w="100%" h={itemWidth * 1.5} r={16} style={{ marginBottom: 8 }} />
                 <Skeleton w="90%" h={14} r={6} style={{ marginBottom: 4 }} />
                 <Skeleton w="60%" h={14} r={6} />
              </View>
            ))}
          </View>
        ) : error ? (
           <View style={styles.emptyState}>
            <Text style={styles.errorText}>Koneksi Terputus</Text>
            <Text style={styles.emptyDesc}>Gagal memuat data koleksi dari server.</Text>
            <Pressable onPress={() => mutate()} style={styles.retryButton}>
              <RefreshCcw size={14} color="white" />
              <Text style={styles.retryText}>Muat Ulang</Text>
            </Pressable>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.iconCircleDim}>
              <Bookmark size={32} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={styles.emptyTitle}>Tidak Ada Anime</Text>
            <Text style={styles.emptyDesc}>
              {activeTab === "all" ? "Anda belum menyimpan anime apa pun ke dalam koleksi." : `Tidak ada anime dengan status ${TABS.find(t=>t.id === activeTab)?.label}.`}
            </Text>
          </View>
        ) : (
          <View style={styles.gridList}>
            {filteredItems.map((item) => {
              const pct = item.totalEps > 0 ? Math.min(100, Math.max(0, (item.progress / item.totalEps) * 100)) : 0;
              const isComp = item.status === "COMPLETED";
              return (
                <View key={item.id} style={{ width: itemWidth }}>
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
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0812'
  },
  headerFixed: {
    paddingTop: 64,
    paddingBottom: 16,
    backgroundColor: '#0a0812',
    zIndex: 10,
    paddingHorizontal: 20
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.5,
  },
  badgeCount: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)'
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1c29',
    padding: 4,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8e8e93',
  },
  tabTextActive: {
    color: '#0a0812',
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 20,
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
    paddingVertical: 80,
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
    width: 72,
    height: 72,
    backgroundColor: '#1f1c29',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyTitle: {
    color: 'white',
    fontWeight: '800',
    fontSize: 22,
    marginBottom: 12,
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
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginText: {
    color: '#0a0812',
    fontWeight: '800',
    fontSize: 15
  },
  errorText: {
    color: '#FF453A',
    fontSize: 18,
    marginBottom: 8,
    fontWeight: '800'
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  retryText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14
  },
  gridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  }
});
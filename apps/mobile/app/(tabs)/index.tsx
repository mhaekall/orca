import React from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar as RNStatusBar,
  Platform,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { Link, useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import useSWR, { mutate } from "swr";
import { Search, Play, Bell, TrendingUp, Flame, Film, Tv, Eye, Star, ChevronRight } from "lucide-react-native";
import { LatestGrid } from "../../components/LatestGrid";
import { 
  LoadingState, 
  HeroCard, 
  SpotlightRow, 
  WideRow, 
  VertRow, 
  WatchHistoryRow, 
  SecHeader 
} from "../../components/HomeSections";
import { useAuth } from "../../lib/auth";
import { hasEps } from "../../lib/utils";
import { Theme } from "../../lib/theme";

const { width: W, height: H } = Dimensions.get("window");
import { API_URL, HF_API_URL } from "../../lib/config";
const API = API_URL;
import { fetcher } from "../../lib/fetcher";

const BG = Theme.colors.background;
const FONT_BOLD = Theme.typography.weights.bold;

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || user?.email;

  const { data, isLoading, isValidating, error, mutate } = useSWR(`${API}/api/v2/home?v=3`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const { data: historyRes, mutate: mutateHistory } = useSWR(
    userId ? `${HF_API_URL}/api/v2/social/progress?user_id=${userId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  useFocusEffect(
    React.useCallback(() => {
      if (userId) mutateHistory();
    }, [userId, mutateHistory])
  );
  
  const historyItems = React.useMemo(() => {
    const raw = Array.isArray(historyRes) ? historyRes : [];
    const grouped = new Map();
    raw.forEach((item: any) => {
      const id = String(item.anilistId || item.animeSlug);
      const existing = grouped.get(id);
      if (!existing || new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        grouped.set(id, item);
      }
    });
    return Array.from(grouped.values()).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [historyRes]);

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerBg = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: ["rgba(10, 8, 18, 0)", "rgba(10, 8, 18, 1)"], // from transparent to solid #0a0812
    extrapolate: "clamp",
  });

  const d = data?.data || {};
  const latest: any[] = (d.latest || []).filter(hasEps);
  const airing: any[] = (d.airing || []).filter(hasEps);
  const popular: any[] = (d.popular || []).filter(hasEps);
  const topRated: any[] = (d.top_rated || []).filter(hasEps);
  const completed: any[] = (d.completed || []).filter(hasEps);
  const movies: any[] = (d.movies || []).filter(hasEps);

  const hero = airing[0] || latest[0];

  const trendMap = new Map();
  [...popular, ...topRated].forEach((i) => { const k = String(i.anilistId || i.id); if (!trendMap.has(k)) trendMap.set(k, i); });
  const trending = Array.from(trendMap.values());

  const ongoingMap = new Map();
  [...latest, ...airing].forEach((i) => { const k = String(i.anilistId || i.id); if (!ongoingMap.has(k)) ongoingMap.set(k, i); });
  const ongoing = Array.from(ongoingMap.values());

  const isError = error || (!isLoading && !d.latest && !d.airing && !d.popular);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />

      {/* Fixed header with Search Bar integrated */}
      <Animated.View style={[s.header, { backgroundColor: headerBg }]}>
        <Text style={s.logo}>orca</Text>
        
        {/* Search integrated into header */}
        <Pressable onPress={() => router.push("/explore" as any)} style={s.search}>
          <Search size={16} color="rgba(255,255,255,0.4)" />
          <Text style={s.searchText}>Cari anime...</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/notifications" as any)} style={s.bellBtn}>
          <Bell size={21} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </Animated.View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,59,48,0.1)", justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
            <Tv size={28} color="#FF3B30" />
          </View>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>Gagal Memuat Beranda</Text>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Terjadi kesalahan saat mengambil data dari server. Silakan coba lagi.</Text>
          <Pressable 
            onPress={() => mutate()} 
            style={{ backgroundColor: "#0A84FF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <RefreshControl refreshing={isValidating} tintColor="transparent" style={{ display: 'none' }} />
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isValidating && !!data}
              onRefresh={() => mutate()}
              tintColor="#fff"
              colors={["#0A84FF"]}
              progressViewOffset={80}
            />
          }
        >
          {/* Hero (Full Width, fills top edge) */}
          {hero && (
            <View style={{ marginBottom: 16 }}>
              <HeroCard item={hero} />
            </View>
          )}

          {/* Riwayat Ditonton (Watch History) */}
          <WatchHistoryRow items={historyItems} />

          {/* Sedang Tayang — Grid 3x3 */}
          {ongoing.length > 0 && (
            <LatestGrid title="" items={ongoing} badge="NEW" />
          )}

          {/* Trending & Populer — Spotlight */}
          {trending.length >= 3 && (
            <View style={{ marginBottom: 32 }}>
              <SecHeader label="Trending & Populer" />
              <SpotlightRow items={trending} />
            </View>
          )}

          {/* Top Rated — Vertical slightly wider */}
          {topRated.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <SecHeader label="Skor Tertinggi" />
              <VertRow items={topRated} cw={120} ch={172} />
            </View>
          )}

          {/* Film — Wide */}
          {movies.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <SecHeader label="Film Anime" />
              <WideRow items={movies} />
            </View>
          )}

          {/* Tamat — Vertical compact */}
          {completed.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <SecHeader label="Sudah Tamat" />
              <VertRow items={completed} cw={100} ch={144} />
            </View>
          )}
        </Animated.ScrollView>
      )}
    </View>
  );
}

const paddingTopSafe = Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 50;

const s = StyleSheet.create({
  header: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: paddingTopSafe + 10, paddingBottom: 16,
  },
  logo: { fontSize: 24, fontWeight: FONT_BOLD, color: "#fff", letterSpacing: -0.5 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  search: {
    flex: 1,
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, gap: 8,
  },
  searchText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "400" },
});
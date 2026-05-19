import React from "react";
import {
  View,
  Text,
  RefreshControl,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import useSWR from "swr";
import { Tv } from "lucide-react-native";
import { LatestGrid } from "../LatestGrid";
import { HeroCard } from "./sections/HeroCard";
import { SpotlightRow } from "./sections/SpotlightRow";
import { WideRow } from "./sections/WideRow";
import { VertRow } from "./sections/VertRow";
import { WatchHistoryRow } from "./sections/WatchHistoryRow";
import { SecHeader } from "../ui/SecHeader";
import { LoadingState } from "../ui/LoadingState";
import { useMediaHistory } from "../../lib/hooks/useMediaHistory";
import { hasEps } from "../../lib/utils";
import { Theme } from "../../lib/theme";
import { API_URL, HF_API_URL } from "../../lib/config";
import { fetcher } from "../../lib/fetcher";

interface HomeContentProps {
  scrollY: Animated.Value;
  mediaType: 'anime' | 'manga';
}

export function HomeContent({ scrollY, mediaType }: HomeContentProps) {
  const { animeHistory, mangaHistory } = useMediaHistory();
  const historyItems = mediaType === 'anime' ? animeHistory : mangaHistory;

  // Endpoint switching
  const endpoint = mediaType === 'anime' 
    ? `${API_URL}/api/v2/home?v=3` 
    : `${API_URL}/api/v2/manga/home?_cb=2`;

  const { data: swrData, isLoading, isValidating, error, mutate } = useSWR(endpoint, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const d = swrData?.data || {};

  // Data Mapping for Universal Slots
  const mappedData = React.useMemo(() => {
    if (mediaType === 'anime') {
      const latest = (d.latest || []).filter(hasEps);
      const airing = (d.airing || []).filter(hasEps);
      const popular = (d.popular || []).filter(hasEps);
      const topRated = (d.top_rated || []).filter(hasEps);
      const movies = (d.movies || []).filter(hasEps);
      const completed = (d.completed || []).filter(hasEps);

      const hero = airing[0] || latest[0];
      const trending = (d.popular || []).slice(0, 10);
      
      const ongoingItems = Array.from([...latest, ...airing].reduce((m, i) => { 
        const k = String(i.anilistId || i.id); 
        if (!m.has(k)) m.set(k, i); 
        return m; 
      }, new Map()).values());

      // Ensure Slot 6 is filled (if movies are few, add popular)
      const wRowItems = movies.length >= 3 ? movies : [...movies, ...popular.slice(10, 15)].slice(0, 5);

      return {
        hero,
        ongoing: ongoingItems,
        trending,
        vRow1: { label: "Skor Tertinggi", items: topRated },
        wRow: { label: "Film Anime", items: wRowItems },
        vRow2: { label: "Sudah Tamat", items: completed },
      };
    } else {
      // Manga Mapping - ABSOLUTE SYMMETRY
      const trending = d.trending || [];
      const latest = d.latest || [];
      const popular = d.popular || [];

      return {
        hero: trending[0] || popular[0] || latest[0],
        ongoing: latest.slice(0, 12), 
        trending: trending.slice(1, 11),
        vRow1: { label: "Skor Tertinggi", items: popular.slice(0, 12) },
        wRow: { label: "Komik Populer", items: popular.slice(12, 17) }, 
        vRow2: { label: "Sudah Tamat", items: popular.filter((m: any) => m.status === 'Completed' || m.status === 'Finished').length > 0 ? popular.filter((m: any) => m.status === 'Completed' || m.status === 'Finished') : latest.slice(12, 25) },
      };
    }
  }, [d, mediaType]);

  const isError = error || (!isLoading && Object.keys(d).length === 0);

  // FIX FLICKER: Only show LoadingState if we truly have NO data. 
  // If we have data in cache (from SWR Persistent Cache), stay on the UI while validating.
  if (isLoading && !swrData) return <LoadingState />;

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconBox}>
          <Tv size={28} color="#FF3B30" />
        </View>
        <Text style={styles.errorTitle}>Gagal Memuat Konten</Text>
        <Text style={styles.errorDesc}>Terjadi kesalahan saat mengambil data dari server.</Text>
        <Pressable onPress={() => mutate()} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Coba Lagi</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Theme.layout.listPaddingBottom, paddingTop: 0 }}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={isValidating && !!swrData}
          onRefresh={() => mutate()}
          tintColor="#fff"
          colors={[Theme.colors.primary]}
          progressViewOffset={Theme.layout.paddingTopSafe + 60}
        />
      }
    >
      {/* Slot 1: Hero (Full Width) */}
      {mappedData.hero && (
        <View style={{ marginBottom: 16 }}>
          <HeroCard item={mappedData.hero} mediaType={mediaType} />
        </View>
      )}

      {/* Slot 2: Watch/Read History */}
      <WatchHistoryRow items={historyItems} mediaType={mediaType} />

      {/* Slot 3: Latest Grid (3x3) */}
      {mappedData.ongoing.length > 0 && (
        <LatestGrid 
          title="" 
          items={mappedData.ongoing} 
          badge={mediaType === 'manga' ? "UPDATE" : "NEW"} 
          mediaType={mediaType} 
        />
      )}

      {/* Slot 4: Spotlight (Trending) */}
      {mappedData.trending.length >= 3 && (
        <View style={{ marginBottom: 32 }}>
          <SecHeader label={mediaType === 'manga' ? "Sedang Hangat" : "Trending & Populer"} />
          <SpotlightRow items={mappedData.trending} mediaType={mediaType} />
        </View>
      )}

      {/* Slot 5: Vertical Wide (Top Rated / Popular) */}
      {mappedData.vRow1.items.length > 0 && (
        <View style={{ marginBottom: 32 }}>
          <SecHeader label={mappedData.vRow1.label} />
          <VertRow items={mappedData.vRow1.items} cw={120} ch={172} mediaType={mediaType} />
        </View>
      )}

      {/* Slot 6: Wide Row (Movies / Recommendations) */}
      {mappedData.wRow.items.length > 0 && (
        <View style={{ marginBottom: 32 }}>
          <SecHeader label={mappedData.wRow.label} />
          <WideRow items={mappedData.wRow.items} mediaType={mediaType} />
        </View>
      )}

      {/* Slot 7: Vertical Compact (Completed / New) */}
      {mappedData.vRow2.items.length > 0 && (
        <View style={{ marginBottom: 32 }}>
          <SecHeader label={mappedData.vRow2.label} />
          <VertRow items={mappedData.vRow2.items} cw={100} ch={144} mediaType={mediaType} />
        </View>
      )}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: Theme.layout.paddingTopSafe + 100
  },
  errorIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,59,48,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
  },
  errorTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center"
  },
  errorDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24
  },
  retryBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700"
  },
});

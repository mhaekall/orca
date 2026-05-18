import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Share, StyleSheet, Platform, Animated, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import useSWR from 'swr';
import { ArrowLeft, Search, Bell } from 'lucide-react-native';

import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../lib/auth';
import { hasEps } from '../../lib/utils';
import { API_URL, HF_API_URL } from "../../lib/config";
import { fetcher, fetchWithAuth } from "../../lib/fetcher";

import { AnimeHero } from '../../components/anime-detail/AnimeHero';
import { AnimeMetadata } from '../../components/anime-detail/AnimeMetadata';
import { AnimeSynopsis } from '../../components/anime-detail/AnimeSynopsis';
import { AnimeEpisodes } from '../../components/anime-detail/AnimeEpisodes';
import { AnimeRecommendations } from '../../components/anime-detail/AnimeRecommendations';

const paddingTopSafe = Platform.OS === "android" ? 30 : 50;

export default function AnimeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || user?.email;

  const [isToggling, setIsToggling] = useState(false);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Use opacity for performance (Hardware Accelerated) instead of background color interpolation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const { data, isLoading, error } = useSWR(
    `${HF_API_URL}/api/v2/anime/${id}?_cb=5`,
    fetcher
  );

  const { data: epsData } = useSWR(
    `${API_URL}/api/v2/anime/${id}/episodes`,
    fetcher
  );

  const { data: collectionResponse, mutate: mutateCollection } = useSWR(
    userId ? `${HF_API_URL}/api/v2/collection?user_id=${userId}` : null,
    fetcher
  );

  const { data: progressData } = useSWR(
    userId ? `${HF_API_URL}/api/v2/social/progress?user_id=${userId}` : null,
    fetcher
  );

  const rawItems = Array.isArray(collectionResponse) ? collectionResponse : (collectionResponse?.data || []);
  const isSaved = rawItems.some((h: any) => String(h.animeSlug || h.anilistId) === String(id));

  const watchHistoryRaw = Array.isArray(progressData) ? progressData : (progressData?.data || []);
  const animeHistory = watchHistoryRaw.filter((h: any) => String(h.animeSlug) === String(id));

  const d = data?.data ? { ...data.data } : undefined;
  if (d) {
    d.recommendations = (d.recommendations || []).filter(hasEps);
    d.relations = (d.relations || []).filter(hasEps);
  }

  const apiEps = Array.isArray(epsData) ? epsData : (epsData?.data || []);
  const rawEps = apiEps.length > 0 ? apiEps : (d?.episodes || []);

  const toggleCollection = useCallback(async () => {
    if (!user) {
      Alert.alert("Login Dibutuhkan", "Silakan login di tab Koleksi untuk menyimpan anime.");
      return;
    }
    
    setIsToggling(true);
    try {
      let res;
      if (isSaved) {
        res = await fetchWithAuth(`${HF_API_URL}/api/v2/collection?user_id=${userId}&anilistId=${id}`, { method: "DELETE" });
      } else {
        const payload = {
          user_id: userId,
          anilistId: String(id),
          status: "plan_to_watch",
          progress: 0
        };
        res = await fetchWithAuth(`${HF_API_URL}/api/v2/collection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API Error: ${res.status} - ${errorText}`);
      }
      
      await mutateCollection();
    } catch (e: any) {
      Alert.alert("Gagal", `Terjadi kesalahan saat menyimpan koleksi: ${e.message || 'Unknown error'}`);
      console.error(e);
    } finally {
      setIsToggling(false);
    }
  }, [user, isSaved, userId, id, mutateCollection]);

  const handleShare = useCallback(async () => {
    if (!d) return;
    const shareTitle = d.cleanTitle || d.nativeTitle || d.title?.english || d.title?.romaji || d.title || 'Anime';
    try {
      await Share.share({
        message: `Nonton ${shareTitle} di Orca Anime!`,
        url: `https://orca-anime.com/anime/${id}`,
        title: shareTitle,
      });
    } catch (error) {
      console.error(error);
    }
  }, [d, id]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.heroLoading}>
           <Skeleton w="100%" h="100%" r={0} />
        </View>
        <View style={styles.contentLoading}>
          {/* Hero Content (Badge & Title) */}
          <Skeleton w={100} h={24} r={12} style={{ marginBottom: 12 }} />
          <Skeleton w="85%" h={32} r={8} style={{ marginBottom: 8 }} />
          <Skeleton w="50%" h={32} r={8} style={{ marginBottom: 24 }} />
          
          {/* Actions / Meta */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
             <Skeleton w={40} h={40} r={20} />
             <Skeleton w={40} h={40} r={20} />
             <Skeleton w={40} h={40} r={20} />
          </View>

          {/* Synopsis */}
          <Skeleton w={80} h={20} r={8} style={{ marginBottom: 16 }} />
          <Skeleton w="100%" h={14} r={6} style={{ marginBottom: 8 }} />
          <Skeleton w="90%" h={14} r={6} style={{ marginBottom: 8 }} />
          <Skeleton w="95%" h={14} r={6} style={{ marginBottom: 8 }} />
          <Skeleton w="60%" h={14} r={6} style={{ marginBottom: 32 }} />

          {/* Episodes Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
             <Skeleton w={120} h={20} r={8} />
             <Skeleton w={60} h={20} r={8} />
          </View>

          {/* Episodes List items */}
          <Skeleton w="100%" h={64} r={12} style={{ marginBottom: 12 }} />
          <Skeleton w="100%" h={64} r={12} style={{ marginBottom: 12 }} />
          <Skeleton w="100%" h={64} r={12} style={{ marginBottom: 12 }} />
        </View>
      </View>
    );
  }

  if (error || !d) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Gagal memuat data anime.</Text>
        <Pressable onPress={() => router.back()} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Top Bar Floating */}
      <View style={styles.headerContainer}>
        <Animated.View style={[styles.headerBackground, { opacity: headerOpacity }]} />
        <View style={styles.headerIconsRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="white" size={24} />
          </Pressable>
          
          <Pressable onPress={() => router.push("/explore" as any)} style={styles.search}>
            <Search size={16} color="rgba(255,255,255,0.4)" />
            <Text style={styles.searchText}>Cari anime...</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/notifications" as any)} style={styles.bellBtn}>
            <Bell size={21} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
      </View>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        bounces={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <AnimeHero 
          anime={d}
          isSaved={isSaved}
          isToggling={isToggling}
          onToggleCollection={toggleCollection}
          onShare={handleShare}
          history={animeHistory}
          rawEps={rawEps}
        />

        <View style={styles.contentSection}>
          <AnimeMetadata anime={d} epsCount={rawEps.length} />
          <AnimeSynopsis synopsis={d.synopsis} />
          <AnimeEpisodes animeId={id as string} rawEps={rawEps} history={animeHistory} />
          <AnimeRecommendations relations={d.relations} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0812',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0a0812',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 18,
  },
  errorButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9999,
  },
  errorButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  heroLoading: {
    width: '100%',
    height: 450,
    position: 'relative',
    backgroundColor: '#0a0812',
  },
  contentLoading: {
    paddingHorizontal: 20,
    marginTop: -100,
    position: 'relative',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0812',
  },
  headerIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: paddingTopSafe + 10,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  searchText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: '400',
  },
  contentSection: {
    paddingHorizontal: 20,
    marginTop: 0,
    position: 'relative',
    zIndex: 10,
  },
});

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Alert, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import useSWR from 'swr';
import { ArrowLeft, Search, Bell } from 'lucide-react-native';

import { Skeleton } from '../Skeleton';
import { useAuth } from '../../lib/auth';
import { HF_API_URL } from "../../lib/config";
import { fetchWithAuth, fetcher } from "../../lib/fetcher";
import { useMediaDetail } from '../../lib/hooks/useMediaDetail';
import { Theme } from '../../lib/theme';

import { DetailHero } from './sections/DetailHero';
import { DetailMetadata } from './sections/DetailMetadata';
import { DetailSynopsis } from './sections/DetailSynopsis';
import { DetailRecommendations } from './sections/DetailRecommendations';
import { MediaEpisodes } from './sections/MediaEpisodes';

interface MediaDetailTemplateProps {
  id: string;
  mediaType: 'anime' | 'manga';
}

export function MediaDetailTemplate({ id, mediaType }: MediaDetailTemplateProps) {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || user?.email;

  const [isToggling, setIsToggling] = useState(false);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const { data: d, isLoading, error, mutate } = useMediaDetail(id, mediaType);

  const { data: collectionResponse, mutate: mutateCollection } = useSWR(
    userId ? `${HF_API_URL}/api/v2/collection?user_id=${userId}` : null,
    fetcher
  );

  const { data: progressData } = useSWR(
    userId ? `${HF_API_URL}/api/v2/social/progress?user_id=${userId}` : null,
    fetcher
  );

  const rawItems = Array.isArray(collectionResponse) ? collectionResponse : (collectionResponse?.data || []);
  const isSaved = rawItems.some((h: any) => String(h.anilist_id || h.animeSlug || h.anilistId) === String(id));

  const watchHistoryRaw = Array.isArray(progressData) ? progressData : (progressData?.data || []);
  const mediaHistory = watchHistoryRaw.filter((h: any) => String(h.anilist_id || h.animeSlug) === String(id));
  const lastEp = mediaHistory.length > 0 ? mediaHistory[0].episode : undefined;

  const toggleCollection = useCallback(async () => {
    if (!user) {
      Alert.alert("Login Dibutuhkan", "Silakan login untuk menyimpan koleksi.");
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
          progress: 0,
          title: d?.title,
          img: d?.imageUrl,
          mediaType: mediaType
        };
        res = await fetchWithAuth(`${HF_API_URL}/api/v2/collection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      
      if (!res.ok) throw new Error("API Error");
      await mutateCollection();
    } catch (e) {
      Alert.alert("Gagal", "Terjadi kesalahan saat menyimpan koleksi.");
    } finally {
      setIsToggling(false);
    }
  }, [user, isSaved, userId, id, mutateCollection]);

  const handleShare = () => {
    // Basic share implementation
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.heroLoading}><Skeleton w="100%" h="100%" r={0} /></View>
        <View style={styles.contentLoading}>
          <Skeleton w={100} h={24} r={12} style={{ marginBottom: 12 }} />
          <Skeleton w="85%" h={32} r={8} style={{ marginBottom: 32 }} />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
             <Skeleton w={40} h={40} r={20} />
             <Skeleton w={40} h={40} r={20} />
             <Skeleton w={40} h={40} r={20} />
          </View>
        </View>
      </View>
    );
  }

  if (error || !d) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Gagal memuat data.</Text>
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
            <Text style={styles.searchText}>Cari...</Text>
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
        <DetailHero 
          media={d}
          mediaType={mediaType}
          isSaved={isSaved}
          isToggling={isToggling}
          onToggleCollection={toggleCollection}
          onShare={handleShare}
          lastWatchedEp={lastEp}
        />

        <View style={styles.contentSection}>
          <DetailMetadata media={d} />
          <DetailSynopsis synopsis={d.synopsis} />
          
          {/* List Episode/Chapter (Unified Rendering) */}
          <MediaEpisodes 
            mediaId={id} 
            mediaType={mediaType}
            rawEps={d.episodes}
            title={d.title}
            img={d.imageUrl} 
          />
          
          <DetailRecommendations relations={d.relations} mediaType={mediaType} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0812' },
  errorContainer: { flex: 1, backgroundColor: '#0a0812', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: 'white', fontSize: 18 },
  errorButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999 },
  errorButtonText: { color: 'white', fontWeight: '600' },
  heroLoading: { width: '100%', height: 450, backgroundColor: '#0a0812' },
  contentLoading: { paddingHorizontal: 20, marginTop: -100 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerContainer: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100 },
  headerBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0812' },
  headerIconsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Theme.layout.paddingTopSafe + 10, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  search: { flex: 1, flexDirection: "row", alignItems: "center", marginHorizontal: 12, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  searchText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: '400' },
  contentSection: { paddingHorizontal: 20, marginTop: 0, position: 'relative', zIndex: 10 },
});

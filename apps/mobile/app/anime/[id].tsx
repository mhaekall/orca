import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Share, StyleSheet, Dimensions, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Link } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import useSWR from 'swr';
import { Play, Bookmark, Share as ShareIcon, Star, ArrowLeft, Eye, Clock, Calendar, Check, Info, Search, Bell, Forward } from 'lucide-react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../lib/auth';
import { Alert } from 'react-native';

const { width: W } = Dimensions.get('window');
const paddingTopSafe = Platform.OS === "android" ? 30 : 50;
const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatSynopsis(text: string) {
  if (!text) return "Sinopsis belum tersedia.";
  let clean = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " ").trim();
  const sourceIndex = clean.search(/\(?\[?(Sumber|Source|Written by)\s*:/i);
  if (sourceIndex !== -1) {
    clean = clean.substring(0, sourceIndex).trim();
  }
  clean = clean.replace(/\n{3,}/g, '\n\n');
  clean = clean.replace(/ {2,}/g, ' ');
  return clean;
}

function formatViews(v: number): string {
  if (!v) return '0';
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toString();
}

export default function AnimeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || user?.email;

  const [isExpanded, setIsExpanded] = useState(false);
  const [epChunkIndex, setEpChunkIndex] = useState(0);
  const [isToggling, setIsToggling] = useState(false);

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerBg = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: ["rgba(10, 8, 18, 0)", "rgba(10, 8, 18, 1)"],
    extrapolate: "clamp",
  });

  const { data, isLoading, error } = useSWR(
    `${API_URL}/api/v2/anime/${id}`,
    fetcher
  );

  const { data: epsData } = useSWR(
    `${API_URL}/api/v2/anime/${id}/episodes`,
    fetcher
  );

  const { data: collectionResponse, mutate: mutateCollection } = useSWR(
    userId ? `${API_URL}/api/v2/collection?user_id=${userId}` : null,
    fetcher
  );

  const rawItems = Array.isArray(collectionResponse) ? collectionResponse : (collectionResponse?.data || []);
  const isSaved = rawItems.some((h: any) => String(h.animeSlug || h.anilistId) === String(id));

  const d = data?.data;

  const toggleCollection = async () => {
    if (!user) {
      Alert.alert("Login Dibutuhkan", "Silakan login di tab Koleksi untuk menyimpan anime.");
      return;
    }
    
    setIsToggling(true);
    try {
      if (isSaved) {
        await fetch(`${API_URL}/api/v2/collection?user_id=${userId}&anilistId=${id}`, { method: "DELETE" });
      } else {
        const payload = {
          user_id: userId,
          anilistId: String(id),
          status: "plan_to_watch",
          progress: 0
        };
        await fetch(`${API_URL}/api/v2/collection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      await mutateCollection();
    } catch (e) {
      Alert.alert("Gagal", "Terjadi kesalahan saat menyimpan koleksi.");
      console.error(e);
    } finally {
      setIsToggling(false);
    }
  };

  const handleShare = async () => {
    if (!d) return;
    try {
      await Share.share({
        message: `Nonton ${d.title?.english || d.title?.romaji || d.title} di Orca Anime!`,
        url: `https://orca-anime.com/anime/${id}`,
        title: d.title?.english || d.title?.romaji || d.title,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.heroLoading}>
           <Skeleton w="100%" h="100%" r={0} />
           <LinearGradient colors={['transparent', '#0a0812']} style={styles.heroGradientBottom} />
        </View>
        <View style={styles.contentLoading}>
          <Skeleton w={100} h={20} r={10} style={{ marginBottom: 12 }} />
          <Skeleton w={W - 60} h={36} r={12} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
             <Skeleton w={60} h={24} r={12} />
             <Skeleton w={60} h={24} r={12} />
             <Skeleton w={80} h={24} r={12} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
            <Skeleton w="75%" h={56} r={28} />
            <Skeleton w="20%" h={56} r={28} />
          </View>
          <Skeleton w={80} h={24} r={8} style={{ marginBottom: 16 }} />
          <Skeleton w="100%" h={16} r={6} style={{ marginBottom: 8 }} />
          <Skeleton w="95%" h={16} r={6} style={{ marginBottom: 8 }} />
          <Skeleton w="80%" h={16} r={6} style={{ marginBottom: 8 }} />
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

  const desc = formatSynopsis(d.synopsis || "");
  const apiEps = Array.isArray(epsData) ? epsData : (epsData?.data || []);
  const eps = apiEps.length > 0 ? apiEps : (d.episodes || []);
  const realViews = d.views || d.popularity || 0;
  
  let scheduleDay = d.airSchedule;
  if (!scheduleDay && d.nextAiringEpisode?.airingAt) {
    const dt = new Date(d.nextAiringEpisode.airingAt * 1000);
    const daysArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    scheduleDay = daysArr[dt.getDay()];
  }

  const firstEp = eps.length > 0 ? (eps[0].number || eps[0].url?.split("episode=").pop() || "1") : null;
  const isFinished = d.status === "FINISHED";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Top Bar Floating */}
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
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
      </Animated.View>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView as any} 
        contentContainerStyle={styles.scrollContent as any} 
        bounces={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={styles.heroSection as any}>
          <Image
            source={{ uri: typeof d.coverImage === 'string' ? d.coverImage : (d.coverImage?.extraLarge || d.coverImage?.large || d.bannerImage || d.poster || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg") }}
            style={styles.heroImage as any}
            contentFit="cover"
            transition={300}
          />
          
          <LinearGradient
            colors={["rgba(10,8,18,0.4)", "transparent", "rgba(10,8,18,0.7)", "#0a0812"]}
            locations={[0, 0.3, 0.7, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.heroBottom}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", width: "100%" }}>
               <View style={{ flex: 1, paddingRight: 16 }}>
                  {/* Premium Abstract Calligraphy Badge (Edge & Larger) */}
                  <View style={{ alignSelf: 'flex-start', marginBottom: 12, marginLeft: -20, position: 'relative' }}>
                    {/* Background shape */}
                    <View style={{
                      position: 'absolute',
                      top: 16, bottom: 4, left: 0, right: 20,
                      backgroundColor: isFinished ? '#30D158' : scheduleDay ? '#FFD60A' : '#0A84FF', 
                      transform: [{ rotate: '-3deg' }, { skewX: '-12deg' }],
                      borderTopRightRadius: 4, borderBottomRightRadius: 16,
                      shadowColor: isFinished ? '#30D158' : scheduleDay ? '#FFD60A' : '#0A84FF', shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
                    }} />
                    
                    {/* Text on top */}
                    <Text style={{
                      color: '#fff', fontSize: 24, 
                      paddingHorizontal: 22, paddingVertical: 8,
                      fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive',
                      fontWeight: 'bold', fontStyle: 'italic',
                      textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
                    }}>
                      {isFinished ? 'Tamat' : scheduleDay ? `Tiap ${scheduleDay}` : 'Sedang Tayang'}
                    </Text>
                  </View>

                  <Text style={{ color: "#fff", fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: d.nativeTitle && d.nativeTitle !== d.cleanTitle ? 4 : 8, lineHeight: 28 }} numberOfLines={2}>
                    {d.cleanTitle || d.nativeTitle || d.title?.english || d.title?.romaji || d.title}
                  </Text>
                  
                  {d.nativeTitle && d.nativeTitle !== d.cleanTitle && (
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: 8 }} numberOfLines={1}>
                      {d.nativeTitle}
                    </Text>
                  )}
                  
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <View style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: 'bold' }}>
                        {isFinished ? 'TAMAT' : 'ONGOING'}
                      </Text>
                    </View>
                  </View>
               </View>

               <View style={{ gap: 12, alignItems: 'center', paddingBottom: 4 }}>
                  <Pressable 
                     onPress={handleShare}
                     style={({pressed}) => [
                       styles.bookmarkCircle, 
                       pressed && { opacity: 0.8, transform: [{scale: 0.95}] }
                     ] as any} 
                   >
                     <Forward color="white" size={16} />
                  </Pressable>

                  <Pressable 
                     onPress={toggleCollection}
                     disabled={isToggling}
                     style={({pressed}) => [
                       styles.bookmarkCircle, 
                       isToggling && { opacity: 0.5 },
                       pressed && !isToggling && { opacity: 0.8, transform: [{scale: 0.95}] }
                     ] as any} 
                   >
                    {isToggling ? (
                      <ActivityIndicator size="small" color="#e5e5ea" />
                    ) : isSaved ? (
                      <Bookmark color="#0A84FF" fill="#0A84FF" size={16} />
                    ) : (
                      <Bookmark color="#e5e5ea" size={16} />
                    )}
                  </Pressable>

                 {firstEp && (
                   <Pressable 
                     onPress={() => router.push(`/watch/${id}/${firstEp}` as any)}
                     style={styles.heroPlayBtn}
                   >
                     <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                   </Pressable>
                 )}
               </View>
            </View>
          </View>
        </View>

        <View style={styles.contentSection}>
          {/* Title Area */}
          <View style={styles.titleArea}>
            {/* Rich Metadata Strip */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metaStrip}>
              {d.score > 0 && (
                <View style={styles.metaPill}>
                  <Star color="#FFD60A" fill="#FFD60A" size={12} />
                  <Text style={styles.metaPillText}>{(d.score / 10).toFixed(1)}</Text>
                </View>
              )}
              {realViews > 0 && (
                <View style={styles.metaPill}>
                  <Eye color="rgba(255,255,255,0.6)" size={12} />
                  <Text style={[styles.metaPillText, { color: 'rgba(255,255,255,0.8)' }]}>{formatViews(realViews)}</Text>
                </View>
              )}
              {d.trending > 0 && (
                <View style={styles.metaPill}>
                  <Text style={{ fontSize: 11, marginRight: 4 }}>🔥</Text>
                  <Text style={[styles.metaPillText, { color: 'rgba(255,255,255,0.8)' }]}>Trending #{d.trending}</Text>
                </View>
              )}
              {d.popularity > 0 && (
                <View style={styles.metaPill}>
                  <Text style={[styles.metaPillText, { color: 'rgba(255,255,255,0.8)' }]}>Top #{d.popularity}</Text>
                </View>
              )}
              <View style={styles.metaPill}>
                <Info color="rgba(255,255,255,0.6)" size={12} />
                <Text style={[styles.metaPillText, { color: 'rgba(255,255,255,0.8)' }]}>Eps {d.totalEpisodes || eps.length || '?'}</Text>
              </View>
              {d.season && d.seasonYear && (
                <View style={styles.metaPill}>
                  <Text style={[styles.metaPillText, { color: 'rgba(255,255,255,0.8)', textTransform: 'capitalize' }]}>{d.season.toLowerCase()} {d.seasonYear}</Text>
                </View>
              )}
              {d.studios?.[0] && (
                <View style={styles.metaPill}>
                  <Text style={[styles.metaPillText, { color: 'rgba(255,255,255,0.8)' }]}>{d.studios[0]}</Text>
                </View>
              )}
            </ScrollView>
            
            {/* Genres */}
            {d.genres?.length > 0 && (
              <View style={styles.genresContainer}>
                {d.genres.map((g: string) => (
                  <View key={g} style={styles.genreBadge}>
                    <Text style={styles.genreText}>{g}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Synopsis */}
          <View style={styles.synopsisSection}>
            <Text style={styles.sectionTitle}>Sinopsis</Text>
            <Text style={styles.synopsisText} onPress={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? desc : (desc.length > 130 ? `${desc.substring(0, 130).trim()}... ` : desc)}
              {!isExpanded && desc.length > 130 && (
                <Text style={styles.expandButtonText}>Baca Selengkapnya</Text>
              )}
            </Text>
            {isExpanded && (
              <Pressable onPress={() => setIsExpanded(false)} style={styles.expandButton as any}>
                <Text style={styles.expandButtonText}>Sembunyikan</Text>
              </Pressable>
            )}
          </View>

          {/* Episode List Redesigned */}
          <View style={styles.episodesSection}>
            <View style={styles.episodesHeader}>
              <Text style={styles.sectionTitle}>Daftar Episode</Text>
              <Text style={styles.episodesCountText}>{eps.length} Episode</Text>
            </View>
            
            {eps.length === 0 ? (
              <View style={styles.emptyEpisodes}>
                <Text style={styles.emptyEpisodesText}>Belum ada episode tersedia.</Text>
              </View>
            ) : (
              <View>
                {/* Chunk Filter (if more than 50 eps) */}
                {eps.length > 50 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chunkScroll} contentContainerStyle={styles.chunkScrollContent as any}>
                      {Array.from({ length: Math.ceil(eps.length / 50) }).map((_, i) => {
                        const chunk = eps.slice(i * 50, (i + 1) * 50);
                        if (chunk.length === 0) return null;
                        
                        const getNum = (e: any) => e.episodeNumber ?? e.number ?? e.url?.split("episode=").pop() ?? "?";
                        const firstNum = getNum(chunk[0]);
                        const lastNum = getNum(chunk[chunk.length - 1]);
                        
                        const label = `Eps ${lastNum} - ${firstNum}`;
                        const isActive = epChunkIndex === i;

                        return (
                          <Pressable 
                            key={i} 
                            onPress={() => setEpChunkIndex(i)}
                            style={[styles.chunkButton, isActive ? styles.chunkButtonActive : styles.chunkButtonInactive] as any}
                          >
                            <Text style={[styles.chunkButtonText, isActive ? styles.chunkTextActive : styles.chunkTextInactive] as any}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </ScrollView>
                )}
                
                {/* Elegant History-like Episode List */}
                <View style={styles.episodesList}>
                  {eps.slice(epChunkIndex * 50, (epChunkIndex + 1) * 50).map((ep: any, index: number, arr: any[]) => {
                    const epNum = ep.episodeNumber ?? ep.number ?? ep.url?.split("episode=").pop() ?? "?";
                    const epTitle = ep.episodeTitle || `Episode ${epNum}`;
                    const isLast = index === arr.length - 1;
                    const img = ep.thumbnailUrl || (typeof d.coverImage === 'string' ? d.coverImage : (d.coverImage?.extraLarge || d.coverImage?.large || d.bannerImage || d.poster || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg"));
                    return (
                      <Pressable 
                        key={index} 
                        onPress={() => router.push(`/watch/${id}/${epNum}` as any)}
                        style={[styles.historyItemRow, !isLast && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }] as any}
                      >
                        <Image source={{ uri: img }} style={styles.historyImg} contentFit="cover" />
                        <View style={styles.historyDetails}>
                          <Text style={styles.historyTitle} numberOfLines={2}>{epTitle}</Text>
                          <Text style={styles.historyEp}>Episode {epNum}</Text>
                        </View>
                        <View style={{ justifyContent: 'center' }}>
                          <View style={styles.episodePlayCircle}>
                            <Play size={12} color="#fff" style={{ marginLeft: 2 }} />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Recommendations */}
          {d.recommendations && d.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={[styles.sectionTitle, {marginBottom: 16}]}>Mungkin Anda Suka</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll} contentContainerStyle={styles.recommendationsScrollContent}>
                  {d.recommendations.map((r: any, i: number) => {
                    const recId = String(r.id || r.anilistId);
                    if (!recId) return null;
                    return (
                      <View key={i} style={styles.recommendationItem}>
                        <AnimeCard 
                          id={recId} 
                          title={r.title?.english || r.title?.romaji || r.title || ''} 
                          img={typeof r.coverImage === 'string' ? r.coverImage : (r.coverImage?.extraLarge || r.coverImage?.large || r.cover || r.poster || r.image || '')} 
                          totalEps={r.latestEpisode || r.totalEpisodes || r.episodes} 
                          variant="vertical"
                        />
                      </View>
                    );
                  })}
              </ScrollView>
            </View>
          )}

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
  heroSection: {
    width: '100%',
    aspectRatio: 3/4,
    position: 'relative',
    backgroundColor: '#0a0812',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  heroGradientTop: {
    position: 'absolute',
    width: '100%',
    height: 120,
    top: 0,
  },
  heroGradientMiddle: {
    position: 'absolute',
    width: '100%',
    height: '60%',
    bottom: 0,
  },
  heroGradientBottom: {
    position: 'absolute',
    width: '100%',
    height: 100,
    bottom: 0,
  },
  header: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: paddingTopSafe + 10, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
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
  searchText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: '400' },
  heroBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 40,
  },
  heroPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0A84FF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#0A84FF",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  bookmarkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  contentSection: {
    paddingHorizontal: 20,
    marginTop: 16,
    position: 'relative',
    zIndex: 10,
  },
  titleArea: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900', // black
    color: 'white',
    lineHeight: 34,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 16,
    fontWeight: '500',
  },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  genresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  genreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0A84FF',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontWeight: '800',
    fontSize: 16,
    color: 'white',
  },
  disabledButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  disabledButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#8e8e93',
  },
  bookmarkButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bookmarkButtonToggling: {
    opacity: 0.5,
  },
  bookmarkButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ scale: 0.95 }],
  },
  synopsisSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: 'white',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  synopsisText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '400',
  },
  expandButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  expandButtonText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '700',
  },
  episodesSection: {
    marginBottom: 32,
  },
  episodesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  episodesCountText: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyEpisodes: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
  },
  emptyEpisodesText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '500',
  },
  chunkScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  chunkScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chunkButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginRight: 8,
  },
  chunkButtonActive: {
    backgroundColor: 'white',
  },
  chunkButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chunkButtonText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  chunkTextActive: {
    color: 'black',
  },
  chunkTextInactive: {
    color: '#8e8e93',
  },
  episodesList: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    overflow: 'hidden',
    paddingTop: 16,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyImg: {
    width: 72,
    height: 48,
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
    fontWeight: '500',
  },
  episodePlayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationsSection: {
    marginBottom: 32,
  },
  recommendationsScroll: {
    marginHorizontal: -20,
  },
  recommendationsScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  recommendationItem: {
    width: 130,
    marginRight: 12,
  },
});
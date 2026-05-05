import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Share, StyleSheet, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Link } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import useSWR from 'swr';
import { Play, Bookmark, Share as ShareIcon, Star, ArrowLeft, Eye, Clock, Calendar, Check, Info } from 'lucide-react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../lib/auth';
import { Alert } from 'react-native';

const { width: W } = Dimensions.get('window');
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
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <BlurView intensity={20} tint="dark" style={styles.blurIcon}>
            <ArrowLeft color="white" size={20} />
          </BlurView>
        </Pressable>
        <Pressable onPress={handleShare}>
          <BlurView intensity={20} tint="dark" style={styles.blurIcon}>
            <ShareIcon color="white" size={18} />
          </BlurView>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: typeof d.coverImage === 'string' ? d.coverImage : (d.coverImage?.extraLarge || d.coverImage?.large || d.bannerImage || d.poster || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg") }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          
          <LinearGradient
            colors={['rgba(10, 8, 18, 0.5)', 'rgba(10, 8, 18, 0)']}
            style={styles.heroGradientTop}
          />

          <LinearGradient
            colors={['transparent', 'rgba(10, 8, 18, 0.7)', '#0a0812']}
            locations={[0, 0.6, 1]}
            style={styles.heroGradientMiddle}
          />
        </View>

        <View style={styles.contentSection}>
          {/* Title Area */}
          <View style={styles.titleArea}>
            <View style={styles.statusRow}>
              {isFinished ? (
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                  <View style={[styles.statusDot, { backgroundColor: '#30D158', shadowColor: '#30D158' }]} />
                  <Text style={[styles.statusText, { color: '#30D158' }]}>Tamat</Text>
                </View>
              ) : scheduleDay ? (
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 214, 10, 0.15)' }]}>
                  <Calendar size={12} color="#FFD60A" strokeWidth={2.5} />
                  <Text style={[styles.statusText, { color: '#FFD60A' }]}>Tiap {scheduleDay}</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                  <View style={[styles.statusDot, { backgroundColor: '#0A84FF', shadowColor: '#0A84FF' }]} />
                  <Text style={[styles.statusText, { color: '#0A84FF' }]}>Sedang Tayang</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.mainTitle}>
              {d.cleanTitle || d.nativeTitle || d.title?.english || d.title?.romaji || d.title}
            </Text>
            {d.nativeTitle && d.nativeTitle !== d.cleanTitle && <Text style={styles.subTitle}>{d.nativeTitle}</Text>}
            
            {/* Rich Metadata Strip */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metaStrip}>
              {d.score > 0 && (
                <View style={styles.metaPill}>
                  <Star color="#FFD60A" fill="#FFD60A" size={14} />
                  <Text style={styles.metaPillText}>{(d.score / 10).toFixed(1)}</Text>
                </View>
              )}
              {realViews > 0 && (
                <View style={styles.metaPill}>
                  <Eye color="rgba(255,255,255,0.6)" size={14} />
                  <Text style={[styles.metaPillText, { color: 'rgba(255,255,255,0.8)' }]}>{formatViews(realViews)}</Text>
                </View>
              )}
              {d.trending > 0 && (
                <View style={styles.metaPill}>
                  <Text style={{ fontSize: 13, marginRight: 4 }}>🔥</Text>
                  <Text style={[styles.metaPillText, { color: 'rgba(255,255,255,0.8)' }]}>Trending #{d.trending}</Text>
                </View>
              )}
              {d.popularity > 0 && (
                <View style={styles.metaPill}>
                  <Text style={[styles.metaPillText, { color: 'rgba(255,255,255,0.8)' }]}>Top #{d.popularity}</Text>
                </View>
              )}
              <View style={styles.metaPill}>
                <Info color="rgba(255,255,255,0.6)" size={14} />
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

            {/* Actions */}
            <View style={styles.actionsRow}>
              {firstEp ? (
                <Pressable 
                  onPress={() => router.push(`/watch/${id}/${firstEp}` as any)}
                  style={styles.primaryButton as any}
                >
                  <Play color="white" size={20} />
                  <Text style={styles.primaryButtonText}>Mulai Tonton</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.disabledButton as any}>
                  <Text style={styles.disabledButtonText}>Belum Tersedia</Text>
                </Pressable>
              )}

              <Pressable 
                onPress={toggleCollection}
                disabled={isToggling}
                style={styles.bookmarkButton as any} 
              >
                {isToggling ? (
                  <ActivityIndicator size="small" color="#e5e5ea" />
                ) : isSaved ? (
                  <Bookmark color="#0A84FF" fill="#0A84FF" size={20} />
                ) : (
                  <Bookmark color="#e5e5ea" size={20} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Synopsis */}
          <View style={styles.synopsisSection}>
            <Text style={styles.sectionTitle}>Sinopsis</Text>
            <Text style={styles.synopsisText} numberOfLines={isExpanded ? undefined : 4}>
              {desc}
            </Text>
            {desc.length > 150 && (
              <Pressable onPress={() => setIsExpanded(!isExpanded)} style={styles.expandButton as any}>
                <Text style={styles.expandButtonText}>
                  {isExpanded ? "Sembunyikan" : "Baca Selengkapnya"}
                </Text>
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
                        <Image source={{ uri: img }} style={styles.historyImg as any} contentFit="cover" />
                        <View style={styles.historyDetails as any}>
                          <Text style={styles.historyTitle as any} numberOfLines={2}>{epTitle}</Text>
                          <Text style={styles.historyEp as any}>Episode {epNum}</Text>
                        </View>
                        <View style={{ justifyContent: 'center' } as any}>
                          <View style={styles.episodePlayCircle as any}>
                            <Play size={12} color="#fff" style={{ marginLeft: 2 } as any} />
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
      </ScrollView>
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
    height: 480, // slightly taller
    position: 'relative',
    backgroundColor: '#0a0812',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
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
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  blurIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconButtonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
  contentSection: {
    paddingHorizontal: 20,
    marginTop: -120,
    position: 'relative',
    zIndex: 10,
  },
  titleArea: {
    marginBottom: 32,
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
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  genresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 24,
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
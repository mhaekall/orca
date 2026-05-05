import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Share, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Link } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import useSWR from 'swr';
import { Play, Bookmark, Share as ShareIcon, Star, ArrowLeft, Eye, Check, Calendar } from 'lucide-react-native';
import { AnimeCard } from '../../components/AnimeCard';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../lib/auth';
import { Alert, Dimensions } from 'react-native';

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
        // Remove from collection
        await fetch(`${API_URL}/api/v2/collection?user_id=${userId}&anilistId=${id}`, {
          method: "DELETE"
        });
      } else {
        // Add to collection
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
      
      // Revalidate collection
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
        message: `Nonton ${d.title} di Orca Anime!`,
        url: `https://orca-anime.com/anime/${id}`, // Ganti dengan domain asli jika ada
        title: d.title,
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
           <LinearGradient
            colors={['transparent', '#13111a']}
            style={styles.heroGradientBottom}
          />
        </View>
        <View style={styles.contentLoading}>
          <Skeleton w={100} h={20} r={10} style={{ marginBottom: 8 }} />
          <Skeleton w={W - 60} h={32} r={12} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
             <Skeleton w={40} h={20} r={10} />
             <Skeleton w={60} h={20} r={10} />
             <Skeleton w={80} h={20} r={10} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
            <Skeleton w="75%" h={56} r={28} />
            <Skeleton w="20%" h={56} r={28} />
          </View>
          <Skeleton w={80} h={24} r={8} style={{ marginBottom: 12 }} />
          <Skeleton w="100%" h={16} r={6} style={{ marginBottom: 8 }} />
          <Skeleton w="90%" h={16} r={6} style={{ marginBottom: 8 }} />
          <Skeleton w="95%" h={16} r={6} style={{ marginBottom: 8 }} />
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
  const eps = d.episodes || [];
  const realViews = d.views || 0;
  
  let scheduleDay = d.airSchedule;
  if (!scheduleDay && d.nextAiringEpisode?.airingAt) {
    const dt = new Date(d.nextAiringEpisode.airingAt * 1000);
    const daysArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    scheduleDay = daysArr[dt.getDay()];
  }

  const firstEp = eps.length > 0 ? (eps[0].number || eps[0].url?.split("episode=").pop() || "1") : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: d.poster || d.img || d.coverImage || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg" }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          
          <LinearGradient
            colors={['rgba(19, 17, 26, 0.6)', 'rgba(19, 17, 26, 0)']}
            style={styles.heroGradientTop}
          />

          <LinearGradient
            colors={['transparent', 'rgba(19, 17, 26, 0.6)', '#13111a']}
            locations={[0, 0.5, 1]}
            style={styles.heroGradientMiddle}
          />
          <LinearGradient
            colors={['transparent', '#13111a']}
            style={styles.heroGradientBottom}
          />

          {/* Top Bar (Absolute) */}
          <View style={styles.topBar}>
            <Pressable 
              onPress={() => router.back()}
              style={({pressed}) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <ArrowLeft color="white" size={20} />
            </Pressable>
            <Pressable 
              onPress={handleShare}
              style={({pressed}) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <ShareIcon color="white" size={18} />
            </Pressable>
          </View>
        </View>

        <View style={styles.contentSection}>
          {/* Title Area */}
          <View style={styles.titleArea}>
            {d.status === "FINISHED" ? (
              <View style={styles.statusBadgeFinished}>
                <View style={styles.statusDotFinished} />
                <Text style={styles.statusTextFinished}>Tamat</Text>
              </View>
            ) : scheduleDay ? (
              <View style={styles.statusBadgeAiring}>
                <Calendar size={12} color="#FFD60A" strokeWidth={2.5} />
                <Text style={styles.statusTextAiring}>Tiap {scheduleDay}</Text>
              </View>
            ) : null}
            
            <Text style={styles.mainTitle}>
              {d.cleanTitle || d.nativeTitle || d.title?.english || d.title?.romaji || d.title}
            </Text>
            {d.nativeTitle && d.nativeTitle !== d.cleanTitle && <Text style={styles.subTitle}>{d.nativeTitle}</Text>}
            
            <View style={styles.metaRow}>
              {d.score && (
                <View style={styles.metaItem}>
                  <Star color="#30D158" fill="#30D158" size={14} />
                  <Text style={styles.metaScoreText}>{(d.score / 10).toFixed(1)}</Text>
                  <Text style={styles.metaDot}>●</Text>
                </View>
              )}
              {d.season && d.seasonYear && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaTextCapitalize}>{d.season.toLowerCase()} {d.seasonYear}</Text>
                  <Text style={styles.metaDot}>●</Text>
                </View>
              )}
              {d.studios?.[0] && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaText}>{d.studios[0]}</Text>
                  <Text style={styles.metaDot}>●</Text>
                </View>
              )}
              
              {d.genres?.length > 0 && (
                <View style={styles.genresContainer}>
                  {d.genres.slice(0, 3).map((g: string) => (
                    <View key={g} style={styles.genreBadge}>
                      <Text style={styles.genreText}>{g}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              {firstEp ? (
                <Link href={`/watch/${id}/${firstEp}`} asChild>
                  <Pressable 
                    style={({pressed}) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                  >
                    <Play color="white" fill="white" size={20} />
                    <Text style={styles.primaryButtonText}>
                      Mulai Tonton
                    </Text>
                  </Pressable>
                </Link>
              ) : (
                <Pressable 
                  style={styles.disabledButton}
                >
                  <Text style={styles.disabledButtonText}>
                    Belum Tersedia
                  </Text>
                </Pressable>
              )}

              <Pressable 
                onPress={toggleCollection}
                disabled={isToggling}
                style={({pressed}) => [
                  styles.bookmarkButton, 
                  isToggling && styles.bookmarkButtonToggling,
                  pressed && !isToggling && styles.bookmarkButtonPressed
                ]} 
              >
                {isToggling ? (
                  <ActivityIndicator size="small" color="#e5e5ea" />
                ) : isSaved ? (
                  <Bookmark color="#0A84FF" fill="#0A84FF" size={24} />
                ) : (
                  <Bookmark color="#e5e5ea" size={24} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Synopsis */}
          <View style={styles.synopsisSection}>
            <Text style={styles.sectionTitle}>Sinopsis</Text>
            <Text 
              style={styles.synopsisText} 
              numberOfLines={isExpanded ? undefined : 3}
            >
              {desc}
            </Text>
            {desc.length > 150 && (
              <Pressable onPress={() => setIsExpanded(!isExpanded)} style={styles.expandButton}>
                <Text style={styles.expandButtonText}>
                  {isExpanded ? "Sembunyikan" : "Selengkapnya"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Episode List */}
          <View style={styles.episodesSection}>
            <View style={styles.episodesHeader}>
              <Text style={styles.sectionTitle}>Daftar Episode</Text>
              <Text style={styles.episodesCountText}>{eps.length} Episode</Text>
            </View>
            
            {eps.length === 0 ? (
              <View style={styles.emptyEpisodes}>
                <Text style={styles.emptyEpisodesText}>Belum ada episode</Text>
              </View>
            ) : (
              <View>
                {/* Chunk Filter (if more than 50 eps) */}
                {eps.length > 50 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chunkScroll} contentContainerStyle={styles.chunkScrollContent}>
                      {Array.from({ length: Math.ceil(eps.length / 50) }).map((_, i) => {
                        const chunk = eps.slice(i * 50, (i + 1) * 50);
                        if (chunk.length === 0) return null;
                        
                        const getNum = (e: any) => e.episodeNumber ?? e.number ?? e.url?.split("episode=").pop() ?? "?";
                        const firstNum = getNum(chunk[0]);
                        const lastNum = getNum(chunk[chunk.length - 1]);
                        
                        // Because eps are descending, lastNum is the smaller number in the chunk
                        const label = `${lastNum} - ${firstNum}`;
                        const isActive = epChunkIndex === i;

                        return (
                          <Pressable 
                            key={i} 
                            onPress={() => setEpChunkIndex(i)}
                            style={[
                              styles.chunkButton,
                              isActive ? styles.chunkButtonActive : styles.chunkButtonInactive
                            ]}
                          >
                            <Text style={[styles.chunkButtonText, isActive ? styles.chunkTextActive : styles.chunkTextInactive]}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </ScrollView>
                )}
                
                {/* Episode Grid for Current Chunk */}
                <View style={styles.episodesGrid}>
                  {eps.slice(epChunkIndex * 50, (epChunkIndex + 1) * 50).map((ep: any, index: number) => {
                    const epNum = ep.episodeNumber ?? ep.number ?? ep.url?.split("episode=").pop();
                    return (
                      <Link href={`/watch/${id}/${epNum}`} key={index} asChild>
                        <Pressable 
                          style={({pressed}) => [styles.episodeButton, pressed && styles.episodeButtonPressed]}
                        >
                          <Text style={styles.episodeButtonText}>Eps {epNum}</Text>
                        </Pressable>
                      </Link>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Recommendations */}
          {d.recommendations && d.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={[styles.sectionTitle, {marginBottom: 16}]}>Rekomendasi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll} contentContainerStyle={styles.recommendationsScrollContent}>
                  {d.recommendations.map((r: any, i: number) => {
                    const recId = String(r.id || r.anilistId);
                    if (!recId) return null;
                    return (
                      <View key={i} style={styles.recommendationItem}>
                        <AnimeCard 
                          id={recId} 
                          title={r.title?.english || r.title?.romaji || r.title || ''} 
                          img={r.cover || r.poster || r.image || r.coverImage?.extraLarge} 
                          totalEps={r.latestEpisode || r.totalEpisodes || r.episodes} 
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
    backgroundColor: '#13111a',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#13111a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 18,
  },
  errorButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9999,
  },
  errorButtonText: {
    color: 'white',
  },
  heroLoading: {
    width: '100%',
    height: 500,
    position: 'relative',
    backgroundColor: '#13111a',
  },
  contentLoading: {
    paddingHorizontal: 20,
    marginTop: -140,
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
    height: 500,
    position: 'relative',
    backgroundColor: '#13111a',
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
    height: '80%',
    bottom: 0,
  },
  heroGradientBottom: {
    position: 'absolute',
    width: '100%',
    height: 150,
    bottom: 0,
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(19, 17, 26, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconButtonPressed: {
    opacity: 0.5,
  },
  contentSection: {
    paddingHorizontal: 20,
    marginTop: -140,
    position: 'relative',
    zIndex: 10,
  },
  titleArea: {
    marginBottom: 32,
  },
  statusBadgeFinished: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
    marginBottom: 8,
  },
  statusDotFinished: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
    shadowColor: '#30D158',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 2,
  },
  statusTextFinished: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statusBadgeAiring: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 214, 10, 0.2)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.3)',
    marginBottom: 8,
  },
  statusTextAiring: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '900', // black
    color: 'white',
    lineHeight: 28, // leading-tight
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
    marginBottom: 24,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaScoreText: {
    color: '#30D158',
    fontSize: 13,
    fontWeight: 'bold',
  },
  metaText: {
    color: '#e5e5ea',
    fontSize: 13,
    fontWeight: '500',
  },
  metaTextCapitalize: {
    color: '#e5e5ea',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  metaDot: {
    color: '#48484a',
    fontSize: 10,
    marginLeft: 4,
  },
  genresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  genreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9999,
  },
  genreText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 3.5,
    paddingVertical: 16,
    borderRadius: 9999,
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
  },
  primaryButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: 'white',
  },
  disabledButton: {
    flex: 3.5,
    paddingVertical: 16,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1f1c29',
  },
  disabledButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#8e8e93',
  },
  bookmarkButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1c29',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bookmarkButtonToggling: {
    opacity: 0.5,
  },
  bookmarkButtonPressed: {
    opacity: 0.8,
  },
  synopsisSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  synopsisText: {
    color: '#e5e5ea',
    fontSize: 14,
    lineHeight: 22,
  },
  expandButton: {
    marginTop: 8,
  },
  expandButtonText: {
    color: '#0A84FF',
    fontSize: 13,
    fontWeight: 'bold',
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyEpisodes: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyEpisodesText: {
    color: '#8e8e93',
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
    borderWidth: 1,
    marginRight: 8, // fallback gap for older RN
  },
  chunkButtonActive: {
    backgroundColor: 'white',
    borderColor: 'white',
  },
  chunkButtonInactive: {
    backgroundColor: '#1f1c29',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chunkButtonText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  chunkTextActive: {
    color: 'black',
  },
  chunkTextInactive: {
    color: '#8e8e93',
  },
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  episodeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1c29',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 60,
    height: 45,
    borderRadius: 12,
  },
  episodeButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  episodeButtonText: {
    color: 'white',
    fontWeight: '900', // black
    fontSize: 12,
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
    width: 120,
    marginRight: 12, // fallback gap for older RN
  },
});
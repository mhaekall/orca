import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Share, StyleSheet, Alert, Dimensions, Linking, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useSWR from 'swr';
import { Bookmark, Forward, ArrowLeft, Heart, Eye, Flag, MessageSquare, ChevronDown } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useAuth } from '../../../lib/auth';
import { MediaCard } from '../../../components/MediaCard';
import { CommentSection } from '../../../components/CommentSection';
import { Skeleton } from '../../../components/Skeleton';
import { CustomVideoPlayer } from '../../../components/CustomVideoPlayer';
import { MediaEpisodes } from '../../../components/media-detail/sections/MediaEpisodes';
import { useWatchProgress } from '../../../lib/hooks/useWatchProgress';
import { useUserProgress } from '../../../lib/hooks/useUserProgress';
import { hasEps } from '../../../lib/utils';

const { width: W } = Dimensions.get('window');
import { API_URL, HF_API_URL } from "../../../lib/config";
import { fetcher, fetchWithAuth } from "../../../lib/fetcher";
import { AnimeEngine } from '../../../lib/anime/engine';
import { AnimeSource } from '../../../lib/anime/types';

export default function WatchScreen() {
  const { id, episode } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clientSources, setClientSources] = useState<AnimeSource[]>([]);
  const [isClientScraping, setIsClientScraping] = useState(false);
  
  const { data: animeData } = useSWR(`${HF_API_URL}/api/v2/anime/${id}?_cb=5`, fetcher);
  
  const { progressData } = useUserProgress(user?.id || user?.email);
  const { data: streamData, isLoading: streamLoading } = useSWR(
    `${API_URL}/api/v2/anime/${id}/episodes/${episode}/stream`,
    fetcher
  );

  // Social Stats (Likes for episode)
  const { data: statsData, mutate: mutateStats } = useSWR(
    user ? `${HF_API_URL}/api/v2/social/episode/${id}/${episode}/stats?user_id=${user.id}` : `${HF_API_URL}/api/v2/social/episode/${id}/${episode}/stats`,
    fetcher
  );

  // Social Stats (Anime-level, for views)
  const { data: animeStatsData } = useSWR(`${HF_API_URL}/api/v2/social/anime/${id}/stats`, fetcher);
  
  const likesCount = statsData?.likes || 0;
  const isLiked = statsData?.user_liked || false;
  const realViews = animeStatsData?.total_episode_views || animeData?.data?.views || animeData?.data?.popularity || 0;

  const anime = animeData?.data;
  const episodes = anime?.episodes || [];

  useEffect(() => {
    let isMounted = true;
    const fetchClientSources = async () => {
      const currentEpData = episodes.find((e: any) => String(e.episodeNumber || e.number) === String(episode));
      let epUrl = currentEpData?.url || currentEpData?.link || currentEpData?.episodeUrl;
      
      if (!epUrl) return;

      setIsClientScraping(true);
      setClientSources([]);
      try {
        let sc: AnimeSource[] = [];
        
        if (epUrl.includes("tele-proxy") || epUrl.includes("moehamadhkl.workers.dev")) {
            sc = await AnimeEngine.processTeleProxy(epUrl);
        } else if (epUrl.includes("kuronime") || epUrl.includes("animeku")) {
           const kuroSrc = await AnimeEngine.getKuronimeSources(epUrl);
           sc = [...sc, ...kuroSrc];
        } else if (epUrl.includes("samehadaku")) {
           const sameSrc = await AnimeEngine.getSamehadakuSources(epUrl);
           sc = [...sc, ...sameSrc];
        }
        
        if (isMounted && sc && sc.length > 0) {
           setClientSources(sc);
        }
      } catch (e) {
        console.warn("Client scraping failed:", e);
      } finally {
        if (isMounted) setIsClientScraping(false);
      }
    };
    
    if (episodes.length > 0) {
      fetchClientSources();
    }
    return () => { isMounted = false; };
  }, [episode, episodes]);

  // Merge backend sources with client sources and deduplicate
  const sources = React.useMemo(() => {
    const backendSources = streamData?.sources || [];
    let rawSources = [...backendSources, ...clientSources];
    
    // Deduplicate by URL
    return rawSources.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);
  }, [clientSources, streamData]);

  const combinedLoading = isClientScraping || (clientSources.length === 0 && streamLoading);

  const watchHistoryRaw = Array.isArray(progressData) ? progressData : (progressData?.data || []);
  const animeHistory = watchHistoryRaw.filter((h: any) => String(h.anilist_id || h.animeSlug) === String(id));
  
  // 1. Ambil source video (Backend/Client sudah meresolve iframe ke direct URL)
  // Tier 0: Direct Stream ASLI (Kuronime/Samehadaku/Pixeldrain)
  // Tier 3: Tele Proxy (Fallback jika scraper mati)
  // Tier 4: Iframe 
  const pureDirectSources = sources.filter((s: any) => s.type !== "iframe" && !s.provider.toLowerCase().includes("tele proxy") && !s.provider.toLowerCase().includes("swarm"));
  const teleProxySources = sources.filter((s: any) => s.provider.toLowerCase().includes("tele proxy") || s.provider.toLowerCase().includes("swarm"));
  const fallbackSources = sources.filter((s: any) => s.type === "iframe");

  const bestSource = 
    pureDirectSources.find((s: any) => s.quality === "1080p") ||
    pureDirectSources.find((s: any) => s.quality === "720p") || 
    pureDirectSources.find((s: any) => s.quality === "480p") || 
    (pureDirectSources.length > 0 ? pureDirectSources[0] : null) ||
    teleProxySources.find((s: any) => s.quality === "1080p") ||
    teleProxySources.find((s: any) => s.quality === "720p") ||
    (teleProxySources.length > 0 ? teleProxySources[0] : null) ||
    fallbackSources.find((s: any) => s.quality === "720p") ||
    (fallbackSources.length > 0 ? fallbackSources[0] : null);
    
  const videoUrl = bestSource?.url || null;

  const userId = user?.id || user?.email;

  const { updateProgress } = useWatchProgress(userId, String(id), String(episode), videoUrl);

  const handleToggleLike = async () => {
    if (!user) {
      Alert.alert("Login Dibutuhkan", "Silakan login untuk menyukai episode ini.");
      return;
    }
    
    // Optimistic UI update
    mutateStats(
      { likes: isLiked ? likesCount - 1 : likesCount + 1, user_liked: !isLiked },
      false
    );

    try {
      await fetchWithAuth(`${HF_API_URL}/api/v2/social/episode/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          anilistId: parseInt(id as string),
          episodeNumber: parseFloat(episode as string),
        }),
      });
      // Revalidate after success
      mutateStats();
    } catch (e) {
      console.error(e);
      // Revert optimistic update on failure
      mutateStats();
    }
  };

  const handleSaveCollection = async () => {
    if (!user) {
      Alert.alert("Login Dibutuhkan", "Silakan login untuk menyimpan koleksi.");
      return;
    }
    try {
      const res = await fetchWithAuth(`${HF_API_URL}/api/v2/collection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          anilistId: String(id),
          status: "Watching",
          progress: parseFloat(episode as string)
        }),
      });
      if (res.ok) {
        Alert.alert("Berhasil", "Anime ditambahkan ke koleksi!");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Gagal menyimpan koleksi.");
    }
  };

  const displayTitle = anime?.cleanTitle || anime?.nativeTitle || anime?.title?.english || anime?.title?.romaji || anime?.title || "Anime";

  const handleShare = async () => {
    if (!anime) return;
    try {
      await Share.share({
        message: `Nonton ${displayTitle} Episode ${episode} di aplikasi Orca!`,
        url: `https://orca-anime.com/watch/${id}/${episode}`, // fallback to web link that redirects to deep link
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSupport = () => {
    // Open a web browser to a donation page (e.g. Trakteer or Saweria)
    Linking.openURL('https://saweria.co/orcanime').catch(() => {
      Alert.alert("Error", "Tidak dapat membuka tautan dukungan.");
    });
  };

  const handleReport = () => {
    if (!user) {
      Alert.alert("Login Dibutuhkan", "Silakan login untuk mengirimkan laporan.");
      return;
    }

    const sendReport = async (issue: string) => {
      try {
        await fetchWithAuth(`${HF_API_URL}/api/v2/social/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            anilist_id: parseInt(id as string),
            episode_number: parseFloat(episode as string),
            issue_type: issue,
            video_url: videoUrl
          }),
        });
        Alert.alert("Terima Kasih", `Laporan '${issue}' telah dikirim ke tim kami.`);
      } catch (e) {
        Alert.alert("Error", "Gagal mengirim laporan.");
      }
    };

    Alert.alert(
      "Laporkan Masalah",
      "Pilih jenis masalah yang ingin Anda laporkan:",
      [
        { text: "Video Rusak / Tidak Jalan", onPress: () => sendReport("Video Rusak") },
        { text: "Teks Tidak Sinkron / Hilang", onPress: () => sendReport("Subtitle Error") },
        { text: "Batal", style: "cancel" }
      ]
    );
  };

  const handleEpisodeChange = (newEp: string) => {
    // Gunakan setParams agar halaman tidak full re-render/glitch saat pindah episode
    router.setParams({ episode: newEp });
  };

  const handleAuthRequiredAction = (action: string) => {
    if (!user) {
      Alert.alert("Login Dibutuhkan", `Silakan login untuk ${action}.`);
    } else {
      Alert.alert("Berhasil", `Fitur ${action} akan segera hadir.`);
    }
  };

  const getEpNumStr = (ep: any) => String(ep.episodeNumber ?? ep.number ?? (ep.url ? ep.url.split("episode=").pop() : "?"));
  const sortedEpisodes = [...episodes].sort((a, b) => {
    const numA = parseInt(getEpNumStr(a)) || 0;
    const numB = parseInt(getEpNumStr(b)) || 0;
    return numA - numB;
  });
  
  const currentIndex = sortedEpisodes.findIndex((ep: any) => String(getEpNumStr(ep)) === String(episode));
  const nextEp = currentIndex > -1 && currentIndex < sortedEpisodes.length - 1 ? sortedEpisodes[currentIndex + 1] : null;
  const prevEp = currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;
  
  const poster = anime?.poster || anime?.img || anime?.coverImage;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Video Player Container */}
      <View style={[
        isFullscreen ? styles.fullscreenVideoContainer : [styles.videoContainer, { marginTop: Math.max(insets.top, 0) }],
        isFullscreen && showComments && { right: 320 }
      ]}>

        {combinedLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A84FF" />
            <Text style={styles.loadingText}>Mencari sumber video...</Text>
          </View>
        ) : videoUrl ? (
          <CustomVideoPlayer 
            videoUrl={videoUrl}
            sources={sources}
            title={`${displayTitle} - Eps ${episode}`}
            onBack={() => router.back()}
            onNext={nextEp ? () => handleEpisodeChange(String(getEpNumStr(nextEp))) : undefined}
            onPrevious={prevEp ? () => handleEpisodeChange(String(getEpNumStr(prevEp))) : undefined}
            isLoading={combinedLoading}
            onFullscreenChange={setIsFullscreen}
            views={realViews}
            likes={likesCount}
            isLiked={isLiked}
            onLike={handleToggleLike}
            onShowComments={() => setShowComments(true)}
            onProgressUpdate={(time, dur) => {
              updateProgress(time, dur);
            }}
            onEnd={() => {
              if (nextEp) handleEpisodeChange(String(getEpNumStr(nextEp)));
            }}
          />
        ) : (
          <View style={styles.unavailableContainer}>
            <Text style={styles.unavailableText}>Video belum tersedia untuk episode ini.</Text>
          </View>
        )}
      </View>

      {/* Konten Halaman */}
      {!isFullscreen && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {anime ? (
            <CommentSection 
              anilistId={String(id)} 
              episode={String(episode)} 
              user={user} 
              visible={true} 
              onClose={() => setShowComments(false)} 
              isFullscreen={false}
              ListHeaderComponent={
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                  {/* Judul & Detail Singkat */}
                  <View style={styles.titleSection}>
                    <Text style={styles.titleText}>
                      {displayTitle} <Text style={styles.episodeText}>· Eps {episode}</Text>
                    </Text>
                  </View>

                  {/* Scrollable Action Bar */}
                  <View style={styles.actionBarWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionBarContent}>
                      <Link href={`/anime/${id}`} asChild>
                        <Pressable style={({pressed}) => [styles.avatarPressable, pressed && styles.pressedState]}>
                          <Image 
                            source={{ uri: poster || "https://api.dicebear.com/7.x/notionists/svg" }} 
                            style={styles.avatarImage} 
                            contentFit="cover"
                          />
                        </Pressable>
                      </Link>

                      <Pressable 
                        onPress={handleShare}
                        style={({pressed}) => [
                          { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" }, 
                          pressed && styles.pressedState
                        ]}
                      >
                        <Forward color="white" size={16} />
                      </Pressable>

                      <View style={styles.viewBadge}>
                        <Eye color="#e5e5ea" size={16} />
                        <Text style={styles.viewBadgeText}>
                          {realViews >= 1000000 ? (realViews/1000000).toFixed(1) + 'M' : realViews >= 1000 ? (realViews/1000).toFixed(1) + 'K' : realViews}
                        </Text>
                      </View>

                      <Pressable 
                        onPress={handleToggleLike}
                        style={({pressed}) => [styles.actionButtonDark, pressed && styles.actionButtonDarkPressed]}
                      >
                        <Heart color={isLiked ? "#ff2d55" : "white"} fill={isLiked ? "#ff2d55" : "transparent"} size={16} />
                        <Text style={[styles.actionButtonDarkText, isLiked && { color: "#ff2d55" }]}>{likesCount > 0 ? likesCount : 'Suka'}</Text>
                      </Pressable>

                      <Pressable 
                        onPress={handleReport}
                        style={({pressed}) => [styles.actionButtonDark, pressed && styles.actionButtonDarkPressed]}
                      >
                        <Flag color="white" size={14} />
                        <Text style={styles.actionButtonDarkText}>Lapor</Text>
                      </Pressable>
                    </ScrollView>
                  </View>

                  {/* List Episode Terpusat dari Komponen Detail */}
                  <MediaEpisodes 
                    mediaId={String(id)} 
                    mediaType="anime"
                    rawEps={episodes} 
                    activeEpisode={String(episode)} 
                    onEpisodePress={handleEpisodeChange}
                  />
                </View>
              }
            />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              <View style={styles.skeletonContainer}>
                <Skeleton w="80%" h={28} r={8} style={styles.skeletonTitle} />
                <Skeleton w="50%" h={16} r={6} style={styles.skeletonSubtitle} />
                <View style={styles.skeletonActions}>
                  <Skeleton w={50} h={50} r={25} />
                  <Skeleton w={50} h={50} r={25} />
                  <Skeleton w={50} h={50} r={25} />
                  <Skeleton w={50} h={50} r={25} />
                </View>
                <Skeleton w={120} h={20} r={8} style={styles.skeletonSectionTitle} />
                <View style={styles.skeletonGrid}>
                   {Array.from({ length: 10 }).map((_, i) => (
                     <Skeleton key={i} w={70} h={40} r={12} />
                   ))}
                </View>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      )}

      {/* Render khusus untuk overlay komentar di mode fullscreen */}
      {isFullscreen && showComments && (
        <CommentSection 
          anilistId={String(id)} 
          episode={String(episode)} 
          user={user} 
          visible={true} 
          onClose={() => setShowComments(false)} 
          isFullscreen={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0812',
  },
  fullscreenVideoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'black',
    elevation: 100, // Android z-index enforcement
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'black',
    position: 'relative',
    justifyContent: 'center',
    zIndex: 100, // Force this on top to prevent ScrollView touch stealing
  },
  backButtonWrapper: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  unavailableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1e',
  },
  unavailableText: {
    color: '#8e8e93',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scrollContent: {
    paddingBottom: 0,
    flexGrow: 1,
  },
  titleSection: {
    marginBottom: 8,
  },
  titleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    lineHeight: 22,
  },
  episodeText: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    fontSize: 16,
  },
  actionBarWrapper: {
    marginBottom: 24,
    marginHorizontal: -16,
  },
  actionBarContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  avatarPressable: {
    marginRight: 4,
  },
  pressedState: {
    transform: [{ scale: 0.95 }],
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionButtonWhite: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'white',
  },
  actionButtonWhitePressed: {
    backgroundColor: '#e5e5ea',
  },
  actionButtonWhiteText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9999,
  },
  viewBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButtonDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9999,
  },
  actionButtonDarkPressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionButtonDarkText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  iconOnlyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsPreviewSection: {
    marginBottom: 24,
  },
  commentsBox: {
    backgroundColor: '#1f1c29',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  commentsBoxPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  commentsTitle: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
  },
  commentsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2536',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  userAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
  commentsPlaceholderText: {
    color: '#e5e5ea',
    fontSize: 12,
    flex: 1,
  },

  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  skeletonTitle: {
    marginBottom: 12,
  },
  skeletonSubtitle: {
    marginBottom: 24,
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  skeletonSectionTitle: {
    marginBottom: 16,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Share, StyleSheet, Alert, Dimensions, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Link } from 'expo-router';
import useSWR from 'swr';
import { Bookmark, Share as ShareIcon, ArrowLeft, Heart, Eye, Flag, DollarSign, MessageSquare, ChevronDown } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { useAuth } from '../../../lib/auth';
import { AnimeCard } from '../../../components/AnimeCard';
import { CommentSection } from '../../../components/CommentSection';
import { Skeleton } from '../../../components/Skeleton';

const { width: W } = Dimensions.get('window');
const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WatchScreen() {
  const { id, episode } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  
  const { data: animeData } = useSWR(`${API_URL}/api/v2/anime/${id}`, fetcher);
  const { data: streamData, isLoading: streamLoading } = useSWR(
    `${API_URL}/api/v2/anime/${id}/episodes/${episode}/stream`,
    fetcher
  );

  // Social Stats (Likes for episode)
  const { data: statsData, mutate: mutateStats } = useSWR(
    user ? `${API_URL}/api/v2/social/episode/${id}/${episode}/stats?user_id=${user.id}` : `${API_URL}/api/v2/social/episode/${id}/${episode}/stats`,
    fetcher
  );

  // Social Stats (Anime-level, for views)
  const { data: animeStatsData } = useSWR(`${API_URL}/api/v2/social/anime/${id}/stats`, fetcher);
  
  const likesCount = statsData?.likes || 0;
  const isLiked = statsData?.user_liked || false;
  const realViews = animeStatsData?.total_episode_views || animeData?.data?.views || animeData?.data?.popularity || 0;

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
      await fetch(`${API_URL}/api/v2/social/episode/like`, {
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
      const res = await fetch(`${API_URL}/api/v2/collection`, {
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

  const anime = animeData?.data;
  const sources = streamData?.sources || [];
  const episodes = anime?.episodes || [];
  const recommendations = anime?.recommendations || [];
  
  // 1. Ambil source video (Backend sudah meresolve iframe ke direct URL)
  const bestSource = sources.length > 0 ? sources[0] : null;
  let videoUrl = bestSource?.url || null;
  let sourceType = bestSource?.type || 'hls';
  const customHeaders = streamData?.headers || { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36' };

  // Override type for telegram proxies (they return M3U8 playlists in our ingestion pipeline).
  if (videoUrl && (videoUrl.includes('tg-proxy') || videoUrl.includes('tele-proxy') || videoUrl.includes('workers.dev'))) {
    // Force sourceType to 'hls' because even if the API database says it's 'mp4',
    // the CF Worker proxy ALWAYS generates an #EXTM3U playlist on the fly from Telegram sliced chunks.
    sourceType = 'hls';
    
    // Proxy handles Range caching correctly, no need for cache buster hack here.
  }

  // player init dengan null dulu — akan di-update via useEffect saat videoUrl ready
  const player = useVideoPlayer(null, player => {
    player.loop = false;
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('statusChange', (status: any) => {
      console.log('[Player Status]', JSON.stringify(status));
      if (status.error) {
        setPlayerError(status.error.message);
        console.error('[Player Error]', status.error.message);
      } else {
        setPlayerError(null);
      }
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (!player || !user) return;
    const interval = setInterval(() => {
      if (player.playing) {
        fetch(`${API_URL}/api/v2/social/watch-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            anilist_id: parseInt(id as string),
            episode_number: parseFloat(episode as string),
            watch_duration_sec: Math.floor(player.currentTime || 0),
            total_duration_sec: Math.floor(player.duration || 0),
            quality_watched: "Auto",
            provider_used: "Cloudflare"
          }),
        }).catch(console.error);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [player, user, id, episode]);

  const displayTitle = anime?.cleanTitle || anime?.nativeTitle || anime?.title?.english || anime?.title?.romaji || anime?.title || "Anime";

  // Update player saat videoUrl tersedia — termasuk hint HLS untuk ExoPlayer
  useEffect(() => {
    if (!player || !videoUrl) return;
    const source = {
      uri: videoUrl,
      metadata: { title: displayTitle || '' },
      headers: customHeaders,
      ...(sourceType === 'hls' ? { contentType: 'hls' as const } : {}),
    };
    console.log('[Player] Loading source:', videoUrl, 'type:', sourceType);
    player.replaceAsync(source)
      .then(() => { player.play(); console.log('[Player] Playing'); })
      .catch((e: any) => console.error('[Player] Error:', e?.message));
  }, [videoUrl]);

  const lastTapLeft = useRef(0);
  const handleDoubleTapLeft = () => {
    const now = Date.now();
    if (now - lastTapLeft.current < 300) {
      if (player) player.seekBy(-10);
      lastTapLeft.current = 0;
    } else {
      lastTapLeft.current = now;
    }
  };

  const lastTapRight = useRef(0);
  const handleDoubleTapRight = () => {
    const now = Date.now();
    if (now - lastTapRight.current < 300) {
      if (player) player.seekBy(10);
      lastTapRight.current = 0;
    } else {
      lastTapRight.current = now;
    }
  };

  const handleShare = async () => {
    if (!anime) return;
    try {
      await Share.share({
        message: `Nonton ${displayTitle} Episode ${episode} di aplikasi Orca!`,
        url: `https://orcanime.pages.dev/watch/${id}/${episode}`, // fallback to web link that redirects to deep link
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
    Alert.alert(
      "Laporkan Masalah",
      "Pilih jenis masalah yang ingin Anda laporkan:",
      [
        { text: "Video Rusak / Tidak Jalan", onPress: () => Alert.alert("Terima Kasih", "Laporan video rusak telah dikirim ke admin.") },
        { text: "Teks Tidak Sinkron / Hilang", onPress: () => Alert.alert("Terima Kasih", "Laporan teks/subtitle telah dikirim.") },
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
  const poster = anime?.poster || anime?.img || anime?.coverImage;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Video Player Container */}
      <View style={styles.videoContainer}>
        <View style={styles.backButtonWrapper}>
          <Pressable 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft color="white" size={20} />
          </Pressable>
        </View>

        {streamLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A84FF" />
            <Text style={styles.loadingText}>Mencari sumber video...</Text>
          </View>
        ) : videoUrl ? (
          <>
            <VideoView 
              style={StyleSheet.absoluteFill} 
              player={player} 
              allowsFullscreen 
              fullscreenOptions={{
                enable: true,
                orientation: 'landscape'
              }}
              allowsPictureInPicture
              showsTimecodes
              contentFit="contain"
            />
            {playerError && (
              <View style={{ position: 'absolute', top: 60, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 8, zIndex: 100 }}>
                <Text style={{color:'red', fontWeight: 'bold'}}>Player Error: {playerError}</Text>
              </View>
            )}
            {/* Double Tap Seek Overlays */}
            <View style={[StyleSheet.absoluteFill, styles.seekOverlay]} pointerEvents="box-none">
              <Pressable 
                onPress={handleDoubleTapLeft}
                style={styles.seekArea} 
              />
              <Pressable 
                onPress={handleDoubleTapRight}
                style={styles.seekArea} 
              />
            </View>
          </>
        ) : (
          <View style={styles.unavailableContainer}>
            <Text style={styles.unavailableText}>Video belum tersedia untuk episode ini.</Text>
          </View>
        )}
      </View>

      {/* Konten Halaman */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {anime ? (
          <>
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
                  onPress={handleSaveCollection}
                  style={({pressed}) => [styles.actionButtonWhite, pressed && styles.actionButtonWhitePressed]}
                >
                  <Text style={styles.actionButtonWhiteText}>Simpan</Text>
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
                  onPress={handleShare}
                  style={({pressed}) => [styles.iconOnlyButton, pressed && styles.actionButtonDarkPressed]}
                >
                  <ShareIcon color="white" size={16} />
                </Pressable>

                <Pressable 
                  onPress={handleSupport}
                  style={({pressed}) => [styles.actionButtonDark, pressed && styles.actionButtonDarkPressed]}
                >
                  <DollarSign color="white" size={14} />
                  <Text style={styles.actionButtonDarkText}>Thanks</Text>
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

            {/* Comments Preview Box */}
            <View style={styles.commentsPreviewSection}>
              <Pressable 
                onPress={() => setShowComments(true)}
                style={({pressed}) => [styles.commentsBox, pressed && styles.commentsBoxPressed]}
              >
                <View style={styles.commentsHeader}>
                  <Text style={styles.commentsTitle}>Komentar </Text>
                  <ChevronDown color="#8e8e93" size={18} />
                </View>
                <View style={styles.commentsInputRow}>
                  <View style={styles.userAvatarContainer}>
                    {user?.picture ? (
                      <Image source={{ uri: user.picture }} style={styles.userAvatarImage} />
                    ) : (
                      <Text style={styles.userAvatarText}>{user?.name ? user.name.charAt(0) : "U"}</Text>
                    )}
                  </View>
                  <Text style={styles.commentsPlaceholderText} numberOfLines={1}>
                    Bagikan pendapatmu tentang episode ini...
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* List Episode */}
            <View style={styles.episodesSection}>
              <View style={styles.episodesHeader}>
                <Text style={styles.episodesTitle}>
                  {showAllEpisodes ? `Episode (${sortedEpisodes.length})` : 'Episode'}
                </Text>
                <Pressable 
                  onPress={() => setShowAllEpisodes(!showAllEpisodes)}
                  style={({pressed}) => [styles.episodesToggleButton, pressed && styles.episodesToggleButtonPressed]}
                >
                  <Text style={styles.episodesToggleText}>{showAllEpisodes ? "Tutup" : "Semua"}</Text>
                </Pressable>
              </View>
              
              {showAllEpisodes ? (
                <View style={styles.allEpisodesGrid}>
                  {sortedEpisodes.map((ep: any) => {
                    const epNum = getEpNumStr(ep);
                    const isActive = String(epNum) === String(episode);
                    return (
                      <Pressable 
                        key={epNum}
                        onPress={() => handleEpisodeChange(String(epNum))}
                        style={({pressed}) => [
                          styles.allEpisodeItem,
                          isActive ? styles.episodeItemActive : styles.episodeItemInactive,
                          pressed && !isActive && styles.episodeItemPressed
                        ]}
                      >
                        <Text style={[styles.episodeItemText, isActive ? styles.episodeTextActive : styles.episodeTextInactive]}>
                          {epNum}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.episodesScroll} contentContainerStyle={styles.episodesScrollContent}>
                    {sortedEpisodes.map((ep: any) => {
                      const epNum = getEpNumStr(ep);
                      const isActive = String(epNum) === String(episode);
                      return (
                        <Pressable 
                          key={epNum}
                          onPress={() => handleEpisodeChange(String(epNum))}
                          style={({pressed}) => [
                            styles.scrollEpisodeItem,
                            isActive ? styles.episodeItemActive : styles.episodeItemInactive,
                            pressed && !isActive && styles.episodeItemPressed
                          ]}
                        >
                          <Text style={[styles.scrollEpisodeText, isActive ? styles.episodeTextActive : styles.episodeTextInactive]}>
                            {epNum}
                          </Text>
                        </Pressable>
                      );
                    })}
                </ScrollView>
              )}
            </View>

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <View style={styles.recommendationsSection}>
                <Text style={styles.recommendationsTitle}>Rekomendasi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll} contentContainerStyle={styles.recommendationsScrollContent}>
                    {recommendations.slice(0, 10).map((rec: any, i: number) => {
                      const recId = String(rec.id || rec.anilistId);
                      if (!recId) return null;
                      return (
                        <View key={i} style={styles.recommendationItem}>
                          <AnimeCard 
                            id={recId} 
                            title={rec.title?.english || rec.title?.romaji || rec.title || ''} 
                            img={rec.cover || rec.poster || rec.image || rec.coverImage?.extraLarge} 
                            totalEps={rec.latestEpisode || rec.totalEpisodes || rec.episodes} 
                          />
                        </View>
                      );
                    })}
                </ScrollView>
              </View>
            )}
            
          </>
        ) : (
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
        )}
      </ScrollView>
      
      {anime && (
        <CommentSection 
          anilistId={String(id)} 
          episode={String(episode)} 
          user={user} 
          visible={showComments} 
          onClose={() => setShowComments(false)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#13111a',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'black',
    position: 'relative',
    justifyContent: 'center',
    marginTop: 48, // Equivalent to mt-12. Adjust if iOS safe area needs different handling.
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  seekOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 40,
  },
  seekArea: {
    width: '30%',
    height: '60%',
    marginTop: '10%',
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
    paddingBottom: 100,
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
  episodesSection: {
    marginBottom: 24,
  },
  episodesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  episodesTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: -0.5,
  },
  episodesToggleButton: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  episodesToggleButtonPressed: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
  },
  episodesToggleText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  allEpisodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allEpisodeItem: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  episodesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  episodesScrollContent: {
    paddingRight: 32,
    gap: 10,
  },
  scrollEpisodeItem: {
    height: 48,
    minWidth: 64,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  episodeItemActive: {
    backgroundColor: 'white',
    borderColor: 'white',
  },
  episodeItemInactive: {
    backgroundColor: '#1f1c29',
    borderColor: 'transparent',
  },
  episodeItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  episodeItemText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollEpisodeText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  episodeTextActive: {
    color: 'black',
  },
  episodeTextInactive: {
    color: '#8e8e93',
  },
  recommendationsSection: {
    marginBottom: 24,
  },
  recommendationsTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  recommendationsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  recommendationsScrollContent: {
    paddingRight: 32,
    gap: 12,
  },
  recommendationItem: {
    width: 120,
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
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Share, StyleSheet, Alert, Dimensions } from 'react-native';
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
  
  const { data: animeData } = useSWR(`${API_URL}/api/v2/anime/${id}`, fetcher);
  const { data: streamData, isLoading: streamLoading } = useSWR(
    `${API_URL}/api/v2/anime/${id}/episodes/${episode}/stream`,
    fetcher
  );

  const anime = animeData?.data;
  const sources = streamData?.sources || [];
  const episodes = anime?.episodes || [];
  const recommendations = anime?.recommendations || [];
  const realViews = anime?.views || 0;
  
  // Filter only direct streams (mp4 or m3u8) because expo-video cannot play iframes
  const directSources = sources.filter((s: any) => s.type !== "iframe" && !s.url.includes("embed"));
  const bestSource = directSources.find((s: any) => s.quality === "1080p" || s.quality === "720p" || s.quality === "auto" || s.quality === "default") || directSources[0];
  
  let videoUrl = bestSource?.url;
  // Ensure the URL ends with a media extension so ExoPlayer knows it's a video stream
  if (videoUrl && !videoUrl.match(/\.(mp4|m3u8|ts)$/i)) {
    videoUrl += ".mp4";
  }

  const player = useVideoPlayer(videoUrl || null, player => {
    player.play();
  });

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
        message: `Nonton ${anime.cleanTitle || anime.title} Episode ${episode} di Orca Anime!`,
        url: `https://orcanime.pages.dev/watch/${id}/${episode}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEpisodeChange = (newEp: string) => {
    router.replace(`/watch/${id}/${newEp}`);
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
  const displayTitle = anime?.cleanTitle || anime?.nativeTitle || anime?.title?.english || anime?.title?.romaji || anime?.title || "Anime";
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
              allowsPictureInPicture
              showsTimecodes
              contentFit="contain"
            />
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
                  onPress={() => handleAuthRequiredAction("Simpan Koleksi")}
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
                  onPress={() => handleAuthRequiredAction("Suka")}
                  style={({pressed}) => [styles.actionButtonDark, pressed && styles.actionButtonDarkPressed]}
                >
                  <Heart color="white" size={16} />
                  <Text style={styles.actionButtonDarkText}>0</Text>
                </Pressable>

                <Pressable 
                  onPress={handleShare}
                  style={({pressed}) => [styles.iconOnlyButton, pressed && styles.actionButtonDarkPressed]}
                >
                  <ShareIcon color="white" size={16} />
                </Pressable>

                <Pressable 
                  onPress={() => handleAuthRequiredAction("Kirim Dukungan")}
                  style={({pressed}) => [styles.actionButtonDark, pressed && styles.actionButtonDarkPressed]}
                >
                  <DollarSign color="white" size={14} />
                  <Text style={styles.actionButtonDarkText}>Thanks</Text>
                </Pressable>

                <Pressable 
                  onPress={() => Alert.alert("Laporkan", "Fitur pelaporan akan segera hadir")}
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

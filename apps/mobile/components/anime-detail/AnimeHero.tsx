import React, { useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Bookmark, Forward } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AbstractBadge } from '../AbstractBadge';

interface AnimeHeroProps {
  anime: any;
  isSaved: boolean;
  isToggling: boolean;
  onToggleCollection: () => void;
  onShare: () => void;
  history: any[];
  rawEps: any[];
}

export const AnimeHero = React.memo(({ anime, isSaved, isToggling, onToggleCollection, onShare, history = [], rawEps = [] }: AnimeHeroProps) => {
  const router = useRouter();
  
  const isFinished = anime.status === "FINISHED";
  
  let scheduleDay = anime.airSchedule;
  if (!scheduleDay && anime.nextAiringEpisode?.airingAt) {
    const utc = (anime.nextAiringEpisode.airingAt * 1000) + (new Date().getTimezoneOffset() * 60000);
    const dt = new Date(utc + (7 * 3600000));
    const daysArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    scheduleDay = daysArr[dt.getDay()];
  }

  // Prioritize resume watching
  const epToPlay = useMemo(() => {
    const lastWatchedEp = [...history].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    const absoluteFirstEp = [...rawEps].sort((a,b) => {
       const numA = parseFloat(a.episodeNumber ?? a.number ?? a.url?.split("episode=").pop() ?? "0");
       const numB = parseFloat(b.episodeNumber ?? b.number ?? b.url?.split("episode=").pop() ?? "0");
       return numA - numB;
    })[0];
    return lastWatchedEp ? lastWatchedEp.episode : (absoluteFirstEp?.episodeNumber ?? absoluteFirstEp?.number ?? absoluteFirstEp?.url?.split("episode=").pop() ?? "1");
  }, [history, rawEps]);

  const title = anime.cleanTitle || anime.nativeTitle || anime.title?.english || anime.title?.romaji || anime.title;
  const img = typeof anime.coverImage === 'string' ? anime.coverImage : (anime.coverImage?.extraLarge || anime.coverImage?.large || anime.bannerImage || anime.poster || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg");
  const hasDiffTitle = !!anime.nativeTitle && anime.nativeTitle !== anime.cleanTitle;

  return (
    <View style={styles.heroSection}>
      <Image
        source={{ uri: img }}
        style={styles.heroImage}
        contentFit="cover"
        transition={300}
      />
      
      <LinearGradient
        colors={["rgba(10,8,18,0.4)", "transparent", "rgba(10,8,18,0.7)", "#0a0812"]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.heroBottom}>
        <View style={styles.heroRow}>
           <View style={styles.heroLeft}>
              <AbstractBadge 
                text={anime.status === 'NOT_YET_RELEASED' || anime.status === 'UPCOMING' ? 'Belum Tayang' : anime.format === 'MOVIE' ? 'Movie' : isFinished ? 'Tamat' : scheduleDay ? `Tiap ${scheduleDay}` : 'Sedang Tayang'}
                color={isFinished ? '#30D158' : scheduleDay ? '#FFD60A' : '#0A84FF'}
              />
              <Text style={[styles.title, { marginBottom: hasDiffTitle ? 4 : 8 }]} numberOfLines={2}>
                {title}
              </Text>
              
              {hasDiffTitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {anime.nativeTitle}
                </Text>
              )}
           </View>

           <View style={styles.heroRight}>
              <Pressable 
                 onPress={onShare}
                 style={({pressed}) => [
                   styles.bookmarkCircle, 
                   pressed && styles.pressedState
                 ]} 
               >
                 <Forward color="white" size={16} />
              </Pressable>

              <Pressable 
                 onPress={onToggleCollection}
                 disabled={isToggling}
                 style={({pressed}) => [
                   styles.bookmarkCircle, 
                   isToggling && styles.togglingState,
                   pressed && !isToggling && styles.pressedState
                 ]} 
               >
                {isToggling ? (
                  <ActivityIndicator size="small" color="#e5e5ea" />
                ) : isSaved ? (
                  <Bookmark color="#0A84FF" fill="#0A84FF" size={16} />
                ) : (
                  <Bookmark color="#e5e5ea" size={16} />
                )}
              </Pressable>

             {rawEps.length > 0 && (
               <Pressable 
                 onPress={() => router.push(`/watch/${anime.anilistId || anime.id}/${epToPlay}` as any)}
                 style={styles.heroPlayBtn}
               >
                 <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
               </Pressable>
             )}
           </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
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
  heroBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 40,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
  },
  heroLeft: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginBottom: 8,
  },
  heroRight: {
    gap: 12,
    alignItems: 'center',
    paddingBottom: 24,
  },
  bookmarkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  togglingState: {
    opacity: 0.5,
  },
  pressedState: {
    opacity: 0.8,
    transform: [{scale: 0.95}],
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
});

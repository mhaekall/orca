import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Play, Check, Star, Eye } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mutate } from 'swr';

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";

interface Props {
  id: string;
  title: string;
  img: string | null;
  banner?: string | null;
  score?: number | null;
  color?: string | null;
  epId?: string;
  rank?: number;
  variant?: 'vertical' | 'horizontal';
  isNew?: boolean;
  badge?: 'NEW' | 'BEST' | 'MOVIE';
  totalEps?: number | null;
  views?: number | null;
  progressPercent?: number; 
  isCompleted?: boolean;
}

function formatViews(v: number): string {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toString();
}

function AnimeCardInner({
  id,
  title,
  img,
  banner,
  score,
  color,
  epId,
  rank,
  variant = 'vertical',
  isNew,
  badge,
  totalEps,
  views,
  progressPercent = 0,
  isCompleted = false,
}: Props) {
  const accent = color || '#0A84FF';
  const href = `/anime/${id}`;

  const imageSrc = variant === 'horizontal' ? banner || img : img;
  const currentBadge = badge || (isNew ? 'NEW' : null);

  const handlePrefetch = () => {
    const url = `${API_URL}/api/v2/anime/${id}`;
    mutate(url);
  };

  return (
    <Link href={href} asChild>
      <Pressable onPressIn={handlePrefetch} style={styles.cardContainer}>
        <View style={[styles.imageContainer, variant === 'horizontal' ? styles.aspectHorizontal : styles.aspectVertical]}>
          <Image
            source={{ uri: imageSrc || 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg' }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={300}
          />

          <LinearGradient
            colors={['transparent', 'rgba(19, 17, 26, 0.8)']}
            style={[StyleSheet.absoluteFillObject, styles.gradient]}
          />

          {rank && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{rank}</Text>
            </View>
          )}

          {!rank && currentBadge === 'NEW' && (
            <View style={[styles.badgeTopLeft, styles.badgeNew]}>
              <Text style={styles.badgeTextBlack}>NEW</Text>
            </View>
          )}
          {!rank && currentBadge === 'BEST' && (
            <View style={[styles.badgeTopLeft, styles.badgeBest]}>
              <Text style={styles.badgeTextBlack}>BEST</Text>
            </View>
          )}
          {!rank && currentBadge === 'MOVIE' && (
            <View style={[styles.badgeTopLeft, styles.badgeMovie]}>
              <Text style={styles.badgeTextWhite}>MOVIE</Text>
            </View>
          )}

          <View style={styles.badgeTopRight}>
            <Text style={styles.badgeTextWhite}>
              {currentBadge === 'MOVIE'
                ? 'HD'
                : currentBadge === 'BEST'
                ? `${totalEps || epId || '?'} EPS`
                : `EPS ${epId || totalEps || '?'}`}
            </Text>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.statsContainer}>
              {score ? (
                <View style={styles.statBadge}>
                  <Star size={9} color="#FFD60A" fill="#FFD60A" />
                  <Text style={styles.scoreText}>{(score / 10).toFixed(1)}</Text>
                </View>
              ) : null}
              {views != null && views > 0 ? (
                <View style={styles.statBadge}>
                  <Eye size={9} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.viewsText}>{formatViews(views)}</Text>
                </View>
              ) : null}
            </View>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Check size={10} color="#30D158" />
              </View>
            )}
          </View>

          {progressPercent > 0 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progressPercent}%`, backgroundColor: accent }]} />
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'column',
    width: '100%',
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#1f1c29',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  aspectVertical: {
    aspectRatio: 2 / 3,
  },
  aspectHorizontal: {
    aspectRatio: 16 / 9,
  },
  gradient: {
    zIndex: 10,
  },
  rankBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 28,
    height: 36,
    backgroundColor: 'rgba(19, 17, 26, 0.6)',
    borderBottomRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  rankText: {
    fontWeight: '900',
    fontSize: 14,
    color: 'white',
  },
  badgeTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 20,
  },
  badgeNew: {
    backgroundColor: '#FF9500',
  },
  badgeBest: {
    backgroundColor: '#30D158',
  },
  badgeMovie: {
    backgroundColor: '#AF52DE',
  },
  badgeTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 69, 58, 0.9)',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 20,
  },
  badgeTextBlack: {
    color: 'black',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeTextWhite: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFD60A',
  },
  viewsText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
  },
  completedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    zIndex: 30,
  },
  progressBar: {
    height: '100%',
  },
  title: {
    color: '#f2f2f7',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
});

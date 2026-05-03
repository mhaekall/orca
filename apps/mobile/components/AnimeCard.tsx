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
  // TODO: remove/replace with global state when available
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

  const aspectClass = variant === 'horizontal' ? 'aspect-video' : 'aspect-[2/3]';
  const imageSrc = variant === 'horizontal' ? banner || img : img;
  const currentBadge = badge || (isNew ? 'NEW' : null);

  // Aggressive Prefetching: Ambil data detail anime saat card disentuh
  const handlePrefetch = () => {
    const url = `${API_URL}/api/v2/anime/${id}`;
    // Memanggil mutate tanpa data kedua memicu fetch ulang di background dan
    // menyimpannya di cache SWR secara otomatis
    mutate(url);
  };

  return (
    <Link href={href} asChild>
      <Pressable onPressIn={handlePrefetch} className={`flex flex-col w-full mb-4`}>
        <View className={`w-full ${aspectClass} rounded-2xl relative overflow-hidden mb-2 bg-[#1f1c29] border border-white/5`}>
          <Image
            source={{ uri: imageSrc || 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg' }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={300}
          />

          <LinearGradient
            colors={['transparent', 'rgba(19, 17, 26, 0.8)']}
            style={StyleSheet.absoluteFillObject}
            className="pointer-events-none z-10"
          />

          {rank && (
            <View className="absolute top-0 left-0 w-7 h-9 bg-[#13111a]/60 rounded-br-xl flex items-center justify-center z-20">
              <Text className="font-black text-sm text-white">{rank}</Text>
            </View>
          )}

          {!rank && currentBadge === 'NEW' && (
            <View className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#FF9500] rounded shadow-md z-20">
              <Text className="text-black text-[9px] font-black uppercase tracking-wider">NEW</Text>
            </View>
          )}
          {!rank && currentBadge === 'BEST' && (
            <View className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#30D158] rounded shadow-md z-20">
              <Text className="text-black text-[9px] font-black uppercase tracking-wider">BEST</Text>
            </View>
          )}
          {!rank && currentBadge === 'MOVIE' && (
            <View className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#AF52DE] rounded shadow-md z-20">
              <Text className="text-white text-[9px] font-black uppercase tracking-wider">MOVIE</Text>
            </View>
          )}

          <View className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#FF453A]/90 rounded shadow-md z-20">
            <Text className="text-white text-[9px] font-bold uppercase tracking-wider">
              {currentBadge === 'MOVIE'
                ? 'HD'
                : currentBadge === 'BEST'
                ? `${totalEps || epId || '?'} EPS`
                : `EPS ${epId || totalEps || '?'}`}
            </Text>
          </View>

          <View className="absolute bottom-2 left-2 right-2 z-20 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              {score ? (
                <View className="flex-row items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded">
                  <Star size={9} color="#FFD60A" fill="#FFD60A" />
                  <Text className="text-[9px] font-bold text-[#FFD60A]">{(score / 10).toFixed(1)}</Text>
                </View>
              ) : null}
              {views != null && views > 0 ? (
                <View className="flex-row items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded">
                  <Eye size={9} color="rgba(255,255,255,0.8)" />
                  <Text className="text-[9px] font-bold text-white/80">{formatViews(views)}</Text>
                </View>
              ) : null}
            </View>
            {isCompleted && (
              <View className="w-5 h-5 rounded-full bg-[#30D158]/20 flex items-center justify-center">
                <Check size={10} color="#30D158" />
              </View>
            )}
          </View>

          {progressPercent > 0 && (
            <View className="absolute bottom-0 left-0 w-full h-1 bg-white/20 z-30">
              <View className="h-full" style={{ width: `${progressPercent}%`, backgroundColor: accent }} />
            </View>
          )}
        </View>

        <Text className="text-[#f2f2f7] font-semibold text-[13px] leading-tight px-0.5" numberOfLines={2}>
          {title}
        </Text>
      </Pressable>
    </Link>
  );
}

export const AnimeCard = memo(AnimeCardInner);

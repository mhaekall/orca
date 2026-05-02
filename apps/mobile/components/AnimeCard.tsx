import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Play, Check, Star, Eye } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

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

  return (
    <Link href={href} asChild>
      <Pressable className={`flex flex-col w-full mb-4`}>
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
            <Text className="text-white/80 text-[10px] font-medium">{epId ? 'Tonton' : 'Detail'}</Text>
            <View className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Play size={12} color="white" fill="white" className="ml-0.5" />
            </View>
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

        <View className="flex-row items-center gap-2 mt-1 px-0.5">
          {score ? (
            <View className="flex-row items-center gap-0.5">
              <Star size={10} color="#FFD60A" fill="#FFD60A" />
              <Text className="text-[10px] font-bold text-[#FFD60A]">{(score / 10).toFixed(1)}</Text>
            </View>
          ) : null}
          
          {views != null && views > 0 ? (
            <View className="flex-row items-center gap-0.5">
              <Eye size={10} color="#8e8e93" />
              <Text className="text-[10px] font-bold text-[#8e8e93]">{formatViews(views)}</Text>
            </View>
          ) : null}

          {isCompleted && (
            <View className="flex-row items-center gap-0.5">
              <Check size={10} color="#30D158" />
              <Text className="text-[10px] font-bold text-[#30D158]">Selesai</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

export const AnimeCard = memo(AnimeCardInner);

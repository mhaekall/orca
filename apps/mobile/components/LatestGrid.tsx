import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { AnimeCard } from './AnimeCard';

interface Props {
  title: string;
  items: any[];
  badge?: 'NEW' | 'BEST' | 'MOVIE';
}

export function LatestGrid({ title, items, badge }: Props) {
  const [visibleCount, setVisibleCount] = useState(12);

  if (!items || items.length === 0) return null;

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <View className="mb-8 w-full">
      {title ? (
        <View className="flex-row items-center justify-between mb-4 px-4">
          <Text className="text-xl font-black text-white tracking-tight">{title}</Text>
        </View>
      ) : null}

      <View className="flex-row flex-wrap px-2">
        {visibleItems.map((a, i) => {
          const id = String(a.anilistId || a.id || '');
          if (!id) return null;
          
          return (
            <View key={`${id}-${i}`} className="w-[33.33%] px-2 mb-4">
              <AnimeCard
                id={id}
                title={a.title?.english || a.title?.romaji || a.title || ''}
                img={a.img || a.coverImage?.extraLarge || a.coverImage?.large || null}
                banner={a.banner || a.bannerImage || null}
                score={a.score || a.averageScore}
                views={a.views}
                color={a.color || a.coverImage?.color}
                epId={a.latestEpisode ? String(a.latestEpisode) : (a.episodes ? String(a.episodes) : undefined)}
                totalEps={a.episodes}
                variant="vertical"
                badge={badge}
              />
            </View>
          );
        })}
      </View>

      <View className="mt-4 flex-row justify-center gap-3 px-4">
        {hasMore && (
          <Pressable
            onPress={() => setVisibleCount(items.length)}
            className="px-6 py-2.5 bg-white/10 rounded-full border border-white/5 active:bg-white/20"
          >
            <Text className="text-sm font-bold text-white text-center">Lebih Banyak</Text>
          </Pressable>
        )}
        {visibleCount > 12 && (
          <Pressable
            onPress={() => setVisibleCount(12)}
            className="px-6 py-2.5 bg-white/5 rounded-full border border-white/5 active:bg-white/10"
          >
            <Text className="text-sm font-bold text-white/60 text-center">Lebih Sedikit</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

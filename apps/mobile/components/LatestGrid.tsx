import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
    <View style={styles.container}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {visibleItems.map((a, i) => {
          const id = String(a.anilistId || a.id || '');
          if (!id) return null;
          
          return (
            <View key={`${id}-${i}`} style={styles.gridItem}>
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

      <View style={styles.footer}>
        {hasMore && (
          <Pressable
            onPress={() => setVisibleCount(items.length)}
            style={({ pressed }) => [styles.btnMore, pressed && styles.btnMorePressed]}
          >
            <Text style={styles.btnMoreText}>Lebih Banyak</Text>
          </Pressable>
        )}
        {visibleCount > 12 && (
          <Pressable
            onPress={() => setVisibleCount(12)}
            style={({ pressed }) => [styles.btnLess, pressed && styles.btnLessPressed]}
          >
            <Text style={styles.btnLessText}>Lebih Sedikit</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900', // black
    color: 'white',
    letterSpacing: -0.5, // tracking-tight approx
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  gridItem: {
    width: '33.33%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  btnMore: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  btnMorePressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  btnMoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  btnLess: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  btnLessPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  btnLessText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
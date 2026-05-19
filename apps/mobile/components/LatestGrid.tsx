import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MediaCard } from './MediaCard';

interface Props {
  title: string;
  items: any[];
  badge?: 'NEW' | 'BEST' | 'MOVIE' | 'UPDATE';
  mediaType?: 'anime' | 'manga';
}

export function LatestGrid({ title, items, badge, mediaType = 'anime' }: Props) {
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
        {visibleItems.map((a, i) => (
          <View key={`${a.anilistId || a.id || i}-${i}`} style={styles.gridItem}>
            <MediaCard
              item={a}
              variant="vertical"
              badge={badge}
              mediaType={mediaType}
            />
          </View>
        ))}
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
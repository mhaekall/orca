import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { AnimeCard } from '../AnimeCard';

export const AnimeRecommendations = React.memo(({ relations }: { relations: any[] }) => {
  if (!relations || relations.length === 0) return null;
  return (
    <View style={styles.recommendationsSection}>
      <Text style={[styles.sectionTitle, {marginBottom: 16}]}>Anime Terkait</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll} contentContainerStyle={styles.recommendationsScrollContent}>
          {relations.map((r: any, i: number) => {
            const recId = String(r.id || r.anilistId);
            if (!recId) return null;
            return (
              <View key={i} style={styles.recommendationItem}>
                <AnimeCard 
                  id={recId} 
                  title={r.cleanTitle || r.title?.english || r.title?.romaji || r.title?.native || r.title || ''} 
                  img={typeof r.coverImage === 'string' ? r.coverImage : (typeof r.cover === 'string' ? r.cover : (r.coverImage?.extraLarge || r.coverImage?.large || r.cover || r.poster || r.image || ''))} 
                  totalEps={r.latestEpisode || r.totalEpisodes || r.episodes} 
                  variant="vertical"
                />
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  recommendationsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: 'white',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  recommendationsScroll: {
    marginHorizontal: -20,
  },
  recommendationsScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  recommendationItem: {
    width: 130,
    marginRight: 12,
  },
});

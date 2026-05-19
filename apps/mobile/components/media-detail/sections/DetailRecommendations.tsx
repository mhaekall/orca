import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MediaCard } from '../../MediaCard';

export const DetailRecommendations = React.memo(({ relations, mediaType }: { relations: any[], mediaType: 'anime' | 'manga' }) => {
  if (!relations || relations.length === 0) return null;
  return (
    <View style={styles.recommendationsSection}>
      <Text style={[styles.sectionTitle, {marginBottom: 16}]}>Konten Terkait</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll} contentContainerStyle={styles.recommendationsScrollContent}>
          {relations.map((r: any, i: number) => {
            return (
              <View key={i} style={styles.recommendationItem}>
                <MediaCard 
                  item={r}
                  mediaType={mediaType}
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

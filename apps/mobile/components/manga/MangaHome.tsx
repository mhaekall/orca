import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, RefreshControl, Pressable, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { MangaEngine } from '../../lib/manga/engine';
import { MANGA_SOURCES, getMangaSourceById } from '../../lib/manga/sources';
import { MangaItem } from '../../lib/manga/types';
import { LatestGrid } from '../LatestGrid';
import { Theme } from '../../lib/theme';

const paddingTopSafe = Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 50;

export function MangaHome() {
  const [activeSourceId, setActiveSourceId] = useState<string>(MANGA_SOURCES[0].id);
  const [items, setItems] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchManga = async () => {
    setLoading(true);
    setError(null);
    try {
      const source = getMangaSourceById(activeSourceId);
      if (!source) throw new Error("Source not found");
      const data = await MangaEngine.getHomeList(source);
      setItems(data);
    } catch (e: any) {
      console.error("Manga fetch error", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManga();
  }, [activeSourceId]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      // Increased paddingTop to 160 to ensure it clears the large header (Search Bar + Segmented Control)
      contentContainerStyle={{ paddingBottom: 110, paddingTop: paddingTopSafe + 110 }}
      refreshControl={
        <RefreshControl
          refreshing={loading && items.length > 0}
          onRefresh={fetchManga}
          tintColor="#fff"
          colors={[Theme.colors.primary]}
          progressViewOffset={140}
        />
      }
    >
      {/* Provider Selector */}
      <View style={styles.providerSection}>
        <Text style={styles.providerTitle}>Sumber Komik</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerScrollContent}>
          {MANGA_SOURCES.map((source) => {
            const isActive = activeSourceId === source.id;
            return (
              <Pressable
                key={source.id}
                onPress={() => {
                  if (!isActive) setActiveSourceId(source.id);
                }}
                style={[
                  styles.providerBadge,
                  isActive && styles.providerBadgeActive
                ]}
              >
                <Text style={[
                  styles.providerText,
                  isActive && styles.providerTextActive
                ]}>
                  {source.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Menghubungkan ke server {MANGA_SOURCES.find(s => s.id === activeSourceId)?.name}...</Text>
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Gagal memuat komik</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={fetchManga} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        items.length > 0 && (
          <LatestGrid title="Update Terbaru" items={items} badge="UPDATE" mediaType="manga" />
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  providerSection: {
    marginBottom: 24,
  },
  providerTitle: {
    paddingHorizontal: 16,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  providerBadge: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  providerBadgeActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderColor: '#0A84FF',
  },
  providerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: 'bold',
  },
  providerTextActive: {
    color: '#0A84FF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 16,
    fontWeight: '500',
  },
  errorTitle: {
    color: Theme.colors.danger,
    marginBottom: 8,
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  retryBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

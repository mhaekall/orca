import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Dimensions, StyleSheet } from "react-native";
import { Bookmark, RefreshCcw } from "lucide-react-native";
import useSWR from "swr";
import { useAuth } from "../../lib/auth";
import { AnimeCard } from "../../components/AnimeCard";
import { Skeleton } from "../../components/Skeleton";

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CollectionScreen() {
  const { user, isLoading: authLoading, signInWithGoogle } = useAuth();
  const userId = user?.id || user?.email; // fallback to email for mock user

  const { data: collectionResponse, isLoading: collectionLoading, error, mutate } = useSWR(
    userId ? `${API_URL}/api/v2/collection?user_id=${userId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  const rawItems = Array.isArray(collectionResponse) ? collectionResponse : (collectionResponse?.data || []);
  
  const sortedItems = [...rawItems].map((h: any) => ({
    id: String(h.animeSlug || h.anilistId),
    title: h.cleanTitle || h.nativeTitle || h.animeTitle || `Anime #${h.animeSlug}`,
    img: h.coverImage || h.animeCover,
    totalEps: h.totalEpisodes || 0,
    status: h.status,
    progress: h.progress || 0,
    updatedAt: new Date(h.updatedAt).getTime()
  })).sort((a, b) => b.updatedAt - a.updatedAt);

  const windowWidth = Dimensions.get('window').width;
  const padding = 24; // px-6 is 24px
  const gap = 12; // gap-3
  // 3 columns
  const itemWidth = (windowWidth - (padding * 2) - (gap * 2)) / 3;

  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerFixed}>
          <Skeleton w={140} h={32} r={8} />
        </View>
        <View style={styles.gridContainer}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={{ width: itemWidth, marginBottom: 16 }}>
               <Skeleton w="100%" h={itemWidth * 1.5} r={16} style={{ marginBottom: 8 }} />
               <Skeleton w="90%" h={14} r={6} style={{ marginBottom: 4 }} />
               <Skeleton w="60%" h={14} r={6} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Fixed */}
      <View style={styles.headerFixed}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>
            Koleksi
          </Text>
          {sortedItems.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeText}>{sortedItems.length} Judul</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.scrollContainer}
      >
        {!user ? (
          <View style={styles.emptyState}>
            <View style={styles.iconCircle}>
              <Bookmark size={40} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={styles.emptyTitle}>Silakan Login</Text>
            <Text style={styles.emptyDesc}>
              Simpan anime yang ingin Anda tonton untuk diakses di perangkat mana pun.
            </Text>
            <Pressable 
              onPress={signInWithGoogle}
              style={styles.loginButton}
            >
              <Text style={styles.loginText}>Login dengan Google</Text>
            </Pressable>
          </View>
        ) : collectionLoading ? (
          <View style={styles.gridList}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={{ width: itemWidth, marginBottom: 16 }}>
                 <Skeleton w="100%" h={itemWidth * 1.5} r={16} style={{ marginBottom: 8 }} />
                 <Skeleton w="90%" h={14} r={6} style={{ marginBottom: 4 }} />
                 <Skeleton w="60%" h={14} r={6} />
              </View>
            ))}
          </View>
        ) : error ? (
           <View style={styles.emptyState}>
            <Text style={styles.errorText}>Gagal memuat koleksi</Text>
            <Pressable onPress={() => mutate()} style={styles.retryButton}>
              <RefreshCcw size={14} color="white" />
              <Text style={styles.retryText}>Coba Lagi</Text>
            </Pressable>
          </View>
        ) : sortedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.iconCircle}>
              <Bookmark size={40} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={styles.emptyTitle}>Belum ada koleksi</Text>
            <Text style={styles.emptyDesc}>
              Simpan anime yang ingin Anda tonton di sini.
            </Text>
          </View>
        ) : (
          <View style={styles.gridList}>
            {sortedItems.map((item) => (
              <View key={item.id} style={{ width: itemWidth }}>
                <AnimeCard
                  id={item.id}
                  title={item.title}
                  img={item.img}
                  totalEps={item.totalEps}
                  epId={item.progress ? String(item.progress) : undefined}
                  variant="vertical"
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0812'
  },
  headerFixed: {
    paddingTop: 64,
    paddingBottom: 16,
    backgroundColor: '#0a0812',
    zIndex: 10,
    paddingHorizontal: 24
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.5,
    marginBottom: 4
  },
  badgeCount: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)'
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24
  },
  scrollContainer: {
    paddingBottom: 120,
    paddingTop: 20
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#1f1c29',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  emptyTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 8
  },
  emptyDesc: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 250
  },
  loginButton: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999
  },
  loginText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '500'
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14
  },
  gridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  }
});
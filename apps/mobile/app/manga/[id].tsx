import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, BookOpen } from 'lucide-react-native';
import { Theme } from '../../lib/theme';
import { MangaEngine } from '../../lib/manga/engine';
import { getMangaSourceById } from '../../lib/manga/sources';
import { MangaDetail } from '../../lib/manga/types';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AbstractBadge } from '../../components/AbstractBadge';

const paddingTopSafe = Platform.OS === "android" ? 30 : 50;

export default function MangaDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [detail, setDetail] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        // ID format is "sourceId|encodedUrl"
        const [sourceId, encodedUrl] = String(id).split('|');
        const sourceRule = getMangaSourceById(sourceId);
        
        if (sourceRule) {
          const url = decodeURIComponent(encodedUrl);
          
          const data = await MangaEngine.getDetail(sourceRule, url);
          setDetail(data);
        } else {
          throw new Error("Source not found or unsupported.");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Membuka Komik...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: 'white' }}>Gagal memuat detail komik.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20, padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10 }}>
          <Text style={{ color: 'white' }}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Top Bar Floating */}
      <View style={styles.headerContainer}>
        <View style={styles.headerIconsRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="white" size={24} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Hero Cover */}
        <View style={styles.heroSection}>
          <Image source={{ uri: detail.img }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <LinearGradient colors={["rgba(10,8,18,0.4)", "transparent", "rgba(10,8,18,0.8)", "#0a0812"]} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFillObject} />
          
          <View style={styles.heroBottom}>
             <AbstractBadge text={detail.status} color="#FF9F0A" />
             <Text style={styles.title} numberOfLines={2}>{detail.title}</Text>
             <Text style={styles.authorText}>Karya: {detail.author}</Text>
          </View>
        </View>

        {/* Info & Synopsis */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={styles.genresContainer}>
            {detail.genres.map(g => (
              <View key={g} style={styles.genreBadge}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Sinopsis</Text>
          <Text style={styles.synopsisText}>{detail.synopsis}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 16 }]}>Daftar Chapter ({detail.chapters.length})</Text>
          
          {detail.chapters.map((ch, i) => {
            const nextCh = i > 0 ? detail.chapters[i - 1] : null;
            return (
              <Pressable 
                key={ch.id} 
                onPress={() => {
                   router.push(`/manga/read?link=${encodeURIComponent(ch.link)}&sourceId=${detail.sourceId}&mangaId=${encodeURIComponent(detail.id)}&title=${encodeURIComponent(detail.title)}&chapter=${encodeURIComponent(ch.number)}${nextCh ? `&nextChapterLink=${encodeURIComponent(nextCh.link)}&nextChapterNum=${encodeURIComponent(nextCh.number)}` : ''}` as any);
                }}
                style={styles.chapterItem}
              >
                <View style={styles.chapterInfo}>
                  <BookOpen size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 12 }} />
                  <Text style={styles.chapterText}>{ch.number}</Text>
                </View>
                {ch.date && <Text style={styles.chapterDate}>{ch.date}</Text>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0812' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0812', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.6)', marginTop: 12, fontWeight: '500' },
  headerContainer: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100 },
  headerIconsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: paddingTopSafe + 10, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: "center", justifyContent: "center" },
  heroSection: { width: '100%', aspectRatio: 1, position: 'relative', backgroundColor: '#1f1c29' },
  heroBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 },
  title: { color: "#fff", fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28, marginBottom: 4 },
  authorText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  genresContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  genreBadge: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  genreText: { color: 'white', fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  synopsisText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22 },
  chapterItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  chapterInfo: { flexDirection: 'row', alignItems: 'center' },
  chapterText: { color: 'white', fontSize: 15, fontWeight: '600' },
  chapterDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
});
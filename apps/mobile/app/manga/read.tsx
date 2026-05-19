import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Text, Animated, StatusBar as RNStatusBar, Platform, Modal, Alert, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Settings, X, Check, Lock, Unlock, Download, CheckCircle } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import { Theme } from '../../lib/theme';
import { MangaEngine } from '../../lib/manga/engine';
import { getMangaSourceById } from '../../lib/manga/sources';
import { AutoHeightImage } from '../../components/manga/AutoHeightImage';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { HF_API_URL } from '../../lib/config';
import { fetchWithAuth } from '../../lib/fetcher';
import { CommentSection } from '../../components/CommentSection';

export default function MangaReaderScreen() {
  const { link, sourceId, mangaId, title, img, chapter, nextChapterLink, nextChapterNum } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [readMode, setReadMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [bgColor, setBgColor] = useState<'#000000' | '#ffffff' | '#13111a'>('#000000');
  const [imageScale, setImageScale] = useState<'fill' | 'contain'>('fill');

  // Download State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // UI toggles
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // History Tracker
  const maxViewedRef = useRef(0);
  const lastSyncRef = useRef(0);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const rules = getMangaSourceById(String(sourceId));
        if (!rules) throw new Error("Manga source not supported.");

        // Clean link if it's encoded
        const targetLink = decodeURIComponent(String(link));
        const imgs = await MangaEngine.getChapterImages(rules, targetLink);
        setImages(imgs);
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (link) fetchImages();

    hideTimeout.current = setTimeout(() => {
      toggleControls(false);
    }, 3000);

    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [link, sourceId]);

  const toggleControls = (forceState?: boolean) => {
    if (isSettingsOpen || isLocked) return; 
    const newState = forceState !== undefined ? forceState : !controlsVisible;
    if (newState) {
      setControlsVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      hideTimeout.current = setTimeout(() => toggleControls(false), 3000);
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setControlsVisible(false));
    }
  };

  const handleLock = () => {
    setIsLocked(true);
    toggleControls(false);
  };

  const handleUnlock = () => {
    setIsLocked(false);
    toggleControls(true);
  };

  const handleDownload = async () => {
    if (!images || images.length === 0) return;
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const sanitizedChapter = String(chapter).replace(/[^a-zA-Z0-9-]/g, '_');
      const dirPath = `${FileSystem.documentDirectory}manga_downloads/${sourceId}/${sanitizedChapter}/`;
      
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }

      for (let i = 0; i < images.length; i++) {
        const uri = images[i];
        const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
        const fileUri = `${dirPath}page_${String(i).padStart(3, '0')}.${ext}`;
        
        await FileSystem.downloadAsync(uri, fileUri);
        setDownloadProgress((i + 1) / images.length);
      }

      Alert.alert("Unduhan Selesai", `Chapter ${chapter} berhasil diunduh untuk dibaca offline.`);
    } catch (e: any) {
      console.error("Download Error", e);
      Alert.alert("Unduhan Gagal", "Terjadi kesalahan saat mengunduh chapter ini.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (!user || images.length === 0 || !mangaId) return;

    let highest = maxViewedRef.current;
    for (const v of viewableItems) {
      if (v.index !== null && v.index > highest) highest = v.index;
    }

    if (highest > maxViewedRef.current) {
      maxViewedRef.current = highest;
      
      const now = Date.now();
      // Sync every 5 pages or if at the end, to prevent spamming
      if (highest - lastSyncRef.current >= 5 || highest === images.length - 1) {
         lastSyncRef.current = highest;
         
         const progressSeconds = highest + 1;
         const durationSeconds = images.length;
         const isCompleted = progressSeconds >= durationSeconds - 1;

         // Get clean episode number string (extract numbers)
         const match = String(chapter).match(/[\d.]+/);
         const epNum = match ? parseFloat(match[0]) : 1.0;

         fetchWithAuth(`${HF_API_URL}/api/v2/social/progress`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             user_id: user.id,
             anilistId: String(mangaId),
             episodeNumber: epNum,
             progressSeconds,
             durationSeconds,
             isCompleted,
             title: title,
             coverImage: img,
             mediaType: 'manga'
           }),
         }).catch(() => {});
      }
    }
  }, [user, images.length, mangaId, chapter]);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50, minimumViewTime: 500 }).current;

  const renderItem = ({ item, index }: { item: string, index: number }) => (
    <Pressable onPress={() => toggleControls()}>
      <AutoHeightImage uri={item} isFirst={index === 0} scaleType={imageScale} isHorizontal={readMode === 'horizontal'} />
    </Pressable>
  );

  const match = String(chapter).match(/[\d.]+/);
  const epNum = match ? match[0] : "1";

  const renderFooter = () => (
    <View style={styles.footerComponentContainer}>
      <CommentSection 
        anilistId={String(mangaId)} 
        episode={epNum} 
        user={user} 
        visible={true} 
        onClose={() => {}} 
        isFullscreen={false}
      />
      
      {nextChapterLink && (
        <View style={styles.nextChapterSection}>
          <Pressable 
            style={({pressed}) => [styles.nextChapterBtn, pressed && styles.nextChapterBtnPressed]}
            onPress={() => {
              // Gunakan replace untuk clear stack memori pembaca sebelumnya
              router.replace(`/manga/read?link=${encodeURIComponent(String(nextChapterLink))}&sourceId=${sourceId}&mangaId=${mangaId}&title=${encodeURIComponent(String(title))}&chapter=${encodeURIComponent(String(nextChapterNum))}` as any);
            }}
          >
            <Text style={styles.nextChapterBtnText}>Chapter {nextChapterNum} Selanjutnya</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen options={{ headerShown: false, navigationBarColor: bgColor }} />
      <StatusBar hidden={!controlsVisible && !isSettingsOpen && !isLocked} style={bgColor === '#ffffff' ? "dark" : "light"} />

      {/* Reader Content */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="auto">
        {loading ? (
          <View style={[styles.centerContainer, { backgroundColor: bgColor }]}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={[styles.loadingText, bgColor === '#ffffff' && { color: '#666' }]}>Menyiapkan lembaran...</Text>
          </View>
        ) : error ? (
          <View style={[styles.centerContainer, { backgroundColor: bgColor }]}>
            <Text style={styles.errorText}>Gagal memuat chapter</Text>
            <Text style={[styles.errorSubText, bgColor === '#ffffff' && { color: '#666' }]}>{error}</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlashList
              data={images}
              keyExtractor={(item, index) => String(index)}
              renderItem={renderItem}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              horizontal={readMode === 'horizontal'}
              pagingEnabled={readMode === 'horizontal'}
              contentContainerStyle={styles.listContent}
              estimatedItemSize={Dimensions.get('window').width * 1.5}
              bounces={false}
              onScrollBeginDrag={() => {
                if (controlsVisible) toggleControls(false);
              }}
              ListFooterComponent={renderFooter}
            />
          </View>
        )}
      </View>

      {/* Floating Unlock Button when locked */}
      {isLocked && (
        <Pressable 
          onPress={handleUnlock} 
          style={[styles.floatingUnlockBtn, { bottom: insets.bottom + 40 }]}
        >
          <Unlock color="white" size={20} />
        </Pressable>
      )}

      {/* Top Header Overlay */}
      <Animated.View 
        style={[styles.headerOverlay, { paddingTop: insets.top + 10, opacity: fadeAnim }]} 
        pointerEvents={controlsVisible && !isLocked ? 'auto' : 'none'}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft color="white" size={24} />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.titleText} numberOfLines={1}>{title || 'Membaca Komik'}</Text>
            <Text style={styles.chapterText}>{chapter || ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={handleDownload} style={styles.iconBtn}>
              {isDownloading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{Math.round(downloadProgress * 100)}%</Text>
                </View>
              ) : (
                <Download color="white" size={20} />
              )}
            </Pressable>
            <Pressable onPress={handleLock} style={styles.iconBtn}>
              <Lock color="white" size={20} />
            </Pressable>
            <Pressable onPress={() => { setIsSettingsOpen(true); setControlsVisible(true); }} style={styles.iconBtn}>
              <Settings color="white" size={20} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* Bottom Footer Overlay */}
      <Animated.View 
        style={[styles.footerOverlay, { paddingBottom: insets.bottom + 10, opacity: fadeAnim }]} 
        pointerEvents={controlsVisible && !isLocked ? 'auto' : 'none'}
      >
        <View style={styles.footerRow}>
           <Text style={styles.footerText}>
             {images.length > 0 ? `${images.length} Halaman` : ''}
           </Text>
        </View>
      </Animated.View>

      {/* Settings Modal */}
      <Modal visible={isSettingsOpen} transparent animationType="slide" onRequestClose={() => setIsSettingsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsSettingsOpen(false)} />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pengaturan Membaca</Text>
            <Pressable onPress={() => setIsSettingsOpen(false)} style={{ padding: 4 }}>
              <X color="white" size={20} />
            </Pressable>
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Mode Baca</Text>
            <View style={styles.rowButtons}>
              <Pressable onPress={() => setReadMode('vertical')} style={[styles.optionBtn, readMode === 'vertical' && styles.optionBtnActive]}>
                <Text style={[styles.optionText, readMode === 'vertical' && styles.optionTextActive]}>Webtoon (Vertical)</Text>
              </Pressable>
              <Pressable onPress={() => setReadMode('horizontal')} style={[styles.optionBtn, readMode === 'horizontal' && styles.optionBtnActive]}>
                <Text style={[styles.optionText, readMode === 'horizontal' && styles.optionTextActive]}>Manga (Geser)</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Warna Latar</Text>
            <View style={styles.rowButtons}>
              {['#000000', '#13111a', '#ffffff'].map(c => (
                <Pressable key={c} onPress={() => setBgColor(c as any)} style={[styles.colorBtn, { backgroundColor: c }, bgColor === c && styles.colorBtnActive]}>
                  {bgColor === c && <Check color={c === '#ffffff' ? 'black' : 'white'} size={16} />}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Skala Gambar</Text>
            <View style={styles.rowButtons}>
              <Pressable onPress={() => setImageScale('fill')} style={[styles.optionBtn, imageScale === 'fill' && styles.optionBtnActive]}>
                <Text style={[styles.optionText, imageScale === 'fill' && styles.optionTextActive]}>Penuh Layar</Text>
              </Pressable>
              <Pressable onPress={() => setImageScale('contain')} style={[styles.optionBtn, imageScale === 'contain' && styles.optionBtnActive]}>
                <Text style={[styles.optionText, imageScale === 'contain' && styles.optionTextActive]}>Muat Asli</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' }, // Pure black for seamless edges
  listContent: { paddingBottom: 0 }, // No padding so last image touches bottom
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  loadingText: { color: 'rgba(255,255,255,0.4)', marginTop: 16, fontWeight: '600', fontSize: 13 },
  errorText: { color: Theme.colors.danger, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  errorSubText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },
  
  headerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 10,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  titleText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  chapterText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center'
  },

  footerOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 10,
    paddingTop: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: 'bold',
  },

  floatingUnlockBtn: {
    position: 'absolute',
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: '#13111a', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  settingGroup: { marginBottom: 24 },
  settingLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowButtons: { flexDirection: 'row', gap: 12 },
  optionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  optionBtnActive: { backgroundColor: 'rgba(10, 132, 255, 0.15)', borderColor: '#0A84FF' },
  optionText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  optionTextActive: { color: '#0A84FF' },
  colorBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  colorBtnActive: { borderColor: '#0A84FF' },
  footerComponentContainer: {
    paddingBottom: 60,
    backgroundColor: '#0a0812',
  },
  nextChapterSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  nextChapterBtn: {
    backgroundColor: '#0A84FF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 9999,
    width: '100%',
    alignItems: 'center',
  },
  nextChapterBtnPressed: {
    backgroundColor: 'rgba(10, 132, 255, 0.8)',
  },
  nextChapterBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
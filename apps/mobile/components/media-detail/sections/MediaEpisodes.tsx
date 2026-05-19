import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MediaEpisodesProps {
  mediaId: string;
  mediaType: 'anime' | 'manga';
  rawEps: any[];
  title?: string;
  img?: string;
  activeEpisode?: string;
  onEpisodePress?: (ep: string) => void;
}

export const MediaEpisodes = React.memo(({ 
  mediaId, 
  mediaType,
  rawEps, 
  title = '',
  img = '',
  activeEpisode, 
  onEpisodePress 
}: MediaEpisodesProps) => {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [epChunkIndex, setEpChunkIndex] = useState(0);
  const [epsSort, setEpsSort] = useState<'desc' | 'asc'>('desc');

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem('mediaDetailSort').then((sort) => {
      if (sort === 'desc' || sort === 'asc') setEpsSort(sort);
      setIsReady(true);
    });
  }, []);

  const eps = useMemo(() => {
    const sorted = [...(rawEps || [])];
    sorted.sort((a: any, b: any) => {
      const numA = parseFloat(a.episodeNumber ?? a.number ?? a.url?.split("episode=").pop() ?? "0");
      const numB = parseFloat(b.episodeNumber ?? b.number ?? b.url?.split("episode=").pop() ?? "0");
      return epsSort === 'asc' ? numA - numB : numB - numA;
    });
    return sorted;
  }, [rawEps, epsSort]);

  const isManualScrolling = useRef(false);

  const handleChunkPress = useCallback((index: number) => {
    setEpChunkIndex(index);
    isManualScrolling.current = true;
    
    const targetIndex = index * 6;
    if (flatListRef.current && eps.length > targetIndex) {
      try {
        const offsetVal = targetIndex * 66; 
        flatListRef.current.scrollToOffset({ offset: offsetVal, animated: true });
      } catch (e) {
        console.warn("Scroll failed:", e);
      }
    }
    
    setTimeout(() => {
      isManualScrolling.current = false;
    }, 500);
  }, [eps]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!isManualScrolling.current && viewableItems && viewableItems.length > 0) {
      const firstVisible = viewableItems[0].index;
      if (firstVisible !== null && firstVisible !== undefined) {
        const newChunk = Math.floor(firstVisible / 6);
        if (newChunk >= 0) setEpChunkIndex(newChunk);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50, minimumViewTime: 100 }).current;

  if (!isReady) {
    return (
      <View style={[styles.episodesSection, { alignItems: 'center', justifyContent: 'center', height: 200 }]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  const listLabel = mediaType === 'manga' ? 'Daftar Chapter' : 'Daftar Episode';
  const countLabel = mediaType === 'manga' ? 'Chap' : 'Eps';

  if (!eps || eps.length === 0) {
    return (
      <View style={styles.episodesSection}>
        <View style={styles.episodesHeader}>
          <Text style={styles.sectionTitle}>{listLabel}</Text>
        </View>
        <View style={styles.emptyEpisodes}>
          <Text style={styles.emptyEpisodesText}>Belum ada {mediaType === 'manga' ? 'chapter' : 'episode'} tersedia.</Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item: ep }: { item: any, index: number }) => {
    const epNum = ep.episodeNumber ?? ep.number ?? ep.url?.split("episode=").pop() ?? "?";
    const isActive = activeEpisode === String(epNum);
    
    const handlePress = () => {
      if (onEpisodePress) {
        onEpisodePress(String(epNum));
      } else if (mediaType === 'manga') {
        const actualSourceId = (ep.id && ep.id.includes('|')) 
          ? ep.id.split('|')[0] 
          : (mediaId.includes('|') ? mediaId.split('|')[0] : 'komikindo');
        router.push({
          pathname: '/manga/read',
          params: {
            link: ep.link || ep.episodeUrl || ep.url,
            sourceId: actualSourceId,
            mangaId: mediaId,
            title: title,
            img: img,
            chapter: epNum
          }
        } as any);
      } else {
        router.push(`/watch/${mediaId}/${epNum}` as any);
      }
    };

    return (
      <Pressable 
        onPress={handlePress}
        style={({pressed}) => [
          styles.scrollEpisodeItem,
          isActive ? styles.episodeItemActive : styles.episodeItemInactive,
          pressed && !isActive && styles.episodeItemPressed
        ]}
      >
        <Text style={[styles.scrollEpisodeText, isActive ? styles.episodeTextActive : styles.episodeTextInactive]}>
          {epNum}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.episodesSection}>
      <View style={styles.episodesHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{listLabel}</Text>
          <Text style={styles.episodesCountText}>{eps.length} {countLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable 
            onPress={() => {
              const nextSort = epsSort === 'asc' ? 'desc' : 'asc';
              setEpsSort(nextSort);
              AsyncStorage.setItem('mediaDetailSort', nextSort);
              setEpChunkIndex(0);
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            style={({pressed}) => [styles.episodesToggleButton, pressed && styles.episodesToggleButtonPressed]}
          >
            {epsSort === 'asc' ? <ArrowUp size={16} color="#0A84FF" /> : <ArrowDown size={16} color="#0A84FF" />}
          </Pressable>
        </View>
      </View>
      
      <View>
        {eps.length > 6 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chunkScroll} contentContainerStyle={styles.chunkScrollContent}>
              {Array.from({ length: Math.ceil(eps.length / 6) }).map((_, i) => {
                const chunk = eps.slice(i * 6, (i + 1) * 6);
                if (chunk.length === 0) return null;
                
                const getNum = (e: any) => e.episodeNumber ?? e.number ?? e.url?.split("episode=").pop() ?? "?";
                const firstNum = getNum(chunk[0]);
                const lastNum = getNum(chunk[chunk.length - 1]);
                
                const label = epsSort === 'asc' ? `${countLabel} ${firstNum} - ${lastNum}` : `${countLabel} ${lastNum} - ${firstNum}`;
                const isActive = epChunkIndex === i;

                return (
                  <Pressable 
                    key={i} 
                    onPress={() => handleChunkPress(i)}
                    style={[styles.chunkButton, isActive ? styles.chunkButtonActive : styles.chunkButtonInactive]}
                  >
                    <Text style={[styles.chunkButtonText, isActive ? styles.chunkTextActive : styles.chunkTextInactive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
          </ScrollView>
        )}
        
        <FlatList
          ref={flatListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.episodesScroll}
          contentContainerStyle={styles.episodesScrollContent}
          data={eps}
          keyExtractor={(item, index) => String(item.episodeNumber ?? item.number ?? index)}
          renderItem={renderItem}
          getItemLayout={(data, index) => ({ length: 66, offset: 66 * index, index })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
            }, 100);
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  episodesSection: {
    marginBottom: 32,
  },
  episodesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    color: 'white',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  episodesCountText: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyEpisodes: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
  },
  emptyEpisodesText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '500',
  },
  chunkScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  chunkScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chunkButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginRight: 8,
  },
  chunkButtonActive: {
    backgroundColor: 'white',
  },
  chunkButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chunkButtonText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  chunkTextActive: {
    color: 'black',
  },
  chunkTextInactive: {
    color: '#8e8e93',
  },
  episodesToggleButton: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodesToggleButtonPressed: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
  },
  episodesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  episodesScrollContent: {
    paddingRight: 40,
    gap: 10,
  },
  scrollEpisodeItem: {
    height: 40,
    width: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  episodeItemActive: {
    backgroundColor: 'white',
    borderColor: 'white',
  },
  episodeItemInactive: {
    backgroundColor: '#1f1c29',
    borderColor: 'transparent',
  },
  episodeItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scrollEpisodeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  episodeTextActive: {
    color: 'black',
  },
  episodeTextInactive: {
    color: '#8e8e93',
  },
});

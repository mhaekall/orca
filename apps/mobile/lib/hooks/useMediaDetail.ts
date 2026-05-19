import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { API_URL } from '../config';
import { fetcher } from '../fetcher';
import { normalizeMediaDetail, UnifiedMediaDetail } from '../adapters/mediaAdapter';
import { MangaEngine } from '../manga/engine';
import { MANGA_SOURCES, getMangaSourceById } from '../manga/sources';

export function useMediaDetail(id: string, mediaType: 'anime' | 'manga') {
  const [bridgedChapters, setBridgedChapters] = useState<any[]>([]);
  const [isBridging, setIsBridging] = useState(false);
  const [legacyData, setLegacyData] = useState<UnifiedMediaDetail | null>(null);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState<any>(null);

  const isLegacyManga = mediaType === 'manga' && id && id.includes('|');

  // Fetch AniList metadata from Backend
  const endpoint = isLegacyManga ? null : (mediaType === 'anime' 
    ? `${API_URL}/api/v2/anime/${id}` 
    : `${API_URL}/api/v2/manga/${id}`);

  const { data: rawRes, error: swrError, isLoading: swrLoading, mutate: swrMutate } = useSWR(endpoint, fetcher);

  const rawData = rawRes?.data;
  const title = rawData?.cleanTitle || rawData?.title?.english || rawData?.title?.romaji || rawData?.title;

  // Background task to bridge Anilist title with scraped manga chapters
  useEffect(() => {
    if (mediaType === 'manga' && !isLegacyManga && title && bridgedChapters.length === 0 && !isBridging) {
      const bridgeManga = async () => {
        setIsBridging(true);
        try {
          const res = await MangaEngine.findAndGetDetail(MANGA_SOURCES, title);
          if (res && res.chapters) {
            const formatted = res.chapters.map(ch => ({
              ...ch,
              episodeNumber: parseFloat(ch.number.replace(/[^\d.]/g, '') || '0') || ch.number,
              episodeUrl: ch.link,
            }));
            setBridgedChapters(formatted);
          }
        } catch (e) {
          console.error("Bridging failed:", e);
        } finally {
          setIsBridging(false);
        }
      };
      bridgeManga();
    }
  }, [title, mediaType, isLegacyManga]);

  // Handle Legacy Manga Data (Manual fetch since it uses MangaEngine)
  const fetchLegacyManga = useCallback(async () => {
    if (!isLegacyManga || !id) return;
    
    setLegacyLoading(true);
    setLegacyError(null);
    try {
      const [sourceId, encodedUrl] = id.split('|');
      const sourceRule = getMangaSourceById(sourceId);
      
      if (sourceRule) {
        const url = decodeURIComponent(encodedUrl);
        const raw = await MangaEngine.getDetail(sourceRule, url);
        setLegacyData(normalizeMediaDetail(raw));
      } else {
        throw new Error("Manga source not supported.");
      }
    } catch (e) {
      setLegacyError(e);
    } finally {
      setLegacyLoading(false);
    }
  }, [id, isLegacyManga]);

  useEffect(() => {
    if (isLegacyManga) {
      fetchLegacyManga();
    }
  }, [fetchLegacyManga, isLegacyManga]);

  let normalizedData: UnifiedMediaDetail | null = null;
  
  if (isLegacyManga) {
    normalizedData = legacyData;
  } else if (rawData) {
    normalizedData = normalizeMediaDetail(rawData);
    if (mediaType === 'manga') {
      normalizedData.episodes = bridgedChapters;
      if (bridgedChapters.length > 0) {
        normalizedData.totalEpisodes = bridgedChapters.length;
      }
    }
  }

  return {
    data: normalizedData,
    isLoading: isLegacyManga ? legacyLoading : swrLoading,
    isBridging: isLegacyManga ? false : isBridging,
    error: isLegacyManga ? legacyError : swrError,
    mutate: isLegacyManga ? fetchLegacyManga : swrMutate
  };
}

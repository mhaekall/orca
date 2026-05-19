import { useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { API_URL } from '../config';
import { fetcher } from '../fetcher';
import { normalizeMediaDetail, UnifiedMediaDetail } from '../adapters/mediaAdapter';
import { MangaEngine } from '../manga/engine';
import { MANGA_SOURCES, getMangaSourceById } from '../manga/sources';

/**
 * Custom fetcher for legacy manga (scraped URL).
 */
async function legacyMangaFetcher(id: string) {
  const [sourceId, encodedUrl] = id.split('|');
  const sourceRule = getMangaSourceById(sourceId);
  if (sourceRule) {
    const url = decodeURIComponent(encodedUrl);
    const raw = await MangaEngine.getDetail(sourceRule, url);
    return normalizeMediaDetail(raw);
  }
  throw new Error("Manga source not supported.");
}

/**
 * Primary hook for fetching media details. Manga chapters are now natively populated by the backend API.
 */
export function useMediaDetail(id: string, mediaType: 'anime' | 'manga') {
  const isLegacyManga = mediaType === 'manga' && id && id.includes('|');

  // 1. Fetch metadata (AniList + API Backend chapters)
  const metaKey = isLegacyManga ? null : (mediaType === 'anime' 
    ? `${API_URL}/api/v2/anime/${id}` 
    : `${API_URL}/api/v2/manga/${id}`);
  const { data: metaRes, error: metaError, isLoading: metaLoading, mutate: metaMutate } = useSWR(metaKey, fetcher);
  
  const rawData = metaRes?.data;

  // 2. Legacy Manga handling
  const legacyKey = isLegacyManga ? `legacy:${id}` : null;
  const { data: legacyData, error: legacyError, isLoading: legacyLoading, mutate: legacyMutate } = useSWR(legacyKey, () => legacyMangaFetcher(id));

  // Data Normalization & Merging
  let normalizedData: UnifiedMediaDetail | null = null;
  
  if (isLegacyManga) {
    normalizedData = legacyData || null;
  } else if (rawData) {
    normalizedData = normalizeMediaDetail(rawData);
  }

  return {
    data: normalizedData,
    isLoading: metaLoading || legacyLoading,
    isBridging: false,
    error: metaError || legacyError,
    mutate: isLegacyManga ? legacyMutate : metaMutate
  };
}

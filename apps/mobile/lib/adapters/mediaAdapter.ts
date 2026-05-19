/**
 * Data Adapter for normalizing inconsistent API responses into a unified internal format.
 * This prevents "property soup" in UI components and ensures type safety.
 */

export interface UnifiedMediaItem {
  id: string;
  title: string;
  nativeTitle?: string;
  imageUrl: string;
  bannerUrl?: string;
  episode: string;
  score: number;
  views: number;
  genres: string[];
  status?: string;
  format?: string;
  color?: string;
}

export interface UnifiedMediaDetail extends UnifiedMediaItem {
  synopsis: string;
  author: string;
  studios: string[];
  season?: string;
  seasonYear?: number;
  totalEpisodes?: number;
  nextAiringEpisode?: any;
  relations: any[];
  episodes: any[];
}

export function normalizeMediaItem(item: any): UnifiedMediaItem {
  if (!item) {
    return {
      id: '',
      title: 'Unknown',
      imageUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg',
      episode: '?',
      score: 0,
      views: 0,
      genres: [],
    };
  }

  // ID Resolution - Prioritize Anilist ID for correct routing
  const id = String(
    item.anilistId || 
    item.anilist_id || 
    item.id || 
    item.animeSlug || 
    ''
  );

  // Title Resolution
  const title = (
    item.cleanTitle || 
    item.title?.english || 
    item.title?.romaji || 
    item.title?.userPreferred ||
    (typeof item.title === 'string' ? item.title : '') ||
    'Unknown Title'
  );

  const nativeTitle = item.nativeTitle || item.title?.native || '';

  // Image Resolution (Poster/Cover)
  let imageUrl = (
    item.poster || 
    item.img || 
    item.coverImage?.extraLarge || 
    item.coverImage?.large || 
    item.coverImage?.medium ||
    (typeof item.coverImage === 'string' ? item.coverImage : '') ||
    item.image ||
    ''
  );
  
  if (!imageUrl && item.bannerImage) imageUrl = item.bannerImage;
  if (!imageUrl) imageUrl = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg';

  // Banner Resolution
  const bannerUrl = item.banner || item.bannerImage || item.coverImage?.extraLarge || '';

  // Episode/Progress Resolution
  const episode = String(
    item.latestChapter || 
    item.latestEpisode || 
    item.episodeNumber || 
    item.number || 
    item.episode || 
    item.progress ||
    '1'
  );

  // Stats Resolution
  const score = item.score || item.averageScore || 0;
  const views = item.views || item.popularity || 0;

  // Metadata
  const genres = Array.isArray(item.genres) ? item.genres : [];
  const status = String(item.status || '').toUpperCase();
  const format = String(item.format || '').toUpperCase();
  const color = item.color || item.coverImage?.color || null;

  return {
    id,
    title,
    nativeTitle,
    imageUrl,
    bannerUrl,
    episode,
    score,
    views,
    genres,
    status,
    format,
    color,
  };
}

export function normalizeMediaDetail(item: any): UnifiedMediaDetail {
  const base = normalizeMediaItem(item);
  
  const episodes = Array.isArray(item.episodes) 
    ? item.episodes 
    : (item.episodes?.data || Array.isArray(item.chapters) ? item.chapters : []);

  return {
    ...base,
    synopsis: item.synopsis || item.description || 'Sinopsis belum tersedia.',
    author: item.author || (item.staff?.nodes?.[0]?.name?.full) || 'Unknown Author',
    studios: Array.isArray(item.studios) ? item.studios : (item.studios?.nodes?.map((s: any) => s.name) || []),
    season: item.season || null,
    seasonYear: item.seasonYear || null,
    totalEpisodes: item.totalEpisodes || item.episodes || item.chapters?.length || 0,
    nextAiringEpisode: item.nextAiringEpisode || null,
    relations: Array.isArray(item.relations) ? item.relations : (item.relations?.nodes || []),
    episodes: episodes,
  };
}

export interface AnimeRow {
  anilistId: number;
  title: string;
  genres: string[] | string | null;
  status: string;
  year: number;
  cover: string;
  episode_count: number;
  tg_count: number;
  providerId: string | null;
}

export interface EpisodeRow {
  id: number;
  episodeNumber: number;
  providerId: string;
  episodeUrl: string;
}

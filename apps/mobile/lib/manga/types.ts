export interface MangaSourceRule {
  id: string;
  name: string;
  domain: string;
  headers?: Record<string, string>;
  selectors: {
    home: {
      list: string;
      title: string;
      cover: string;
      link: string;
      chapter?: string;
      score?: string;
    };
    search: {
      url: string; // e.g., "https://domain.com/?s={{key}}"
      list: string;
      title: string;
      cover: string;
      link: string;
      score?: string;
    };
    detail: {
      title: string;
      cover: string;
      synopsis: string;
      author?: string;
      genres: string; // usually an array of elements
      status?: string;
      chapterList: string;
      chapterNumber: string;
      chapterLink: string;
      chapterDate?: string;
    };
    chapter: {
      images: string; // e.g., "#readerarea img"
    };
  };
}

export interface MangaItem {
  id: string; // "sourceId|mangaSlug"
  sourceId: string;
  title: string;
  img: string;
  link: string;
  latestChapter?: string;
  score?: number;
}

export interface MangaDetail extends MangaItem {
  synopsis: string;
  author: string;
  genres: string[];
  status: string;
  chapters: MangaChapter[];
}

export interface MangaChapter {
  id: string; // "sourceId|chapterSlug"
  number: string;
  title?: string;
  link: string;
  date?: string;
}

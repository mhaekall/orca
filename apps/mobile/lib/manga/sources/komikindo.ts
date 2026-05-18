import { MangaSourceRule } from '../types';

export const KomikindoRule: MangaSourceRule = {
  id: 'komikindo',
  name: 'Komikindo',
  domain: 'https://komikindo.ch',
  selectors: {
    home: {
      list: '.animepost',
      title: '.tt h3',
      cover: 'img@src',
      link: 'a@href',
      chapter: '.lsch a',
      score: '.score',
    },
    search: {
      url: 'https://komikindo.tv/?s={{key}}',
      list: '.animepost',
      title: '.tt h3',
      cover: 'img@src',
      link: 'a@href',
      chapter: '.lsch a',
    },
    detail: {
      title: '.thumb h1',
      cover: '.thumb img@src',
      synopsis: '.entry-content',
      genres: '.genre-info a',
      chapterList: '.lchx a',
      chapterNumber: '@text', // Returns the text of the <a> tag
      chapterLink: '@href',
      chapterDate: '.date@text',
    },
    chapter: {
      images: '#chimg-auh img',
    }
  }
};

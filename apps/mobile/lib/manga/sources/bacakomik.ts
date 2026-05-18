import { MangaSourceRule } from '../types';

export const BacakomikRule: MangaSourceRule = {
  id: 'bacakomik',
  name: 'Bacakomik',
  domain: 'https://bacakomik.my',
  selectors: {
    home: {
      list: '.animepost',
      title: '.tt h4',
      cover: 'img@src', 
      link: 'a@href',
      chapter: '.lsch a',
      score: '.numscore',
    },
    search: {
      url: 'https://bacakomik.my/?s={{key}}',
      list: '.animepost',
      title: '.tt h4',
      cover: 'img@src',
      link: 'a@href',
      chapter: '.lsch a',
    },
    detail: {
      title: '.infox h1',
      cover: '.thumb img@src',
      synopsis: '.desc',
      genres: '.genre-info a',
      chapterList: '.lchx a',
      chapterNumber: '@text',
      chapterLink: '@href',
      chapterDate: '.date@text',
    },
    chapter: {
      images: '#chimg-auh img',
    }
  }
};

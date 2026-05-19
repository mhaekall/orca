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
      author: '.spe span:contains("Author") i, .spe span:contains("Pengarang") i',
      status: '.spe span:contains("Status")',
      genres: '.genre-info a',
      chapterList: '#chapterlist .lchx a, .bxcl ul li .lchx a',
      chapterNumber: '@text',
      chapterLink: '@href',
      chapterDate: '.date@text',
    },
    chapter: {
      images: '#chimg-auh img',
    }
  }
};

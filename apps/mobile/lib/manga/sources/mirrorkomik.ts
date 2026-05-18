import { MangaSourceRule } from '../types';

export const MirrorkomikRule: MangaSourceRule = {
  id: 'mirrorkomik',
  name: 'Mirrorkomik',
  domain: 'https://mirrorkomik.one',
  selectors: {
    home: {
      list: 'div.bs',
      title: 'div.tt@text',
      cover: '.limit img@src',
      link: 'a@href',
      chapter: 'div.epxs@text',
    },
    search: {
      url: 'https://mirrorkomik.one/?s={{key}}',
      list: 'div.bs',
      title: 'div.tt@text',
      cover: '.limit img@src',
      link: 'a@href',
      chapter: 'div.epxs@text',
    },
    detail: {
      title: '.thumb h1@text',
      cover: '.thumb img@src',
      synopsis: '[itemprop="description"] p@text',
      genres: '.genre-info a',
      chapterList: 'ul div.chbox',
      chapterNumber: 'span.chapternum@text',
      chapterLink: '.eph-num a@href',
    },
    chapter: {
      images: '#readerarea img',
    }
  }
};

import { MangaSourceRule } from '../types';

export const OmicasoRule: MangaSourceRule = {
  id: 'omicaso',
  name: 'Omicaso',
  domain: 'https://omicaso.org',
  selectors: {
    home: {
      list: 'div.bs',
      title: 'div.tt@text',
      cover: '.limit img@src',
      link: 'a@href',
      chapter: 'div.epxs@text',
    },
    search: {
      url: 'https://omicaso.org/?s={{key}}',
      list: 'div.bs',
      title: 'div.tt@text',
      cover: '.limit img@src',
      link: 'a@href',
      chapter: 'div.epxs@text',
    },
    detail: {
      title: '#titlemove h1@text',
      cover: '.thumb img@src',
      synopsis: '[itemprop="description"] p@text',
      genres: '.genre-info a',
      chapterList: '.clstyle li, ul div.chbox',
      chapterNumber: 'span.chapternum@text',
      chapterLink: '.eph-num a@href',
      chapterDate: '.chapterdate@text',
    },
    chapter: {
      images: '#readerarea img',
    }
  }
};

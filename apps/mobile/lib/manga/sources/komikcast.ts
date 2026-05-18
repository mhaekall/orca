import { MangaSourceRule } from '../types';

export const KomikcastRule: MangaSourceRule = {
  id: 'komikcast',
  name: 'Komikcast',
  domain: 'https://komikcast03.com',
  selectors: {
    home: {
      list: '.list-update_item',
      title: '.title@text',
      cover: 'img@src',
      link: 'a@href',
      chapter: '.chapter@text',
    },
    search: {
      url: 'https://komikcast03.com/?s={{key}}',
      list: '.list-update_item',
      title: '.title@text',
      cover: 'img@src',
      link: 'a@href',
      chapter: '.chapter@text',
    },
    detail: {
      title: '.komik_info-content-body-title@text',
      cover: '.komik_info-content-thumbnail img@src',
      synopsis: '.komik_info-description-sinopsis@text',
      genres: '.komik_info-content-genre a',
      chapterList: '.komik_info-chapters-item',
      chapterNumber: '.chapter-link-item@text',
      chapterLink: '.chapter-link-item@href',
      chapterDate: '.chapter-link-time@text',
    },
    chapter: {
      images: '.main-reading-area img',
    }
  }
};

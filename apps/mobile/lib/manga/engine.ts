import { parse, HTMLElement } from 'node-html-parser';
import { MangaSourceRule, MangaItem, MangaDetail, MangaChapter } from './types';

// Helper to fetch HTML using mobile fetch (bypasses most simple bot protections due to native networking)
async function fetchHtml(url: string, customHeaders?: Record<string, string>): Promise<string> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    ...customHeaders,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return await response.text();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Koneksi ke server komik terlalu lama (Timeout).');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper to extract text safely using node-html-parser
function getText(el: HTMLElement, selector: string): string {
  if (!selector) return '';
  
  if (selector === '@text') {
    return el.text.trim();
  }

  const isAttr = selector.includes('@');
  
  if (isAttr) {
    const [sel, attr] = selector.split('@');
    const targetEl = sel ? el.querySelector(sel) : el;
    if (!targetEl) return '';
    
    let val = targetEl.getAttribute(attr) || '';
    
    // Smart lazy-load resolver for images
    if (attr === 'src' && (val.includes('data:image') || val.includes('blank'))) {
       val = targetEl.getAttribute('data-src') || targetEl.getAttribute('data-lazy-src') || val;
    }
    
    return val;
  }
  
  const found = el.querySelector(selector);
  return found ? found.text.trim() : '';
}

// Helper to generate a unique ID based on source and slug
function generateId(sourceId: string, url: string): string {
  return `${sourceId}|${encodeURIComponent(url)}`;
}

export class MangaEngine {
  
  static async getHomeList(source: MangaSourceRule): Promise<MangaItem[]> {
    const html = await fetchHtml(source.domain, source.headers);
    const root = parse(html);
    const results: MangaItem[] = [];

    const { list, title, cover, link, chapter, score } = source.selectors.home;

    root.querySelectorAll(list).forEach((el) => {
      const itemTitle = getText(el, title);
      let itemLink = getText(el, link);
      let itemCover = getText(el, cover);
      const itemChapter = chapter ? getText(el, chapter) : undefined;
      let itemScore = score ? parseFloat(getText(el, score)) : undefined;

      // Fix relative URLs
      if (itemLink && itemLink.startsWith('/')) itemLink = `${source.domain}${itemLink}`;
      if (itemCover && itemCover.startsWith('/')) itemCover = `${source.domain}${itemCover}`;

      if (itemTitle && itemLink) {
        results.push({
          id: generateId(source.id, itemLink),
          sourceId: source.id,
          title: itemTitle,
          link: itemLink,
          img: itemCover || '',
          latestChapter: itemChapter,
          score: isNaN(itemScore as number) ? undefined : itemScore,
        });
      }
    });

    if (results.length === 0) {
      throw new Error(`Situs ${source.name} sedang memblokir akses atau strukturnya berubah.`);
    }

    return results;
  }

  static async getSearchList(source: MangaSourceRule, keyword: string): Promise<MangaItem[]> {
    const url = source.selectors.search.url.replace('{{key}}', encodeURIComponent(keyword));
    const html = await fetchHtml(url, source.headers);
    const root = parse(html);
    const results: MangaItem[] = [];

    const { list, title, cover, link, score } = source.selectors.search;
    const chapter = source.selectors.search.chapter; // Optional

    root.querySelectorAll(list).forEach((el) => {
      const itemTitle = getText(el, title);
      let itemLink = getText(el, link);
      let itemCover = getText(el, cover);
      const itemChapter = chapter ? getText(el, chapter) : undefined;
      let itemScore = score ? parseFloat(getText(el, score)) : undefined;

      // Fix relative URLs
      if (itemLink && itemLink.startsWith('/')) itemLink = `${source.domain}${itemLink}`;
      if (itemCover && itemCover.startsWith('/')) itemCover = `${source.domain}${itemCover}`;

      if (itemTitle && itemLink) {
        results.push({
          id: generateId(source.id, itemLink),
          sourceId: source.id,
          title: itemTitle,
          link: itemLink,
          img: itemCover || '',
          latestChapter: itemChapter,
          score: isNaN(itemScore as number) ? undefined : itemScore,
        });
      }
    });

    return results;
  }

  static async getDetail(source: MangaSourceRule, mangaUrl: string): Promise<MangaDetail> {
    const html = await fetchHtml(mangaUrl, source.headers);
    const root = parse(html);
    
    const s = source.selectors.detail;
    
    const title = getText(root, s.title);
    let cover = getText(root, s.cover);
    const synopsis = getText(root, s.synopsis);
    const author = s.author ? getText(root, s.author) : 'Unknown';
    const status = s.status ? getText(root, s.status) : 'Unknown';
    
    if (cover && cover.startsWith('/')) cover = `${source.domain}${cover}`;

    const genres: string[] = [];
    if (s.genres) {
       root.querySelectorAll(s.genres).forEach((el) => {
         genres.push(el.text.trim());
       });
    }

    const chapters: MangaChapter[] = [];
    root.querySelectorAll(s.chapterList).forEach((el) => {
       const chNum = getText(el, s.chapterNumber);
       let chLink = getText(el, s.chapterLink);
       const chDate = s.chapterDate ? getText(el, s.chapterDate) : undefined;

       if (chLink && chLink.startsWith('/')) chLink = `${source.domain}${chLink}`;

       if (chLink) {
         chapters.push({
           id: generateId(source.id, chLink),
           number: chNum || `Chapter ${chapters.length + 1}`,
           link: chLink,
           date: chDate
         });
       }
    });

    return {
      id: generateId(source.id, mangaUrl),
      sourceId: source.id,
      title,
      img: cover || '',
      link: mangaUrl,
      synopsis,
      author,
      status,
      genres,
      chapters
    };
  }

  static async getChapterImages(source: MangaSourceRule, chapterUrl: string): Promise<string[]> {
    const html = await fetchHtml(chapterUrl, source.headers);
    const root = parse(html);
    
    const images: string[] = [];
    root.querySelectorAll(source.selectors.chapter.images).forEach((el) => {
       let imgUrl = el.getAttribute('src');
       // Sometimes lazy loaded images use data-src
       if (!imgUrl || imgUrl.includes('data:image') || imgUrl.includes('blank')) {
         imgUrl = el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || imgUrl;
       }

       if (imgUrl) {
         images.push(imgUrl.trim());
       }
    });

    return images;
  }
}


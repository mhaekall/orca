import { parse, HTMLElement } from 'node-html-parser';
import { MangaSourceRule, MangaItem, MangaDetail, MangaChapter } from './types';
import { fetchHtml } from '../network';

// Custom text extractor to handle :contains pseudo-selector which is not fully supported by node-html-parser natively in all cases
function getTextAdvanced(root: HTMLElement, selector: string): string {
  if (!selector) return '';

  if (selector.includes(':contains("')) {
    const parts = selector.split(':contains("');
    const baseSelector = parts[0].trim();
    const searchStringAndRest = parts[1].split('")');
    const searchString = searchStringAndRest[0];
    const restSelector = searchStringAndRest[1]?.trim() || '';

    const elements = root.querySelectorAll(baseSelector);
    for (const el of elements) {
      if (el.text.includes(searchString)) {
        if (restSelector) {
           const target = el.querySelector(restSelector);
           if (target) return target.text.trim();
        } else {
           // We want the text after the label usually (e.g. "Status: Ongoing")
           return el.text.replace(searchString, '').replace(/^[:\s]+/, '').replace(/\s+/g, ' ').trim();
        }
      }
    }
    return '';
  }

  // Fallback to basic getText
  return getText(root, selector);
}

// Helper to extract text safely using node-html-parser
function getText(el: HTMLElement, selector: string): string {
  if (!selector) return '';
  
  if (selector === '@text') {
    return el.text.replace(/\s+/g, ' ').trim();
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
  
  // Multiple selectors support (comma separated) for text extraction
  const selectors = selector.split(',').map(s => s.trim());
  for (const sel of selectors) {
    const found = el.querySelector(sel);
    if (found) {
      return found.text.replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

// Helper to generate a unique ID based on source and slug
function generateId(sourceId: string, url: string): string {
  return `${sourceId}|${encodeURIComponent(url)}`;
}

// Menghapus dimensi seperti -150x200, -165x225, dsb. dari URL gambar WordPress
function getHighResImageUrl(url: string): string {
  if (!url) return url;
  return url.replace(/-\d+x\d+(\.[a-zA-Z0-9]+(?:\?.*)?)$/i, '$1');
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
          img: getHighResImageUrl(itemCover || ''),
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
          img: getHighResImageUrl(itemCover || ''),
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
    
    // Multiple selectors support (comma separated)
    let author = 'Unknown';
    if (s.author) {
       const authorSelectors = s.author.split(',').map(s => s.trim());
       for (const sel of authorSelectors) {
          const val = getTextAdvanced(root, sel);
          if (val && val !== 'Unknown') { author = val; break; }
       }
    }

    let status = 'Unknown';
    if (s.status) {
       const statusSelectors = s.status.split(',').map(s => s.trim());
       for (const sel of statusSelectors) {
          const val = getTextAdvanced(root, sel);
          if (val && val !== 'Unknown') { status = val; break; }
       }
    }
    
    if (cover && cover.startsWith('/')) cover = `${source.domain}${cover}`;

    const genres: string[] = [];
    if (s.genres) {
       root.querySelectorAll(s.genres).forEach((el) => {
         genres.push(el.text.trim());
       });
    }

    const chapters: MangaChapter[] = [];
    
    // Chapter List multiple selectors support
    const chapterSelectors = s.chapterList.split(',').map(sel => sel.trim());
    let elements: HTMLElement[] = [];
    for (const sel of chapterSelectors) {
      elements = root.querySelectorAll(sel);
      if (elements.length > 0) break;
    }

    elements.forEach((el) => {
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
      img: getHighResImageUrl(cover || ''),
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

  // A simple string similarity function (Levenshtein distance approximation)
  static stringSimilarity(s1: string, s2: string): number {
    const a = s1.toLowerCase();
    const b = s2.toLowerCase();
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.8;
    
    // Very basic fallback
    const wordsA = a.split(/\s+/);
    const wordsB = b.split(/\s+/);
    const intersection = wordsA.filter(w => wordsB.includes(w));
    return intersection.length / Math.max(wordsA.length, wordsB.length);
  }

  static async findAndGetDetail(sources: MangaSourceRule[], title: string): Promise<MangaDetail | null> {
    if (!title) return null;
    
    // Create permutations of the title to increase hit rate
    const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const shortTitle = cleanTitle.split(' ').slice(0, 3).join(' ');
    
    const titlePermutations = [title];
    if (cleanTitle && cleanTitle.toLowerCase() !== title.toLowerCase()) {
      titlePermutations.push(cleanTitle);
    }
    if (shortTitle && shortTitle.length > 3 && shortTitle.toLowerCase() !== cleanTitle.toLowerCase()) {
      titlePermutations.push(shortTitle);
    }

    for (const source of sources) {
       for (const searchTitle of titlePermutations) {
           try {
               const searchResults = await this.getSearchList(source, searchTitle);
               if (searchResults.length > 0) {
                   // Pick the best match using similarity score
                   let bestMatch = searchResults[0];
                   let bestScore = -1;
                   for (const res of searchResults) {
                     const score = this.stringSimilarity(title, res.title);
                     if (score > bestScore) {
                       bestScore = score;
                       bestMatch = res;
                     }
                   }
                   return await this.getDetail(source, bestMatch.link);
               }
           } catch (e) {
               console.warn(`[MangaEngine] Search failed on ${source.id} for "${searchTitle}"`, e);
           }
       }
    }
    return null;
  }
}

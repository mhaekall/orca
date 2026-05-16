/**
 * Shared utility functions for formatting and filtering data across the app.
 */

export function formatViews(v: number | null | undefined): string {
  if (!v) return '0';
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toString();
}

export function formatDuration(sec: number): string {
  if (!sec) return "0m";
  const m = Math.floor(sec / 60);
  return `${m}m`;
}

export function hasEps(a: any): boolean {
  if (a?.status === 'NOT_YET_RELEASED' || a?.status === 'UPCOMING') return false;
  const eps = a?.latestEpisode ?? a?.episodes ?? a?.totalEpisodes;
  if (eps !== undefined && eps !== null) return Number(eps) > 0;
  return true;
}

export function formatHistoryDate(dateStr: string): string {
  try {
    const safeStr = typeof dateStr === 'string' && !dateStr.endsWith('Z') ? `${dateStr}Z` : dateStr;
    const d = new Date(safeStr);
    if (isNaN(d.getTime())) return "Waktu tidak diketahui";
    const wTime = new Date(d.getTime() + (7 * 3600000));
    const day = wTime.getUTCDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[wTime.getUTCMonth()];
    const year = wTime.getUTCFullYear();
    const hh = String(wTime.getUTCHours()).padStart(2, '0');
    const mm = String(wTime.getUTCMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} • ${hh}:${mm} WIB`;
  } catch (e) {
    return "Waktu tidak diketahui";
  }
}

export function formatSynopsis(text: string): string {
  if (!text) return "Sinopsis belum tersedia.";
  let clean = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " ").trim();
  const sourceIndex = clean.search(/\(?\[?(Sumber|Source|Written by)\s*:/i);
  if (sourceIndex !== -1) {
    clean = clean.substring(0, sourceIndex).trim();
  }
  clean = clean.replace(/\n{3,}/g, '\n\n');
  clean = clean.replace(/ {2,}/g, ' ');
  return clean;
}

export function resolveProxyUrl(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  let urlStr = videoUrl;
  
  if (urlStr.includes('tg-proxy') && !urlStr.includes('/stream/bot')) {
    const match = urlStr.match(/tg-proxy(-[0-9]+)?\.moehamadhkl\.workers\.dev\/(.+)/);
    if (match) {
      const proxyDomain = match[1] || '';
      const fileId = match[2];
      let fallbackToken = process.env.EXPO_PUBLIC_TG_PROXY_TOKEN_1 || '8782570865:AAFlGrid6H-XFPu-jAbE26dHD_DgXHhRBpE';
      if (proxyDomain === '-4') fallbackToken = process.env.EXPO_PUBLIC_TG_PROXY_TOKEN_4 || '7745690828:AAH3AS4ruQkNHLUp2osiVy_riIAAi4SrXB8';
      else if (proxyDomain === '-2') fallbackToken = process.env.EXPO_PUBLIC_TG_PROXY_TOKEN_2 || '8425258072:AAGmF_XGG2K0HnM7lmvEMq-gvf_-E0EMbd8';
      urlStr = `https://tele-proxy.moehamadhkl.workers.dev/stream/bot${fallbackToken}/${fileId}`;
    }
  }

  if (urlStr.includes('proxy') || urlStr.includes('workers.dev')) {
    const parts = urlStr.split('?');
    let baseUrl = parts[0];
    let queryString = parts[1] || '';
    
    if (!baseUrl.endsWith('.m3u8') && !baseUrl.endsWith('.mp4') && !baseUrl.endsWith('.ts')) {
       baseUrl += '.m3u8';
    }
    
    // We remove the dynamic Date.now() here to ensure the URL string remains stable across re-renders.
    // If a cache buster is strictly required, it should be appended at the data-fetching level, not the UI render level.
    if (queryString) {
        urlStr = `${baseUrl}?${queryString}`;
    } else {
        urlStr = baseUrl;
    }
  }
  return urlStr;
}

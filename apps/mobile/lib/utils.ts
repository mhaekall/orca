import { mutate } from "swr";
import { API_URL } from "./config";

/**
 * Shared utility functions for formatting and filtering data across the app.
 */

export const prefetchAnime = (id: string) => {
  mutate(`${API_URL}/api/v2/anime/${id}`);
};

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
      
      // Keamanan Ditingkatkan (Tech Debt Resolved):
      // Token tidak lagi di-hardcode di kode klien, melainkan wajib disuplai via Environment Variables (.env)
      let botToken = process.env.EXPO_PUBLIC_TG_PROXY_TOKEN_1;
      if (proxyDomain === '-4') botToken = process.env.EXPO_PUBLIC_TG_PROXY_TOKEN_4;
      else if (proxyDomain === '-2') botToken = process.env.EXPO_PUBLIC_TG_PROXY_TOKEN_2;
      
      if (botToken) {
         urlStr = `https://tele-proxy.moehamadhkl.workers.dev/stream/bot${botToken}/${fileId}`;
      } else {
         console.warn(`[Proxy] Token tidak ditemukan untuk domain ${proxyDomain}. Melewatkan fallback.`);
      }
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

/**
 * Calculate dates of the current week starting from Monday.
 * Uses WIB (+7) for consistent date boundaries.
 */
export function getWeekDates() {
  const realNow = new Date();
  const utc = realNow.getTime() + (realNow.getTimezoneOffset() * 60000);
  const today = new Date(utc + (7 * 3600000)); // Shift +7 hours for WIB
  
  const currentDay = today.getDay(); // 0 = Sunday
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);
  monday.setHours(0,0,0,0);
  
  const todayStart = new Date(today);
  todayStart.setHours(0,0,0,0);

  const week = [];
  const daysArr = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const shortDaysArr = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  
  let initialActive = "Senin";
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    if (isToday) {
      initialActive = daysArr[i];
    }
    week.push({
      fullDay: daysArr[i],
      shortDay: shortDaysArr[i],
      dateNum: d.getDate(),
      isToday,
      isPast: d.getTime() < todayStart.getTime()
    });
  }

  return { week, initialActive };
}

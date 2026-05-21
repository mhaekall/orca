import { parse, HTMLElement } from 'node-html-parser';
import CryptoJS from 'crypto-js';
import { AnimeSource, AnimeSourceRule } from './types';
import { API_URL, HF_API_URL } from '../config';

// Helper to fetch HTML using mobile fetch (bypasses simple bot protections)
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
      throw new Error('Connection to anime server timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export class AnimeEngine {
  private static configCache: any = null;

  static async getConfig() {
    if (this.configCache) return this.configCache;
    try {
      const targetUrl = HF_API_URL.endsWith('/') 
        ? `${HF_API_URL}api/v2/config/app` 
        : `${HF_API_URL}/api/v2/config/app`;
        
      const res = await fetch(targetUrl);
      const data = await res.json();
      if (data && data.scraper_rules) {
        this.configCache = data.scraper_rules;
        return this.configCache;
      }
    } catch (e) {
      console.warn("Failed to fetch scraper config, using defaults", e);
    }
    
    // Fallback defaults
    this.configCache = {
        kuronime: {
            domain: "https://kuronime.sbs",
            apiUrl: "https://animeku.org/api/v9/sources",
            decryptKey: "3&!Z0M,VIZ;dZW==",
            reqIdRegex: "var\\s+[a-zA-Z0-9_]+\\s*=\\s*[\"']([^\"']{100,})[\"']"
        },
        samehadaku: {
            domain: "https://v2.samehadaku.how",
            serverSelector: ".server_option li",
            ajaxEndpoint: "/wp-admin/admin-ajax.php",
            iframeSrcRegex: "src=[\"']([^\"']+)[\"']"
        }
    };
    return this.configCache;
  }

  static async reportError(provider: string, url: string, error: any) {
    try {
      const targetUrl = HF_API_URL.endsWith('/') 
        ? `${HF_API_URL}api/v2/telemetry/scraper-error` 
        : `${HF_API_URL}/api/v2/telemetry/scraper-error`;
        
      await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          url,
          error_message: error?.message || String(error)
        })
      });
    } catch (e) {
      // silent
    }
  }

  /**
   * Helper to decrypt CryptoJS AES string (Kuronime uses this)
   */
  static decryptCryptoJSAES(encryptedText: string, passwordStr: string): string {
    try {
      // Decode base64 first using CryptoJS (since Buffer is not available natively in React Native)
      const dataStr = CryptoJS.enc.Base64.parse(encryptedText).toString(CryptoJS.enc.Utf8);
      const data = JSON.parse(dataStr);
      
      const ct = data.ct;
      const salt = CryptoJS.enc.Hex.parse(data.s);
      const password = CryptoJS.enc.Utf8.parse(passwordStr);
      
      // Derive key and iv
      const key_iv = CryptoJS.EvpKDF(password, salt, { keySize: 12, iterations: 1 });
      
      const key = CryptoJS.lib.WordArray.create(key_iv.words.slice(0, 8));
      const iv = CryptoJS.lib.WordArray.create(key_iv.words.slice(8, 12));
      
      const ciphertext = CryptoJS.enc.Base64.parse(ct);
      const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext });
      
      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.warn("AES Decryption failed", e);
      return "";
    }
  }

  /**
   * Extract Direct MP4 URL from Mp4upload Embed without backend
   */
  static async extractMp4Upload(embedUrl: string): Promise<string | null> {
    try {
      const html = await fetchHtml(embedUrl, { 'Referer': 'https://kuronime.sbs/' });
      const scriptMatch = html.match(/src:\s*["']([^"']+\.mp4)["']/);
      if (scriptMatch && scriptMatch[1]) {
        return scriptMatch[1];
      }
    } catch (e) {
      console.warn("Mp4Upload extraction failed", e);
    }
    return null;
  }

  /**
   * Process Tele Proxy URLs
   */
  static async processTeleProxy(epUrl: string): Promise<AnimeSource[]> {
    console.log("Tele Proxy detected, generating proxy sources...");
    let sources: AnimeSource[] = [];

    // Map mock resolutions based on the base URL
    const separator = epUrl.includes("?") ? "&" : "?";
    
    // Teleproxy is actually 720p
    sources.push({ quality: "720p", provider: "Tele Proxy", url: `${epUrl}${separator}mock=720p`, type: "mp4" });
    sources.push({ quality: "1080p", provider: "Tele Proxy (Upscale)", url: `${epUrl}${separator}mock=1080p`, type: "mp4" });
    sources.push({ quality: "480p", provider: "Tele Proxy (Downscale)", url: `${epUrl}${separator}mock=480p`, type: "mp4" });
    sources.push({ quality: "360p", provider: "Tele Proxy (Downscale)", url: `${epUrl}${separator}mock=360p`, type: "mp4" });

    return sources;
  }

  /**
   * Scrape Kuronime episode
   */
  static async getKuronimeSources(episodeUrl: string): Promise<AnimeSource[]> {
    const rules = (await this.getConfig()).kuronime;
    const domain = rules.domain;
    const apiUrl = rules.apiUrl;
    const decryptKey = rules.decryptKey;
    const reqIdRegex = new RegExp(rules.reqIdRegex);
    const sources: AnimeSource[] = [];

    try {
      const html = await fetchHtml(episodeUrl);
      const root = parse(html);

      // Extract req_id via regex
      const reqIdMatch = html.match(reqIdRegex);
      const reqId = reqIdMatch ? reqIdMatch[1] : "";

      if (!reqId) {
        throw new Error("Could not find Kuronime req_id using dynamic regex");
      }

      // Call their API
      const apiRes = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Referer": domain,
          "User-Agent": "Mozilla/5.0",
        },
        body: JSON.stringify({ id: reqId })
      });
      
      const data = await apiRes.json();
      
      // Parse src and src_sd (Direct streams)
    const qualityMap = [{ key: "src", label: "1080p" }, { key: "src_sd", label: "480p" }];
    
    for (const q of qualityMap) {
      const encryptedVal = data[q.key];
      if (encryptedVal) {
        const decryptedStr = this.decryptCryptoJSAES(encryptedVal, decryptKey);
        if (decryptedStr) {
          try {
            if (decryptedStr.startsWith("http")) {
              sources.push({
                provider: "Kuro Direct",
                quality: q.label,
                url: decryptedStr,
                type: "hls"
              });
            } else {
              const decryptedJson = JSON.parse(decryptedStr);
              if (decryptedJson.src) {
                sources.push({
                  provider: "Kuro Direct",
                  quality: q.label,
                  url: decryptedJson.src,
                  type: "hls"
                });
              }
            }
          } catch (e) {
            // Ignored
          }
        }
      }
    }

    // Parse mirror (Embeds) for Pixeldrain specifically to complete the resolution set (720p, 360p)
    const mirrorEnc = data.mirror;
    if (mirrorEnc) {
      const decryptedStr = this.decryptCryptoJSAES(mirrorEnc, decryptKey);
      if (decryptedStr) {
        try {
          const mirrorJson = JSON.parse(decryptedStr);
          const embeds = mirrorJson.embed || {};
          
          for (const [resKey, resProviders] of Object.entries(embeds)) {
            const quality = resKey.replace("v", ""); // e.g. v720p -> 720p
            let foundDirect = false;

            for (const [providerName, providerUrl] of Object.entries(resProviders as Record<string, string>)) {
              if (providerUrl && providerUrl.toLowerCase().includes("pixeldrain")) {
                  sources.push({
                    provider: "Kuro Direct",
                    quality: quality,
                    url: providerUrl,
                    type: "mp4"
                  });
                  foundDirect = true;
                  break; // Only grab one stable direct link per resolution
              }
            }

            // If Pixeldrain is missing (e.g. older episodes like Witch Hat), fallback to Mp4upload client-side extractor
            if (!foundDirect) {
               for (const [providerName, providerUrl] of Object.entries(resProviders as Record<string, string>)) {
                 if (providerUrl && providerUrl.toLowerCase().includes("mp4upload")) {
                    const mp4Url = await this.extractMp4Upload(providerUrl);
                    if (mp4Url) {
                       sources.push({
                         provider: "Kuro Direct", // Still group it under Kuro Direct for clean UI
                         quality: quality,
                         url: mp4Url,
                         type: "mp4"
                       });
                       foundDirect = true;
                       break;
                    }
                 }
               }
            }
          }
        } catch (e) {
          console.warn("[Kuronime] Error parsing mirrors:", e);
        }
      }
    }

    // Sort sources from Highest Quality to Lowest
    const sortOrder: Record<string, number> = { "1080p": 4, "720p": 3, "480p": 2, "360p": 1, "Auto": 0 };
    sources.sort((a, b) => (sortOrder[b.quality] || 0) - (sortOrder[a.quality] || 0));

    } catch (error) {
      console.warn("[Kuronime] Critical Scraping Error:", error);
      this.reportError("Kuronime", episodeUrl, error);
    }

    return sources;
  }

  /**
   * Scrape Samehadaku episode
   */
  static async getSamehadakuSources(episodeUrl: string): Promise<AnimeSource[]> {
    const rules = (await this.getConfig()).samehadaku;
    const domain = rules.domain;
    const sources: AnimeSource[] = [];
    
    try {
      const html = await fetchHtml(episodeUrl);
      const root = parse(html);

      const servers = root.querySelectorAll(rules.serverSelector);
      
      // Process only first few to save time on client side
      for (const s of servers.slice(0, 3)) {
        const serverType = s.getAttribute('data-type');
        const serverNum = s.getAttribute('data-nume');
        const postId = s.getAttribute('data-post');
        const providerName = s.querySelector('span')?.text || "Unknown";

        if (serverType && serverNum && postId) {
           try {
             const formBody = new URLSearchParams({
               action: 'player_ajax',
               post: postId,
               nume: serverNum,
               type: serverType,
             }).toString();

             const ajaxRes = await fetch(`${domain}${rules.ajaxEndpoint}`, {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/x-www-form-urlencoded',
                 'Referer': episodeUrl,
                 'User-Agent': 'Mozilla/5.0',
                 'X-Requested-With': 'XMLHttpRequest'
               },
               body: formBody
             });

             const ajaxHtml = await ajaxRes.text();
             const iframeRegex = new RegExp(rules.iframeSrcRegex);
             const match = ajaxHtml.match(iframeRegex);
             
             if (match && match[1]) {
               let url = match[1];
               const urlLower = url.toLowerCase();
               
               // Blacklist mirror mati/landing page
               const BLACKLIST = ['mega', 'filedon', 'doodstream', 'streamtape', 'mediafire', 'pucuk', 'gofile', 'kraken', 'acefile', 'vidhide', 'zippyshare', 'solidfiles'];
               if (BLACKLIST.some(b => urlLower.includes(b))) {
                 continue; // Skip this trash mirror
               }

               let isDirect = false;

               if (urlLower.includes("pixeldrain.com/api/file/") || 
                   urlLower.includes("wibufile.com/video") || 
                   urlLower.includes("s0.wibufile") ||
                   (urlLower.endsWith(".mp4") && !urlLower.includes("/embed") && !urlLower.includes("/view"))) {
                 isDirect = true;
               }

               if (isDirect) {
                 sources.push({
                   provider: "Samehadaku Direct",
                   quality: "Auto", // Resolusi asli
                   url: url,
                   type: "mp4"
                 });
               }
             }
           } catch (e) {
             console.warn("[Samehadaku] Failed server:", e);
           }
        }
      }
    } catch (error) {
      console.warn("[Samehadaku] Critical Scraping Error:", error);
      this.reportError("Samehadaku", episodeUrl, error);
    }

    return sources;
  }
}

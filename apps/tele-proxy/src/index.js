export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Range, Content-Type",
          "Access-Control-Max-Age": "86400",
        }
      });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const cache = caches.default;
    
    // 1. Intelligent Cache Keying: Separate cache storage based on Range header.
    const cacheUrl = new URL(request.url);
    const rangeHeader = request.headers.get("Range");
    if (rangeHeader) {
      cacheUrl.searchParams.set("range", rangeHeader);
    } else {
      cacheUrl.searchParams.set("range", "full");
    }
    
    // Strip client-side cache busters so requests can hit the edge cache.
    cacheUrl.searchParams.delete("cb");
    cacheUrl.searchParams.delete("xcb"); // Also strip chunk cache buster

    const cacheKey = new Request(cacheUrl.toString(), {
      method: request.method,
      headers: request.headers
    });

    let response = await cache.match(cacheKey);
    if (response) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set("X-Proxy-Cache", "HIT");
      
      // If the cached response has a Content-Range header, it was originally a 206 response.
      let finalStatus = response.status;
      if (newHeaders.has("Content-Range")) {
         finalStatus = 206;
      }
      
      let cachedBody = response.body;
      if (newHeaders.get("Content-Type")?.includes("mpegurl")) {
         let text = await response.text();
         let textModified = false;
         if (text.includes("\\n")) {
             text = text.replace(/\\n/g, "\n");
             textModified = true;
         }
         // Append ?mime=ts to chunk URLs inside the playlist
         if (text.includes("tele-proxy")) {
             const randCb = Math.random().toString(36).substring(7);
             text = text.replace(/([?&])xcb=[^&\s]+/g, "");
             text = text.replace(/(https:\/\/tele-proxy[\w\.\/\-:]+\/[^\/\s\?]+)(?!\S*mime=ts)/g, `$1?mime=ts`);
             text = text.replace(/(mime=ts)/g, `$1&xcb=${randCb}`);
             textModified = true;
         }
         if (textModified) {
             newHeaders.delete("Content-Length");
             cachedBody = text;
         }
      }

      return new Response(cachedBody, {
        status: finalStatus,
        statusText: finalStatus === 206 ? "Partial Content" : response.statusText,
        headers: newHeaders
      });
    }

    let targetUrl = `https://api.telegram.org${url.pathname}`;

    // 2. If it's a /stream/bot<TOKEN>/<FILE_ID> request, resolve via getFile
    // Fix for OkHttp which aggressive encodes ':' in bot tokens into '%3A'
    const decodedPath = decodeURIComponent(url.pathname);
    const streamMatch = decodedPath.match(/^\/stream\/bot([^\/]+)\/(.+)$/);
    if (streamMatch) {
      const token = streamMatch[1];
      let fileId = streamMatch[2];
      
      // Strip extension if present so Telegram API doesn't fail
      fileId = fileId.replace(/\.(mp4|m3u8|ts)$/i, "");
      
      // Resolve file_path
      const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
      const getFileCacheKey = new Request(getFileUrl);
      let getFileRes = await cache.match(getFileCacheKey);
      
      if (!getFileRes) {
        getFileRes = await fetch(getFileUrl);
        if (getFileRes.ok) {
           ctx.waitUntil(cache.put(getFileCacheKey, getFileRes.clone()));
        }
      }
      
      if (!getFileRes.ok) {
         return new Response("Failed to resolve file_id from Telegram", { status: 404 });
      }
      
      const getFileData = await getFileRes.json();
      if (!getFileData.ok || !getFileData.result || !getFileData.result.file_path) {
         return new Response("Invalid getFile response", { status: 404 });
      }
      
      const filePath = getFileData.result.file_path;
      targetUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    }

    // 3. Fetch the actual file from Telegram
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
    });

    response = await fetch(modifiedRequest);
    
    if (!response.ok && response.status !== 206) {
       return new Response(response.body, {
           status: response.status,
           headers: response.headers
       });
    }

    // FIX FOR LITERAL \n in M3U8 FILES and Append Mime Type to Chunks
    let body = response.body;
    let isModified = false;
    if (url.pathname.endsWith('.m3u8') || url.searchParams.get("mime") === "m3u8" || response.headers.get("Content-Type")?.includes("mpegurl")) {
      let text = await response.text();
      // Replace literal \n with actual newlines
      if (text.includes("\\n")) {
         text = text.replace(/\\n/g, "\n");
         isModified = true;
      }
      
      // Rewrite old tg-proxy chunks to tele-proxy format
      if (text.includes("tg-proxy")) {
          text = text.replace(/https:\/\/tg-proxy(-[0-9]+)?\.moehamadhkl\.workers\.dev\/([A-Za-z0-9_-]+)/g, (match, p1, p2) => {
              const domain = p1 || '';
              let token = '8782570865:AAFlGrid6H-XFPu-jAbE26dHD_DgXHhRBpE'; // default tg-proxy
              if (domain === '-4') token = '7745690828:AAH3AS4ruQkNHLUp2osiVy_riIAAi4SrXB8';
              else if (domain === '-2') token = '8425258072:AAGmF_XGG2K0HnM7lmvEMq-gvf_-E0EMbd8';
              return `https://tele-proxy.moehamadhkl.workers.dev/stream/bot${token}/${p2}`;
          });
          isModified = true;
      }

      // Append ?mime=ts to chunk URLs inside the playlist
      if (text.includes("tele-proxy")) {
          // generate random string for cache busting OkHttp
          const randCb = Math.random().toString(36).substring(7);
          text = text.replace(/([?&])xcb=[^&\s]+/g, "");
          text = text.replace(/(https:\/\/tele-proxy[\w\.\/\-:]+\/[^\/\s\?]+)(?!\S*mime=ts)/g, `$1?mime=ts`);
          text = text.replace(/(mime=ts)/g, `$1&xcb=${randCb}`);
          isModified = true;
      }
      // ALWAYS assign text to body since the stream was consumed
      body = text;
    }

    // 4. Rebuild headers for aggressive caching and CORS
    const newHeaders = new Headers(response.headers);
    if (isModified) {
        newHeaders.delete("Content-Length");
    }
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");
    newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    
    // Explicitly allow byte ranges for streaming
    newHeaders.set("Accept-Ranges", "bytes");
    
    // Force aggressive cache for 30 days. Telegram files are immutable.
    newHeaders.set("Cache-Control", "public, max-age=2592000, s-maxage=2592000, immutable");
    newHeaders.set("X-Proxy-Cache", "MISS");

    const mimeParam = url.searchParams.get("mime");
    if (mimeParam === "m3u8" || url.pathname.endsWith(".m3u8")) {
      newHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
    } else if (mimeParam === "ts" || url.pathname.endsWith(".ts")) {
      newHeaders.set("Content-Type", "video/MP2T");
    } else if (mimeParam === "mp4" || url.pathname.endsWith(".mp4")) {
      newHeaders.set("Content-Type", "video/mp4");
    } else if (response.headers.get("Content-Type") === "application/octet-stream") {
      const contentLength = response.headers.get("Content-Length");
      if (contentLength && parseInt(contentLength, 10) < 100 * 1024) {
         newHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
      } else {
         newHeaders.set("Content-Type", "video/MP2T");
      }
    }

    let finalStatus = response.status;
    let finalStatusText = response.statusText;

    // 5. Store in Edge Cache
    if (response.status === 200 || response.status === 206) {
      const cacheBody = typeof body === "string" ? body : response.clone().body;
      const cacheableResponse = new Response(cacheBody, {
        status: 200,
        statusText: "OK",
        headers: newHeaders
      });
      ctx.waitUntil(cache.put(cacheKey, cacheableResponse));
    }

    return new Response(body, {
      status: finalStatus,
      statusText: finalStatusText,
      headers: newHeaders
    });
  }
};

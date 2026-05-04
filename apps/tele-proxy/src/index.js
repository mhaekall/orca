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
    const cacheKey = new Request(url.toString(), request);
    
    // 1. Check cache first
    let response = await cache.match(cacheKey);

    if (!response) {
      let targetUrl = `https://api.telegram.org${url.pathname}`;

      // 2. If it's a /stream/bot<TOKEN>/<FILE_ID> request, resolve via getFile
      const streamMatch = url.pathname.match(/^\/stream\/bot([^\/]+)\/(.+)$/);
      if (streamMatch) {
        const token = streamMatch[1];
        let fileId = streamMatch[2];
        
        // Strip extension if present so Telegram API doesn't fail
        fileId = fileId.replace(/\.(mp4|m3u8|ts)$/, "");
        
        // Resolve file_path
        const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
        const getFileRes = await fetch(getFileUrl);
        
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

      // Fetch the actual file from Telegram
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
      });

      response = await fetch(modifiedRequest);
      
      if (!response.ok && response.status !== 206) {
         // Return immediately if failed (e.g. 404)
         return new Response(response.body, {
             status: response.status,
             headers: response.headers
         });
      }

      // 3. Rebuild headers for aggressive caching and CORS
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");
      newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      newHeaders.set("Accept-Ranges", "bytes");
      
      // Force cache for 30 days since file_id data is immutable
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
        if (contentLength && parseInt(contentLength, 10) < 1024 * 1024) {
           newHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
        } else {
           newHeaders.set("Content-Type", "video/MP2T");
        }
      }

      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });

      // 4. Cache it
      if (response.status === 200 || response.status === 206) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }
    } else {
      // 5. CACHE HIT
      const newHeaders = new Headers(response.headers);
      newHeaders.set("X-Proxy-Cache", "HIT");
      newHeaders.set("Access-Control-Allow-Origin", "*");
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return response;
  }
};
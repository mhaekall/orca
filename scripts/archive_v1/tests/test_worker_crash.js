export default {
  async fetch(request, env, ctx) {
    try {
        const url = "https://api.telegram.org/file/bot8661115912:AAEc1VN4dhI7Zh3PlVHmiwZrR2uwm-WHCOU/documents/file_398";
        const response = await fetch(url, { headers: { "Range": "bytes=0-100" } });
        
        let newHeaders = new Headers(response.headers);
        newHeaders.delete("Content-Length");
        newHeaders.delete("Content-Range"); // TEST: delete Content-Range
        
        const cache = caches.default;
        const cacheKey = new Request("https://example.com/test");
        
        const cacheableResponse = new Response(response.clone().body, {
            status: 200,
            headers: newHeaders
        });
        
        // This is where it might crash!
        ctx.waitUntil(cache.put(cacheKey, cacheableResponse));
        
        return new Response(response.body, { status: 206, headers: response.headers });
    } catch (e) {
        return new Response(e.stack, { status: 500 });
    }
  }
}

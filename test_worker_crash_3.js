export default {
  async fetch(request, env, ctx) {
    try {
        const url = "https://api.telegram.org/file/bot7745690828:AAH3AS4ruQkNHLUp2osiVy_riIAAi4SrXB8/documents/file_0";
        const response = await fetch(url);
        
        let newHeaders = new Headers(response.headers);
        let body = response.body;
        
        const cache = caches.default;
        const cacheKey = new Request("https://example.com/test3");
        
        const finalResponse = new Response(body, {
            status: 200,
            headers: newHeaders
        });
        
        ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
        
        return finalResponse;
    } catch (e) {
        return new Response(e.stack, { status: 500 });
    }
  }
}

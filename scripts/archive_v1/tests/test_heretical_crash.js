export default {
  async fetch(request, env, ctx) {
    try {
      const targetUrl = "https://api.telegram.org/file/bot7745690828:AAH3AS4ruQkNHLUp2osiVy_riIAAi4SrXB8/documents/file_0";
      let responseFromOrigin = await fetch(targetUrl);
      let body = responseFromOrigin.body;
      let text = await responseFromOrigin.text();
      
      const randCb = Math.random().toString(36).substring(7);
      text = text.replace(/([?&])xcb=[^&\s]+/g, "");
      text = text.replace(/(https:\/\/tele-proxy[\w\.\/\-:]+\/[^\/\s\?]+)(?!\S*mime=ts)/g, `$1?mime=ts`);
      text = text.replace(/(mime=ts)/g, `$1&xcb=${randCb}`);
      
      body = text;
      
      let newHeaders = new Headers(responseFromOrigin.headers);
      newHeaders.delete("Content-Length");
      
      const finalResponse = new Response(body, {
        status: 200,
        headers: newHeaders
      });
      
      const cache = caches.default;
      const cacheKey = new Request("https://example.com/test4");
      ctx.waitUntil((async () => {
         try {
           await cache.put(cacheKey, finalResponse.clone());
         } catch (e) {
           console.error("Cache Put Error:", e);
         }
      })());
      
      return finalResponse;
    } catch (e) {
      return new Response("ERROR: " + e.stack, { status: 500 });
    }
  }
}

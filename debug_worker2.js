export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const decodedPath = decodeURIComponent(url.pathname);
    const streamMatch = decodedPath.match(/^\/stream\/bot([^\/]+)\/(.+)$/);
    if (!streamMatch) return new Response("Not found", { status: 404 });
    const token = streamMatch[1];
    let fileId = streamMatch[2];
    
    fileId = fileId.replace(/\.(mp4|m3u8|ts)$/i, "");
    
    const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
    const getFileRes = await fetch(getFileUrl);
    const getFileData = await getFileRes.json();
    
    if (!getFileData.ok) {
        return new Response("Invalid file_id", { status: 404 });
    }
    
    const filePath = getFileData.result.file_path;
    const targetUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
    });
    
    let body = response.body;
    let isModified = false;
    if (url.pathname.endsWith('.m3u8') || url.searchParams.get("mime") === "m3u8" || response.headers.get("Content-Type")?.includes("mpegurl")) {
      let text = await response.text();
      body = text;
      isModified = true;
    }

    const newHeaders = new Headers(response.headers);
    if (isModified) {
        newHeaders.delete("Content-Length");
    }

    const finalResponse = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });

    return finalResponse;
  }
}

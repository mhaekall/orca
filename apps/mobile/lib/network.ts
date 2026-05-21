/**
 * Centralized Networking Utility for Client-Side Scraping
 * Handles timeouts, custom headers, and basic anti-bot bypasses.
 */

export async function fetchHtml(url: string, customHeaders?: Record<string, string>): Promise<string> {
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
      throw new Error(`Koneksi ke server terlalu lama (Timeout) untuk URL: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

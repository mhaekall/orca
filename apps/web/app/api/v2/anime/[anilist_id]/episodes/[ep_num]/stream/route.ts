import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';
export const revalidate = 3600; // 1 hour cache ISR

export async function GET(request: Request, context: any) {
  const anilist_id = parseInt(context.params.anilist_id, 10);
  const ep_num = parseFloat(context.params.ep_num);
  
  if (isNaN(anilist_id) || isNaN(ep_num)) {
    return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get('refresh') === 'true';

  if (refresh) {
    // If client requested a refresh, proxy to Python HF immediately
    return proxyToHF(anilist_id, ep_num, request);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const sql = neon(dbUrl);

  try {
    // Tier 0: Telegram Swarm Storage check (0ms latency, Edge direct)
    const tgQuery = sql`
        SELECT id, "episodeUrl", "providerId"
        FROM   episodes
        WHERE  "anilistId" = ${anilist_id} AND "episodeNumber" = ${ep_num}
        AND ("episodeUrl" LIKE '%tg-proxy%' OR "episodeUrl" LIKE '%workers.dev%')
        LIMIT 1
    `;
    const tgRows = await tgQuery;

    if (tgRows && tgRows.length > 0) {
      const ep_url = tgRows[0].episodeUrl;
      return NextResponse.json({
        success: true,
        sources: [
            {
                provider: "Swarm Storage (Telegram)",
                quality: "1080p",
                url: ep_url,
                type: (ep_url.includes("tg-proxy") || ep_url.endsWith(".m3u8")) ? "hls" : "mp4",
                source: "telegram_swarm",
            }
        ],
        downloads: [],
        cache_layer: "L0-Telegram (Edge API)",
        latency_ms: 0,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
        }
      });
    }

    // If we didn't find a Telegram link, the stream needs to be resolved by the Ingestion Engine (Python)
    // We proxy this request to the HF space. This will wake it up, but it only happens
    // for anime that haven't been ingested into Swarm yet.
    return proxyToHF(anilist_id, ep_num, request);

  } catch (error: any) {
    console.error('[Stream API Error]', error);
    return proxyToHF(anilist_id, ep_num, request);
  }
}

async function proxyToHF(anilist_id: number, ep_num: number, request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const targetUrl = `https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/anime/${anilist_id}/episodes/${ep_num}/stream${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: "Failed to fetch from ingestion engine", details: e.message }, { status: 502 });
  }
}

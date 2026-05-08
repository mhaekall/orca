import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';
export const revalidate = 60; // 60 seconds Cache ISR

export async function GET(request: Request, context: any) {
  const anilist_id = parseInt(context.params.anilist_id, 10);
  
  if (isNaN(anilist_id)) {
    return NextResponse.json({ success: false, error: 'Invalid anilist_id' }, { status: 400 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const sql = neon(dbUrl);

  try {
    const metaQuery = sql`
        SELECT m.*, 
               c.title_preferred as "canonicalTitle", 
               c.episode_count_actual as "canonicalEpisodes",
               c.genres_local as "canonicalGenres",
               c.air_schedule_wib as "canonicalSchedule",
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'watching' AND ms.source_name = 'jikan_api') as "jikan_views",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0) as "local_views",
               (SELECT MAX("episodeNumber") FROM episodes e2 WHERE e2."anilistId" = m."anilistId") as "latestEpisode"
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE m."anilistId" = ${anilist_id}
    `;

    const epsQuery = sql`
        SELECT DISTINCT ON ("episodeNumber")
               "episodeNumber", "episodeTitle", "episodeUrl", "providerId", "thumbnailUrl"
        FROM   episodes
        WHERE  "anilistId" = ${anilist_id}
        ORDER  BY
               "episodeNumber" DESC,
               CASE "providerId"
                WHEN 'kuronime' THEN 1
                WHEN 'samehadaku' THEN 2
                WHEN 'oploverz' THEN 3
                WHEN 'doronime' THEN 4
                WHEN 'otakudesu' THEN 5
                ELSE 6
               END ASC
    `;

    const [metaRows, epsRows] = await Promise.all([metaQuery, epsQuery]);

    if (!metaRows || metaRows.length === 0) {
      // Not in DB — proxy to HF so it can scrape from AniList and save to DB
      return proxyToHF(anilist_id, request);
    }

    const metaData: any = { ...metaRows[0] };
    
    // Add calculated fields to match python response
    if (metaData.canonicalTitle) metaData.cleanTitle = metaData.canonicalTitle;
    if (metaData.canonicalEpisodes) metaData.totalEpisodes = metaData.canonicalEpisodes;

    metaData.episodes = epsRows.map(r => ({ ...r }));

    if (epsRows.length === 0) {
      // Empty episodes, trigger proxy so python enqueues sync
      const pData = await proxyToHF(anilist_id, request);
      return pData;
    }

    return NextResponse.json({
      success: true,
      data: metaData
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error: any) {
    console.error('[Anime Detail API Error]', error);
    return proxyToHF(anilist_id, request);
  }
}

async function proxyToHF(anilist_id: number, request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const targetUrl = `https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/anime/${anilist_id}${queryString ? '?' + queryString : ''}`;
    
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

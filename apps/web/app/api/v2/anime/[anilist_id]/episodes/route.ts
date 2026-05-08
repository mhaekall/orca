import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';
export const revalidate = 60; // 60 seconds Cache ISR

export async function GET(request: Request, context: any) {
  // Access params.anilist_id
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
    const hasEpsQuery = sql`SELECT COUNT(*) as cnt FROM episodes WHERE "anilistId" = ${anilist_id}`;
    const [countRow] = await hasEpsQuery;
    
    if (!countRow || countRow.cnt === 0 || countRow.cnt === '0') {
      // Proxy to HF so it can queue sync
      try {
        const response = await fetch(`https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/anime/${anilist_id}/episodes`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return NextResponse.json(data);
      } catch (e) {
        return NextResponse.json({ success: false, syncing: true, data: [] });
      }
    }

    const query = sql`
        SELECT DISTINCT ON ("episodeNumber")
               "episodeNumber", "episodeTitle", "episodeUrl", "providerId", "thumbnailUrl", "updatedAt"
        FROM   episodes
        WHERE  "anilistId" = ${anilist_id}
        ORDER  BY "episodeNumber" DESC,
               CASE "providerId" 
                 WHEN 'otakudesu' THEN 1 
                 WHEN 'samehadaku' THEN 2 
                 WHEN 'doronime' THEN 3 
                 WHEN 'oploverz' THEN 4 
                 ELSE 99 
               END
    `;

    const rows = await query;
    return NextResponse.json({
      success: true,
      data: rows.map(r => ({ ...r }))
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error: any) {
    console.error('[Episodes API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

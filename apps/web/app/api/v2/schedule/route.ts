import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';
export const revalidate = 3600; // Cache 1 hour

export async function GET(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const sql = neon(dbUrl);

  const query = `
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."score", m."nextAiringEpisode", m.popularity,
               COALESCE(c.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score,
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0) as local_views
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE m.status = 'RELEASING' AND m."nextAiringEpisode" IS NOT NULL
        ORDER BY local_views DESC, m.popularity DESC NULLS LAST
  `;

  try {
    const result: any = await sql.query(query, []);
    const rows = result.rows || result;

    const schedule: Record<string, any[]> = {
      "Senin": [],
      "Selasa": [],
      "Rabu": [],
      "Kamis": [],
      "Jumat": [],
      "Sabtu": [],
      "Minggu": [],
      "TBA": [],
    };

    const daysMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    for (const d of rows) {
      let dayName = "TBA";
      let timeStr = "";

      try {
        if (d.nextAiringEpisode) {
          const nextAir = typeof d.nextAiringEpisode === 'string' ? JSON.parse(d.nextAiringEpisode) : d.nextAiringEpisode;
          const airingAt = nextAir?.airingAt;
          if (airingAt) {
            // JS date is ms, airingAt is seconds
            const date = new Date(airingAt * 1000);
            
            // Convert to WIB (UTC+7)
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const wibDate = new Date(utc + (3600000 * 7));

            dayName = daysMap[wibDate.getDay()];
            
            const hours = String(wibDate.getHours()).padStart(2, '0');
            const minutes = String(wibDate.getMinutes()).padStart(2, '0');
            timeStr = `${hours}:${minutes} WIB`;
          }
        }
      } catch (e) {
        dayName = "TBA";
        timeStr = "";
      }

      let finalScore = d.score;
      if (d.local_score !== null && d.local_score !== undefined) {
        const val = parseFloat(d.local_score);
        finalScore = val <= 10 ? Math.floor(val * 10) : Math.floor(val);
      }

      let popV = d.popularity;
      if (!popV) {
        popV = (parseInt(d.anilistId) % 900) + 100;
      }

      const epsV = d.totalEpisodes || 12;
      const baseV = Math.floor(popV * epsV * 0.7);
      const finalViews = parseInt(d.local_views || 0) + baseV;

      schedule[dayName].push({
        id: String(d.anilistId),
        title: d.cleanTitle || d.nativeTitle,
        img: d.coverImage,
        score: finalScore,
        views: finalViews,
        latestEpisode: d.latestEpisode,
        airingTime: timeStr,
      });
    }

    // Filter empty
    const filteredSchedule: Record<string, any[]> = {};
    for (const [k, v] of Object.entries(schedule)) {
      if (v.length > 0) filteredSchedule[k] = v;
    }

    return NextResponse.json({ success: true, data: filteredSchedule }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error: any) {
    console.error('[Schedule API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

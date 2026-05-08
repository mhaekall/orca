import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';
export const revalidate = 60; // 60 seconds Cache ISR

export async function GET(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sort = searchParams.get('sort') || 'score';
  const genre = searchParams.get('genre');
  const status = searchParams.get('status');
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '24', 10);

  const offset = (page - 1) * limit;
  const sql = neon(dbUrl);

  try {
    let whereClause = '1=1';
    const values: any[] = [];

    if (q) {
      whereClause += ' AND (meta."cleanTitle" ILIKE $' + (values.length + 1) + ' OR meta."nativeTitle" ILIKE $' + (values.length + 1) + ')';
      values.push(`%${q}%`);
    }
    if (genre) {
      whereClause += ' AND meta.genres::text ILIKE $' + (values.length + 1);
      values.push(`%${genre}%`);
    }
    if (status) {
      whereClause += ' AND meta.status = $' + (values.length + 1);
      values.push(status);
    }

    const sortMap: Record<string, string> = {
      score: 'meta.score DESC NULLS LAST',
      popularity: 'meta.popularity DESC NULLS LAST',
      trending: 'meta.trending DESC NULLS LAST',
      newest: 'meta."seasonYear" DESC NULLS LAST',
    };
    const orderClause = sortMap[sort] || sortMap.score;

    values.push(limit);
    const limitIndex = values.length;
    values.push(offset);
    const offsetIndex = values.length;

    // Use raw query with dynamic WHERE clause mapped securely to arguments
    const query = `
        SELECT meta.*, 
               COUNT(e."episodeNumber") as episode_count,
               COALESCE(c.episode_count_actual, meta."totalEpisodes") as "totalEpisodes",
               (SELECT MAX("episodeNumber") FROM episodes e2 WHERE e2."anilistId" = meta."anilistId") as "latestEpisode"
        FROM anime_metadata meta
        LEFT JOIN canonical_anime c ON meta."anilistId" = c.anilist_id
        INNER JOIN episodes e ON meta."anilistId" = e."anilistId"
        WHERE ${whereClause}
        GROUP BY meta."anilistId", c.id
        ORDER BY ${orderClause}
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result: any = await sql.query(query, values);
    const rows = result.rows || result;

    // Format output just like the old JSON
    const data = rows.map((r: any) => ({
      ...r,
    }));

    return NextResponse.json({
      success: true,
      page,
      data
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });

  } catch (error: any) {
    console.error('[Browse API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

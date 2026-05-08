import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function GET(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'user_id is required' }, { status: 400 });
  }

  const sql = neon(dbUrl);

  const query = `
        SELECT c.*, 
               m."coverImage" as "coverImage",
               m."cleanTitle" as "cleanTitle",
               m."nativeTitle" as "nativeTitle",
               COALESCE(ca.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode"
        FROM collections c
        LEFT JOIN anime_metadata m ON c."animeSlug" = CAST(m."anilistId" AS VARCHAR)
        LEFT JOIN canonical_anime ca ON m."anilistId" = ca.anilist_id
        WHERE c."userId" = $1
        ORDER BY c."updatedAt" DESC
  `;

  try {
    const result: any = await sql.query(query, [userId]);
    const rows = result.rows || result;

    const data = rows.map((r: any) => ({
      id: r.animeSlug,
      title: r.cleanTitle || r.nativeTitle,
      img: r.coverImage,
      totalEps: r.totalEpisodes,
      progress: r.progress,
      status: r.status,
      updatedAt: r.updatedAt,
      latestEpisode: r.latestEpisode
    }));

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=0, stale-while-revalidate=60'
      }
    });

  } catch (error: any) {
    console.error('[Collection GET API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const sql = neon(dbUrl);

  try {
    const body = await request.json();
    const { user_id, anilistId, status, progress } = body;

    if (!user_id || !anilistId) {
      return NextResponse.json({ success: false, error: 'user_id and anilistId are required' }, { status: 400 });
    }

    const query = `
      INSERT INTO collections ("userId", "animeSlug", "status", "progress", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT ("userId", "animeSlug") 
      DO UPDATE SET status = $3, progress = $4, "updatedAt" = NOW()
    `;

    await sql.query(query, [user_id, String(anilistId), status || 'plan_to_watch', progress || 0]);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Collection POST API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const anilistId = searchParams.get('anilistId');

  if (!userId || !anilistId) {
    return NextResponse.json({ success: false, error: 'user_id and anilistId are required' }, { status: 400 });
  }

  const sql = neon(dbUrl);

  try {
    const query = `DELETE FROM collections WHERE "userId" = $1 AND "animeSlug" = $2`;
    await sql.query(query, [userId, String(anilistId)]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Collection DELETE API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

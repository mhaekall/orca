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
    SELECT 
        wh.*,
        m."cleanTitle",
        m."nativeTitle",
        m."coverImage"
    FROM watch_history wh
    LEFT JOIN anime_metadata m ON wh."animeSlug" = CAST(m."anilistId" AS VARCHAR)
    WHERE wh."userId" = $1
    ORDER BY wh."updatedAt" DESC
  `;

  try {
    const result: any = await sql.query(query, [userId]);
    const rows = result.rows || result;
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('[Progress GET API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { user_id, anilistId, episodeNumber, progressSeconds, durationSeconds, isCompleted } = body;

    if (!user_id || !anilistId || episodeNumber === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sql = neon(dbUrl);

    const query = `
      INSERT INTO watch_history ("userId", "animeSlug", "episode", "timestampSec", "durationSec", "completed", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT ("userId", "animeSlug", "episode")
      DO UPDATE SET 
        "timestampSec" = EXCLUDED."timestampSec",
        "durationSec" = EXCLUDED."durationSec",
        "completed" = EXCLUDED."completed",
        "updatedAt" = NOW()
    `;

    await sql.query(query, [
      user_id,
      String(anilistId),
      Number(episodeNumber),
      progressSeconds || 0,
      durationSeconds || 0,
      Boolean(isCompleted)
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Progress POST API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

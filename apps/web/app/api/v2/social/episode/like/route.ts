import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function POST(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { user_id, anilistId, episodeNumber } = body;

    if (!user_id || !anilistId || episodeNumber === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sql = neon(dbUrl);

    // Check if like exists
    const checkQuery = `SELECT id FROM episode_likes WHERE "user_id" = $1 AND "anilistId" = $2 AND "episodeNumber" = $3 LIMIT 1`;
    const checkResult: any = await sql.query(checkQuery, [user_id, Number(anilistId), Number(episodeNumber)]);
    const rows = checkResult.rows || checkResult;

    if (rows.length > 0) {
      // Remove like
      const delQuery = `DELETE FROM episode_likes WHERE id = $1`;
      await sql.query(delQuery, [rows[0].id]);
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // Add like
      const insQuery = `INSERT INTO episode_likes ("user_id", "anilistId", "episodeNumber") VALUES ($1, $2, $3)`;
      await sql.query(insQuery, [user_id, Number(anilistId), Number(episodeNumber)]);

      // Add to activity feed
      const feedQuery = `
        INSERT INTO activity_feed ("user_id", "event_type", "metadata", "created_at")
        VALUES ($1, $2, $3, NOW())
      `;
      const metadata = JSON.stringify({ anilistId: Number(anilistId), episodeNumber: Number(episodeNumber) });
      await sql.query(feedQuery, [user_id, 'liked_episode', metadata]);

      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error: any) {
    console.error('[Episode Like POST API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

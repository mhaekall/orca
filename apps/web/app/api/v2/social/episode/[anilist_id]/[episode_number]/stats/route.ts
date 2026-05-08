import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ anilist_id: string; episode_number: string }> }
) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  const { anilist_id, episode_number } = await params;
  const sql = neon(dbUrl);

  try {
    const likeQuery = `SELECT COUNT(id) as likes_count FROM episode_likes WHERE "anilistId" = $1 AND "episodeNumber" = $2`;
    const likeResult: any = await sql.query(likeQuery, [Number(anilist_id), Number(episode_number)]);
    const likesCount = parseInt(likeResult.rows ? likeResult.rows[0].likes_count : likeResult[0].likes_count) || 0;

    let userLiked = false;
    if (userId) {
      const userLikeQuery = `SELECT id FROM episode_likes WHERE "user_id" = $1 AND "anilistId" = $2 AND "episodeNumber" = $3 LIMIT 1`;
      const userLikeResult: any = await sql.query(userLikeQuery, [userId, Number(anilist_id), Number(episode_number)]);
      const rows = userLikeResult.rows || userLikeResult;
      userLiked = rows.length > 0;
    }

    return NextResponse.json({
      success: true,
      likes: likesCount,
      user_liked: userLiked
    });
  } catch (error: any) {
    console.error('[Episode Stats GET API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

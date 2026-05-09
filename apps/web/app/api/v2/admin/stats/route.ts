import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function GET(request: Request) {
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const sql = neon(dbUrl);

  try {
    const [animeCount, epCount, userCount, commentCount] = await Promise.all([
      sql.query(`SELECT COUNT(*) as count FROM anime_metadata`),
      sql.query(`SELECT COUNT(*) as count FROM episodes`),
      sql.query(`SELECT COUNT(*) as count FROM "user"`),
      sql.query(`SELECT COUNT(*) as count FROM comments`)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total_anime: parseInt((animeCount as any).rows[0].count),
        total_episodes: parseInt((epCount as any).rows[0].count),
        total_users: parseInt((userCount as any).rows[0].count),
        total_comments: parseInt((commentCount as any).rows[0].count),
      }
    });
  } catch (error: any) {
    console.error('[Admin Stats API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

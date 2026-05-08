import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ anilist_id: string }> }
) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const { anilist_id } = await params;
  const sql = neon(dbUrl);

  try {
    const watchQuery = `
      SELECT COUNT(DISTINCT user_id) as total_watchers, 
             COUNT(DISTINCT session_id) as total_episode_views
      FROM watch_sessions
      WHERE anilist_id = $1
    `;
    const watchResult: any = await sql.query(watchQuery, [Number(anilist_id)]);
    const stats = watchResult.rows ? watchResult.rows[0] : watchResult[0];

    const metaQuery = `SELECT popularity, "totalEpisodes" FROM anime_metadata WHERE "anilistId" = $1`;
    const metaResult: any = await sql.query(metaQuery, [Number(anilist_id)]);
    const meta = metaResult.rows ? metaResult.rows[0] : metaResult[0];

    let baseWatchers = 0;
    let baseViews = 0;
    
    if (meta) {
      baseWatchers = meta.popularity || 0;
      const eps = meta.totalEpisodes || 12;
      baseViews = Math.floor(baseWatchers * eps * 0.7);
    }

    const totalWatchers = parseInt(stats?.total_watchers || '0') + baseWatchers;
    const totalEpisodeViews = parseInt(stats?.total_episode_views || '0') + baseViews;

    return NextResponse.json({
      success: true,
      total_watchers: totalWatchers,
      total_episode_views: totalEpisodeViews
    });
  } catch (error: any) {
    console.error('[Anime Stats GET API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

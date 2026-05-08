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
    const { user_id, anilist_id, episode_number, watch_duration_sec, total_duration_sec, quality_watched, provider_used } = body;

    if (!user_id || !anilist_id || episode_number === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sessionId = `${user_id}_${anilist_id}_${episode_number}`;
    
    let isCompleted = 0.0;
    if (total_duration_sec > 0) {
      if ((watch_duration_sec / total_duration_sec) > 0.9) {
        isCompleted = 1.0;
      } else {
        isCompleted = watch_duration_sec / total_duration_sec;
      }
    }

    const sql = neon(dbUrl);

    const query = `
      INSERT INTO watch_sessions (
        "session_id", "user_id", "anilist_id", "episode_number", 
        "watch_duration_sec", "total_duration_sec", "drop_timestamp_sec", 
        "completion_rate", "quality_watched", "provider_used", "ended_at"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT ("session_id")
      DO UPDATE SET 
        "watch_duration_sec" = GREATEST(watch_sessions.watch_duration_sec, EXCLUDED.watch_duration_sec),
        "total_duration_sec" = EXCLUDED.total_duration_sec,
        "drop_timestamp_sec" = EXCLUDED.watch_duration_sec,
        "completion_rate" = GREATEST(watch_sessions.completion_rate, EXCLUDED.completion_rate),
        "quality_watched" = EXCLUDED.quality_watched,
        "provider_used" = EXCLUDED.provider_used,
        "ended_at" = NOW()
    `;

    await sql.query(query, [
      sessionId,
      user_id,
      Number(anilist_id),
      Number(episode_number),
      watch_duration_sec || 0,
      total_duration_sec || 0,
      watch_duration_sec || 0,
      isCompleted,
      quality_watched || '',
      provider_used || ''
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Watch Session POST API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

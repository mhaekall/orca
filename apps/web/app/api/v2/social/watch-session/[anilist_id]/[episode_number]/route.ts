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

  if (!userId) {
    return NextResponse.json({ success: true, data: null });
  }

  const { anilist_id, episode_number } = await params;
  const sessionId = `${userId}_${anilist_id}_${episode_number}`;

  const sql = neon(dbUrl);

  const query = `SELECT * FROM watch_sessions WHERE session_id = $1`;

  try {
    const result: any = await sql.query(query, [sessionId]);
    const rows = result.rows || result;
    
    if (rows.length > 0) {
      return NextResponse.json({ success: true, data: rows[0] });
    }
    
    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    console.error('[Watch Session GET API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
    const query = `
      SELECT r.id, r.user_id, u.name as username, r.anilist_id, r.episode_number, r.issue_type, r.player_error, r.video_url, r.status, r.created_at,
             a."cleanTitle" as title
      FROM user_reports r
      LEFT JOIN "user" u ON r.user_id = u.id
      LEFT JOIN anime_metadata a ON r.anilist_id = a."anilistId"
      ORDER BY r.created_at DESC
      LIMIT 100
    `;
    const result: any = await sql.query(query);
    const rows = result.rows || result;

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('[Admin Reports API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id and status are required' }, { status: 400 });
    }

    const sql = neon(dbUrl);
    await sql.query(`UPDATE user_reports SET status = $1 WHERE id = $2`, [status, Number(id)]);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Reports PATCH Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
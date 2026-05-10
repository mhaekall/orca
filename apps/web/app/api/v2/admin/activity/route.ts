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
      SELECT af.id, af.user_id, u.name as username, u.image as avatar, af.event_type, af.metadata, af.created_at
      FROM activity_feed af
      LEFT JOIN "user" u ON af.user_id = u.id
      ORDER BY af.created_at DESC
      LIMIT 100
    `;
    const result: any = await sql.query(query);
    const rows = result.rows || result;

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('[Admin Activity API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ anilist_id: string }> }
) {
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const { anilist_id } = await params;
  const sql = neon(dbUrl);

  try {
    const query = `
      SELECT id, "episodeNumber", "providerId", "episodeUrl"
      FROM episodes
      WHERE "anilistId" = $1
      ORDER BY "episodeNumber" ASC, "providerId" ASC
    `;
    const result: any = await sql.query(query, [Number(anilist_id)]);
    const rows = result.rows || result;

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('[Admin Episodes API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

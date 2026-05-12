import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: any
) {
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const anilistId = parseInt(params.anilist_id);
  const sql = neon(dbUrl);

  try {
    const dataResult: any = await sql.query(`
      SELECT id, "episodeNumber", "providerId", "episodeUrl", "updatedAt"
      FROM swarm_vault
      WHERE "anilistId" = $1
      ORDER BY "episodeNumber" DESC
    `, [anilistId]);

    const rows = dataResult.rows || dataResult;
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

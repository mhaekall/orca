import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function POST(request: Request) {
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
    await sql.query(`
      INSERT INTO swarm_vault ("anilistId", title, "episodeNumber", "providerId", "episodeUrl")
      SELECT DISTINCT ON (e."episodeUrl")
             e."anilistId", a."cleanTitle", e."episodeNumber", e."providerId", e."episodeUrl"
      FROM episodes e
      LEFT JOIN anime_metadata a ON e."anilistId" = a."anilistId"
      WHERE (e."episodeUrl" LIKE '%tg-proxy%' OR e."episodeUrl" LIKE '%workers.dev%')
      ON CONFLICT ("episodeUrl") DO UPDATE 
      SET "anilistId" = EXCLUDED."anilistId", title = EXCLUDED.title, 
          "episodeNumber" = EXCLUDED."episodeNumber", "providerId" = EXCLUDED."providerId", 
          "updatedAt" = now();
    `);

    return NextResponse.json({ success: true, message: "Successfully synchronized all Telegram links to the Vault." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

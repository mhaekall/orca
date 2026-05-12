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
    const dataResult: any = await sql.query(`
      SELECT id, "anilistId", title, "episodeNumber", "providerId", "episodeUrl", "updatedAt"
      FROM swarm_vault
      ORDER BY "updatedAt" DESC
    `);
    
    const rows = dataResult.rows || dataResult;
    
    const header = ["id", "anilistId", "title", "episodeNumber", "providerId", "episodeUrl", "updatedAt"];
    let csv = header.join(",") + "\n";
    
    for (const r of rows) {
       const rowData = [
         r.id,
         r.anilistId,
         `"${(r.title || 'Unknown').replace(/"/g, '""')}"`,
         r.episodeNumber,
         `"${r.providerId}"`,
         `"${r.episodeUrl}"`,
         r.updatedAt ? r.updatedAt.toISOString() : ""
       ];
       csv += rowData.join(",") + "\n";
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=swarm_vault_backup.csv'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

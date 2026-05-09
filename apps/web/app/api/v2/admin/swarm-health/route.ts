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

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all';

  const sql = neon(dbUrl);

  try {
    let query = `
      SELECT e.id, e."anilistId", e."episodeNumber", e."episodeUrl", a."cleanTitle" as title
      FROM episodes e
      LEFT JOIN anime_metadata a ON e."anilistId" = a."anilistId"
    `;

    if (filter === 'error') {
      query += ` WHERE e."episodeUrl" IS NULL OR e."episodeUrl" = '' OR e."episodeUrl" NOT LIKE '%tg-proxy%' AND e."episodeUrl" NOT LIKE '%workers.dev%'`;
    } else if (filter === 'healthy') {
      query += ` WHERE e."episodeUrl" LIKE '%tg-proxy%' OR e."episodeUrl" LIKE '%workers.dev%'`;
    }

    query += ` ORDER BY e.id DESC LIMIT 1000`; // Limit to avoid edge memory issues

    const result: any = await sql.query(query);
    const rows = result.rows || result;

    const data = rows.map((r: any) => {
      const url = r.episodeUrl || '';
      const isHealthy = url.includes('tg-proxy') || url.includes('workers.dev');
      return {
        id: r.id,
        anilistId: r.anilistId,
        episodeNumber: r.episodeNumber,
        episodeUrl: url,
        title: r.title,
        healthy: isHealthy,
        status: isHealthy ? 'OK' : (url ? 'External Provider' : 'Missing URL')
      };
    });

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('[Admin Swarm Health API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

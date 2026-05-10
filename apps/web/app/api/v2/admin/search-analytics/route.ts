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
      SELECT query, COUNT(*) as searches, MAX(results_count) as latest_results_count, MAX(created_at) as last_searched
      FROM search_analytics
      GROUP BY query
      ORDER BY searches DESC
      LIMIT 100
    `;
    const result: any = await sql.query(query);
    const rows = result.rows || result;

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('[Admin Search Analytics API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

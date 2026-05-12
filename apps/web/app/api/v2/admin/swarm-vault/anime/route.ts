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
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';

  const offset = (page - 1) * limit;
  const sql = neon(dbUrl);

  let whereClause = "1=1";
  const values: any[] = [];
  let valueIndex = 1;

  if (search) {
    if (/^\d+$/.test(search)) {
      whereClause += ` AND v."anilistId" = $${valueIndex++}`;
      values.push(parseInt(search));
    } else {
      whereClause += ` AND v.title ILIKE $${valueIndex++}`;
      values.push(`%${search}%`);
    }
  }

  const countQuery = `
    SELECT COUNT(DISTINCT v."anilistId") as total
    FROM swarm_vault v
    WHERE ${whereClause}
  `;

  const dataQuery = `
    SELECT 
        v."anilistId", 
        MAX(v.title) as title,
        COUNT(v.id) as episode_count,
        MAX(a."coverImage") as cover,
        MAX(a.status) as status,
        MAX(a.year) as year,
        COUNT(v.id) as tg_count
    FROM swarm_vault v
    LEFT JOIN anime_metadata a ON v."anilistId" = a."anilistId"
    WHERE ${whereClause}
    GROUP BY v."anilistId"
    ORDER BY MAX(v."updatedAt") DESC
    LIMIT $${valueIndex++} OFFSET $${valueIndex++}
  `;

  try {
    let globalStats = null;
    if (page === 1 && !search) {
       const statsRes: any = await sql.query(`SELECT COUNT(id) as total_episodes FROM swarm_vault`);
       const st = statsRes.rows ? statsRes.rows[0] : statsRes[0];
       globalStats = {
         total_episodes: parseInt(st.total_episodes || '0'),
         tg_episodes: parseInt(st.total_episodes || '0')
       };
    }

    const countResult: any = await sql.query(countQuery, values);
    const totalCount = parseInt(countResult.rows ? countResult.rows[0].total : countResult[0].total);

    const dataValues = [...values, limit, offset];
    const dataResult: any = await sql.query(dataQuery, dataValues);
    const rows = dataResult.rows || dataResult;

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      data: rows,
      stats: globalStats,
      pagination: {
        total: totalCount,
        page,
        limit,
        total_pages: totalPages
      }
    });
  } catch (error: any) {
    console.error('[Admin Vault API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

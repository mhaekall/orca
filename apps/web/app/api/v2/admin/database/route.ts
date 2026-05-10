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
  const hideEmpty = searchParams.get('hide_empty') === 'true';
  const onlyTg = searchParams.get('only_tg') === 'true';
  const brokenOnly = searchParams.get('broken_only') === 'true';
  const sort = searchParams.get('sort') || 'year_desc';

  const offset = (page - 1) * limit;
  const sql = neon(dbUrl);

  let whereClause = "1=1";
  let havingClause = "1=1";
  const values: any[] = [];
  let valueIndex = 1;

  if (search) {
    if (/^\d+$/.test(search)) {
      whereClause += ` AND a."anilistId" = $${valueIndex++}`;
      values.push(parseInt(search));
    } else {
      whereClause += ` AND a."cleanTitle" ILIKE $${valueIndex++}`;
      values.push(`%${search}%`);
    }
  }

  if (hideEmpty) {
    havingClause += " AND COUNT(e.id) > 0";
  }

  if (onlyTg) {
    havingClause += ` AND SUM(CASE WHEN e."episodeUrl" LIKE '%tg-proxy%' OR e."episodeUrl" LIKE '%workers.dev%' THEN 1 ELSE 0 END) > 0`;
  }

  if (brokenOnly) {
    havingClause += ` AND SUM(CASE WHEN e."episodeUrl" IS NULL OR e."episodeUrl" = '' OR (e."episodeUrl" NOT LIKE '%tg-proxy%' AND e."episodeUrl" NOT LIKE '%workers.dev%') THEN 1 ELSE 0 END) > 0`;
  }

  let orderClause = `a.year DESC NULLS LAST, a."cleanTitle" ASC`;
  if (sort === 'year_asc') orderClause = `a.year ASC NULLS LAST, a."cleanTitle" ASC`;
  if (sort === 'title_asc') orderClause = `a."cleanTitle" ASC`;
  if (sort === 'title_desc') orderClause = `a."cleanTitle" DESC`;
  if (sort === 'episodes_desc') orderClause = `episode_count DESC, a."cleanTitle" ASC`;
  if (sort === 'episodes_asc') orderClause = `episode_count ASC, a."cleanTitle" ASC`;

  const countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT a."anilistId"
      FROM anime_metadata a
      LEFT JOIN episodes e ON a."anilistId" = e."anilistId"
      WHERE ${whereClause}
      GROUP BY a."anilistId"
      HAVING ${havingClause}
    ) as subq
  `;

  const dataQuery = `
    SELECT a."anilistId", a."cleanTitle" as title, a.genres, a.status, a.year, a."coverImage" as cover,
           COUNT(e.id) as episode_count,
           SUM(CASE WHEN e."episodeUrl" LIKE '%tg-proxy%' OR e."episodeUrl" LIKE '%workers.dev%' THEN 1 ELSE 0 END) as tg_count,
           MAX(e."providerId") as "providerId"
    FROM anime_metadata a
    LEFT JOIN episodes e ON a."anilistId" = e."anilistId"
    WHERE ${whereClause}
    GROUP BY a."anilistId", a."cleanTitle", a.genres, a.status, a.year, a."coverImage"
    HAVING ${havingClause}
    ORDER BY ${orderClause}
    LIMIT $${valueIndex++} OFFSET $${valueIndex++}
  `;

  try {
    const countResult: any = await sql.query(countQuery, values);
    const totalCount = parseInt(countResult.rows ? countResult.rows[0].total : countResult[0].total);

    const dataValues = [...values, limit, offset];
    const dataResult: any = await sql.query(dataQuery, dataValues);
    const rows = dataResult.rows || dataResult;

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        total_pages: totalPages
      }
    });
  } catch (error: any) {
    console.error('[Admin DB API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function GET(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const anilistId = searchParams.get('anilistId');
  const episodeNumber = searchParams.get('episodeNumber');
  const userId = searchParams.get('user_id') || '';

  if (!anilistId || !episodeNumber) {
    return NextResponse.json({ success: false, error: 'anilistId and episodeNumber are required' }, { status: 400 });
  }

  const sql = neon(dbUrl);

  const query = `
    SELECT 
        c.id, c.user_id, u.name as username, u.image as avatar, 
        c.text, c.timestamp_sec, c.created_at, c.parent_id,
        COUNT(cr.id) FILTER (WHERE cr.emoji = 'like') as likes_count,
        EXISTS(SELECT 1 FROM comment_reactions cr2 WHERE cr2.comment_id = c.id AND cr2.user_id = $1 AND cr2.emoji = 'like') as user_liked
    FROM comments c
    LEFT JOIN "user" u ON c.user_id = u.id
    LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
    WHERE c."anilistId" = $2 AND c."episodeNumber" = $3
    GROUP BY c.id, u.name, u.image
    ORDER BY c.created_at DESC
  `;

  try {
    const result: any = await sql.query(query, [userId, Number(anilistId), Number(episodeNumber)]);
    const rows = result.rows || result;

    // Organize into a tree
    const commentMap: Record<number, any> = {};
    const topLevel: any[] = [];

    for (const row of rows) {
      commentMap[row.id] = { ...row, replies: [] };
    }

    for (const c of Object.values(commentMap)) {
      if (c.parent_id && commentMap[c.parent_id]) {
        commentMap[c.parent_id].replies.push(c);
      } else {
        topLevel.push(c);
      }
    }

    return NextResponse.json(topLevel);
  } catch (error: any) {
    console.error('[Comments GET API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { user_id, anilistId, episodeNumber, text, parent_id, timestamp_sec } = body;

    if (!user_id || !anilistId || episodeNumber === undefined || !text) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sql = neon(dbUrl);

    const query = `
      INSERT INTO comments ("user_id", "anilistId", "episodeNumber", "text", "parent_id", "timestamp_sec", "created_at")
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `;

    const result: any = await sql.query(query, [
      user_id,
      Number(anilistId),
      Number(episodeNumber),
      text,
      parent_id || null,
      timestamp_sec || null
    ]);
    
    const rows = result.rows || result;
    const newId = rows[0]?.id;

    return NextResponse.json({ success: true, id: newId });
  } catch (error: any) {
    console.error('[Comments POST API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

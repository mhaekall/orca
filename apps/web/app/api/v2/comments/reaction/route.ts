import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function POST(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { comment_id, user_id, emoji } = body;

    if (!comment_id || !user_id || !emoji) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sql = neon(dbUrl);

    // Check if exists
    const checkQuery = `SELECT id FROM comment_reactions WHERE comment_id = $1 AND user_id = $2 AND emoji = $3 LIMIT 1`;
    const checkResult: any = await sql.query(checkQuery, [Number(comment_id), user_id, emoji]);
    const rows = checkResult.rows || checkResult;

    if (rows.length > 0) {
      // Remove reaction
      const delQuery = `DELETE FROM comment_reactions WHERE id = $1`;
      await sql.query(delQuery, [rows[0].id]);
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // Add reaction
      const insQuery = `INSERT INTO comment_reactions (comment_id, user_id, emoji) VALUES ($1, $2, $3)`;
      await sql.query(insQuery, [Number(comment_id), user_id, emoji]);
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error: any) {
    console.error('[Comments Reaction POST API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

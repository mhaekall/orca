import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ episode_id: string }> }
) {
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const { episode_id } = await params;
  const sql = neon(dbUrl);

  try {
    const query = `DELETE FROM episodes WHERE id = $1`;
    await sql.query(query, [Number(episode_id)]);

    return NextResponse.json({ success: true, message: `Episode ${episode_id} deleted` });
  } catch (error: any) {
    console.error('[Admin Episode DELETE API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

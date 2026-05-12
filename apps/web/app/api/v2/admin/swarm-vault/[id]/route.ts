import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

export async function PUT(
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

  const vaultId = parseInt(params.id);
  const sql = neon(dbUrl);

  try {
    const body = await request.json();
    await sql.query(`
      UPDATE swarm_vault 
      SET "anilistId" = $1, title = $2, "episodeNumber" = $3, 
          "providerId" = $4, "episodeUrl" = $5, "updatedAt" = now()
      WHERE id = $6
    `, [body.anilistId, body.title || null, body.episodeNumber, body.providerId, body.episodeUrl, vaultId]);

    return NextResponse.json({ success: true, message: "Vault entry updated successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
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

  const vaultId = parseInt(params.id);
  const sql = neon(dbUrl);

  try {
    await sql.query(`DELETE FROM swarm_vault WHERE id = $1`, [vaultId]);
    return NextResponse.json({ success: true, message: "Vault entry deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

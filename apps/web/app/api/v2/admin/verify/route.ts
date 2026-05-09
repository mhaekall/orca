import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ success: true, message: "Admin key verified" });
}

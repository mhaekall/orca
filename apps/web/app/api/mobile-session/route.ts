export const runtime = "edge";
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  
  let tokenMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
  if (!tokenMatch) {
    tokenMatch = cookieHeader.match(/__Secure-better-auth\.session_token=([^;]+)/);
  }
  const token = tokenMatch ? tokenMatch[1] : null;

  return NextResponse.json({ token: token || null, rawCookie: cookieHeader });
}

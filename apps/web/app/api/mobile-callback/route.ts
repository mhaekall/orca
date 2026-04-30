export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  let token = cookieStore.get('better-auth.session_token')?.value || cookieStore.get('__Secure-better-auth.session_token')?.value;

  if (!token) {
    // Fallback if name is slightly different (e.g. prefix)
    const tokenCookie = allCookies.find(c => c.name.includes('session_token'));
    if (tokenCookie) {
      token = tokenCookie.value;
    }
  }

  if (token) {
    return NextResponse.redirect(`orca://app/auth-callback?token=${token}`);
  }
  
  return NextResponse.redirect(`orca://app/auth-callback?error=no_token`);
}
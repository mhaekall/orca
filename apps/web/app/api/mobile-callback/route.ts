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

  const deepLink = token 
    ? `orca://app/auth-callback?token=${token}`
    : `orca://app/auth-callback?error=no_token`;

  return new Response(
    `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width"></head>
<body style="background:black;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p>Kembali ke Orca...</p>
  <script>
    window.location.href = "${deepLink}";
    // Fallback: close tab setelah 2 detik
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
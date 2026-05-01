export const runtime = 'edge';

export async function GET(request: Request) {
  // Ambil session token dari cookie request secara manual (bypass Next.js cookie parser bug di Edge)
  const cookieHeader = request.headers.get('cookie') || '';
  let tokenMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
  if (!tokenMatch) {
    tokenMatch = cookieHeader.match(/__Secure-better-auth\.session_token=([^;]+)/);
  }
  const token = tokenMatch ? tokenMatch[1] : null;

  const deepLink = token
    ? `orca://app/auth-callback?token=${encodeURIComponent(token)}`
    : `orca://app/auth-callback?status=check_client`;

  return new Response(
    `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width"></head>
<body style="background:black;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p>Kembali ke Orca...</p>
  <script>
    localStorage.removeItem("orca_auth_tab");
    
    // Jika token didapat dari server cookie, langsung pakai deep link
    if ("${token}" !== "null") {
      window.location.href = "${deepLink}";
      setTimeout(() => window.close(), 2000);
    } else {
      // Fallback: Fetch session dari client-side AJAX (same-site) 
      fetch('/api/mobile-session', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            window.location.href = "orca://app/auth-callback?token=" + encodeURIComponent(data.token);
          } else {
            window.location.href = "orca://app/auth-callback?error=no_token";
          }
          setTimeout(() => window.close(), 2000);
        })
        .catch(err => {
          window.location.href = "orca://app/auth-callback?error=fetch_failed";
          setTimeout(() => window.close(), 2000);
        });
    }
  </script>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
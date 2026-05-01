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
  <a id="link" style="display:none"></a>
  <div style="text-align:center;">
    <div style="width:32px;height:32px;border:4px solid #0A84FF;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px;"></div>
    <p>Menyelesaikan Login...</p>
  </div>
  <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
  <script>
    localStorage.removeItem("orca_auth_tab");

    function redirect(token) {
      const deepLink = token
        ? "orca://app/auth-callback?token=" + encodeURIComponent(token)
        : "orca://app/auth-callback?error=no_token";

      // Simulate user gesture via anchor click — bypass Chrome Custom Tab block
      const a = document.getElementById("link");
      a.href = deepLink;
      a.click();

      // Fallback intent Android scheme (untuk Chrome yang block custom scheme)
      setTimeout(() => {
        window.location.href = "intent://app/auth-callback?token=" 
          + encodeURIComponent(token || '')
          + "#Intent;scheme=orca;package=com.animescraperpro.app;end";
      }, 500);

      // Fallback close
      setTimeout(() => window.close(), 2000);
    }

    const serverToken = "${token}";
    if (serverToken && serverToken !== "null") {
      redirect(serverToken);
    } else {
      // Fallback: Fetch session dari client-side AJAX (same-site) 
      fetch('/api/mobile-session', { credentials: 'include' })
        .then(r => r.json())
        .then(d => redirect(d.token || null))
        .catch(() => redirect(null));
    }
  </script>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
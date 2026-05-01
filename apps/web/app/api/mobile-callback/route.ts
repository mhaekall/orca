export const runtime = 'edge';

export async function GET(request: Request) {
  // Karena masalah SameSite=Lax pada cross-site redirect (dari Google kembali ke web), 
  // cookies() di Edge runtime seringkali kosong pada request pertama.
  // Solusi terkuat: render HTML yang melakukan AJAX fetch ke backend kita sendiri.
  // Karena fetch dilakukan dari halaman yang sudah termuat (same-origin), 
  // browser dijamin akan menyertakan seluruh cookie sesi secara penuh.

  return new Response(
    `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width"></head>
<body style="background:black;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center;">
    <div style="width:32px;height:32px;border:4px solid #0A84FF;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px;"></div>
    <p>Menyelesaikan Login...</p>
  </div>
  <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
  <script>
    localStorage.removeItem("orca_auth_tab");
    
    // Fetch token dari custom endpoint yang dijamin menerima cookie karena ini same-site AJAX
    fetch('/api/mobile-session', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          window.location.href = "orca://app/auth-callback?token=" + encodeURIComponent(data.token);
        } else {
          window.location.href = "orca://app/auth-callback?error=no_token_in_mobile_session";
        }
        setTimeout(() => window.close(), 2000);
      })
      .catch(err => {
        window.location.href = "orca://app/auth-callback?error=fetch_failed";
        setTimeout(() => window.close(), 2000);
      });
  </script>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
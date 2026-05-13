# 🎥 Telegram HLS Streaming & Proxy Architecture Quirks

Dokumen ini berisi panduan krusial dan rangkuman arsitektur *edge-case* yang ditemukan saat melakukan *debugging* ekstrem pada sistem streaming Anime Scraper Pro. 
**BACA INI SEBELUM MENGUBAH CLOUDFLARE WORKER, KOTLIN NATIVE PLAYER, ATAU URL PROXY!**

## 1. Hukum Mutlak Telegram `file_id`
- **Aturan:** `file_id` di Telegram **TIDAK GLOBAL**. Ia terkunci eksklusif pada token Bot yang pertama kali mengirim atau menerima pesan (file) tersebut.
- **Kasus Nyata:** 42 episode (termasuk *The Most Heretical Last Boss S1* dan *Tensura S1*) menggunakan `tg-proxy-4` dan `tg-proxy-2`. Link ini mati (Error 400) bukan karena file dihapus, tapi karena server mencoba membuka `file_id` menggunakan *Bot Token* yang salah (bukan pengunggah aslinya).
- **Solusi Baku:** Di `CustomVideoPlayer.tsx` (Mobile) dan `VideoPlayer.tsx` (Web), kita memiliki logika *Regex* yang "membajak" subdomain usang (`-4` atau `-2`) dan secara dinamis menggabungkannya dengan token bot pelacakan yang spesifik (`7745690...` atau `8425258...`). Jangan pernah menghapus logika *fallback token* ini.

## 2. Cloudflare Worker `cache.put` Asynchronous Bug (Error 1101)
- **Aturan:** JANGAN PERNAH memanggil `ctx.waitUntil(cache.put(cacheKey, response.clone()))` tanpa `try...catch` berlapis saat memproses *Binary Stream* besar (seperti potongan video `.ts` HLS).
- **Kasus Nyata:** Cloudflare secara acak bisa melempar `Error 1101: The "file" argument must be of type string. Received undefined` saat mencoba meng-kloning dan menyimpan *stream* yang ukurannya masif. Jika *error* ini tidak ditangkap, seluruh fungsi `fetch` Worker akan dihentikan dan video di HP penonton akan membeku (*buffering* tiada henti).
- **Solusi Baku:** Bungkus *Cache Put* menggunakan IIFE Async:
  ```javascript
  if (request.method === "GET" && (responseFromOrigin.status === 200 || responseFromOrigin.status === 206)) {
    ctx.waitUntil((async () => {
       try {
         await cache.put(cacheKey, finalResponse.clone());
       } catch (e) {
         console.error("Cache Put Error:", e); // Biarkan error ditelan, agar streaming ke penonton tidak terputus!
       }
    })());
  }
  ```

## 3. ExoPlayer HLS Duration "Zero" Bug (Kotlin Native)
- **Aturan:** JANGAN MENGHAPUS konfigurasi `DefaultLoadControl` (Buffer 5 Menit) dari `NativeVideoPlayerView.kt`.
- **Kasus Nyata:** Sempat terjadi *bug* di mana durasi semua video terbaca 00:00. Ini karena untuk video HLS (.m3u8), *ExoPlayer* (`androidx.media3`) secara *default* akan menolak mengevaluasi total durasi jika ukuran *buffer*-nya terlalu kecil untuk membaca keseluruhan *metadata chunk* di jaringan pelan.
- **Solusi Baku (Build #32 Configuration):** Kita WAJIB memaksakan *LoadControl* dengan konfigurasi khusus:
  ```kotlin
  val loadControl = DefaultLoadControl.Builder()
      .setBufferDurationsMs(
          5000,    // minBufferMs
          300000,  // maxBufferMs (5 minutes)
          2500,    // bufferForPlaybackMs
          5000     // bufferForPlaybackAfterRebufferMs
      )
      .build()
  ```
  Ini memberi *ExoPlayer* "ruang bernapas" yang cukup untuk mengurai durasi HLS dengan sempurna.

## 4. Hermes Engine vs `new URL()` Parsing Crash
- **Aturan:** JANGAN menggunakan `new URL(videoUrl)` untuk URL yang tidak lazim (misalnya mengandung titik dua `:` di luar protokol, seperti Token Bot Telegram) di dalam komponen React Native yang dieksekusi oleh Hermes JS.
- **Kasus Nyata:** `new URL("https://tele-proxy.dev/stream/bot1234:AAABB/id.m3u8")` akan membuat *Hermes* mengalami `Polyfill Crash` secara diam-diam karena ada `:` di tengah-tengah URL *path*. Hal ini menyebabkan sisa kode (seperti ekstensi pemaksaan `.m3u8`) tidak pernah tereksekusi.
- **Solusi Baku:** Gunakan manipulasi *String* manual biasa (seperti `.split('?')`) untuk URL yang rumit di React Native.

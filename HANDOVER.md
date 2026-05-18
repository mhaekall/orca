# Sesi Handover: Integrasi Manga Engine (Client-Side Scraping)

## 🎯 Pencapaian Sesi Ini (Manga/Manhwa Expansion)

Sesi ini berfokus pada perluasan kapabilitas aplikasi Orca untuk mendukung membaca komik (Manga/Manhwa) tanpa membebani server backend sama sekali, mengadaptasi arsitektur "Parasit" dari aplikasi aggregator bajakan raksasa (seperti Komikomi & Tachiyomi).

### 1. Arsitektur Client-Side Scraping ($0 Cost)
*   **Pergeseran Paradigma:** Berbeda dengan Anime yang membutuhkan Server/Proxy Worker untuk mem-bypass ekstensi `.m3u8` dan CORS, untuk Manga kita menggunakan **100% Client-Side Scraping**. HP pengguna yang akan mengeksekusi *fetch* langsung ke situs sumber, sehingga biaya server kita tetap $0 dan IP pengguna yang terdistribusi secara organik tidak akan di-banned oleh Cloudflare.
*   **Manga Engine (`lib/manga/engine.ts`):** 
    *   Membangun *engine* yang cerdas untuk mengunduh HTML dan mengekstrak data menggunakan `node-html-parser`.
    *   *Bugfix:* Sempat menggunakan `cheerio`, namun dihapus karena menyebabkan *error bundling* di Metro terkait ketergantungan modul bawaan Node.js. `node-html-parser` terbukti jauh lebih cepat dan kompatibel secara *native*.
    *   *Auto Lazy-Load Resolver:* Engine otomatis membongkar atribut `data-src` atau `data-lazy-src` jika mendeteksi gambar utama (cover) disembunyikan di balik *placeholder* (SVG) untuk menipu scraper.
    *   *Timeout Protection:* Menyuntikkan `AbortController` 15 detik agar aplikasi tidak *stuck* di layar *loading* jika server sumber mati.

### 2. Multi-Provider Ecosystem
*   **Sistem Registri (`lib/manga/sources/index.ts`):** Membangun sistem modular di mana setiap *provider* komik didefinisikan melalui struktur JSON (Selectors).
*   **Provider Aktif:**
    *   **Komikindo** (`komikindo.ch`): Sumber paling stabil dengan format WordPress standar.
    *   **Bacakomik** (`bacakomik.my`): Sumber yang sangat rajin merilis Manhwa/Manhua, dengan mekanisme *lazy-loading* yang berhasil di-bypass.
*   **Provider Dibuang (Error Log):**
    *   *Kiryuu* dicabut karena mereka bermigrasi ke SPA (Single Page Application - React/Next.js) sehingga HTML-nya tidak bisa di-parse secara statis.
    *   *Omicaso* dicabut karena mengaktifkan mode Cloudflare *Under Attack* (Challenge 403).
    *   *Mirrorkomik* dicabut karena DNS mati/gagal koneksi.

### 3. Resolusi UI/UX & Routing
*   **Segmented Control (Beranda):** Mengganti UI beranda untuk menyertakan tombol *toggle* elegan **[ Nonton | Baca ]** tepat di bawah Search Bar, memisahkan rute pengambilan data tanpa menambah tab bawah.
*   **Universal Card (`AnimeCard.tsx`):** Komponen disulap untuk menerima `mediaType="manga"`. Jika aktif, label "EPS" berubah menjadi "CH", "NEW" menjadi "UPDATE", dan rute kliknya berbelok ke `/manga/[id]`.
*   **Manga Detail (`app/manga/[id].tsx`):** Menampilkan sinopsis, *cover*, metadata, dan daftar *chapter* yang disedot *real-time*.
    *   *Bugfix:* Sempat terjadi *bug* urutan *chapter* terbalik (Chapter 136 isinya Chapter 1) karena kegagalan selector tag `<chapter>`. Diperbaiki dengan mengimplementasikan pembaca literal `@text` di *engine*.

### 4. Produksi Manga Reader Kelas Atas (`app/manga/read.tsx`)
*   **Seamless Vertical Stitching:** Membuang semua margin/padding dan mewajibkan latar `#000000` dengan `contentFit="fill"` agar susunan gambar manhwa menempel sempurna tanpa garis pemisah (1px gap).
*   **Anti-Flicker Scrolling:** Mengatur `removeClippedSubviews={false}` pada *FlatList* sehingga gambar tidak di- *unmount* paksa saat *scrolling* super cepat (mencegah layar berkedip putih).
*   **Predictive Auto-Height:** Membuat komponen `AutoHeightImage.tsx` yang menggunakan tinggi *placeholder* cerdas sebelum gambar asli dimuat untuk meminimalisasi *Layout Shift* (Lompatan posisi saat membaca).
*   **Reader Settings Modal:** Pengguna dapat menekan tombol Gear untuk mengatur:
    1.  *Mode Baca:* Webtoon (Vertikal) vs Manga (Geser/Horizontal Paging).
    2.  *Warna Latar:* Hitam, Gelap, atau Putih.
    3.  *Skala Gambar:* Penuh Layar (Fill) atau Muat Asli (Contain).
*   **Fullscreen Lock:** Fitur keamanan untuk mengunci layar (ikon Gembok) saat membaca agar sentuhan tidak sengaja tidak memunculkan menu overlay, lengkap dengan tombol apung rahasia untuk membuka kunci.

### 5. Stabilisasi Environment Termux (Metro Bundler)
*   **ENOSPC Error Tuntas:** Menyelesaikan *bug* paling brutal di Termux Android (batas pantauan *inotify*) dengan melakukan intalasi lokal `npm`/`pnpm` dan mengisolasi `.pnpm` agar tidak dipantau oleh Metro Bundler via `metro.config.js` (`watchPathIgnorePatterns`). Hasil kompilasi/ekspor berhasil 100% tanpa hambatan.

---

## 🚧 Backlog & Yang Belum Dikerjakan (Next Steps)

1.  **Fitur Offline Download:** 
    *   Memanfaatkan `expo-file-system` untuk men-download susunan gambar dari suatu *chapter* dan menyimpannya ke memori internal HP pengguna secara persisten agar bisa dibaca tanpa koneksi.
2.  **Universal Search (Manga):**
    *   Saat ini *Search Bar* masih terhubung ke backend Anime. Anda perlu menyambungkan fungsi ketikan *Search* ke fungsi `MangaEngine.getSearchList(rules)` untuk mencari manga langsung dari situs *provider* yang aktif.
3.  **Sinkronisasi Riwayat (Backend Integration):**
    *   Saat ini, jika pengguna membaca Manhwa, progresnya belum terkirim ke Database Neon (Postgres) Anda.
    *   Karena ID manga bukan `anilistId` (format kita: `providerId|slug`), tabel `watch_history` dan `collections` di *backend* Python harus dimigrasi agar menerima `external_id` berupa `String` yang toleran terhadap *Manga*.

---

*Catatan Terdahulu:*
# Sesi Handover: Refactor Arsitektur & Ekspansi Fitur Orca Mobile
[Isi dari handover sebelumnya terkait Anime, The Great Purge, dll tetap berlaku...]
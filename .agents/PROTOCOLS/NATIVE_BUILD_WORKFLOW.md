# Protokol Native Build & Video Architecture (Expo)

Dokumen ini mencatat keputusan arsitektural dan solusi kompleks terkait kompilasi Native (GitHub Actions), pemutaran video HLS, dan integrasi Google Sign-In yang dilakukan pada ekosistem Expo (React Native).

## 1. Arsitektur Video Player (Layer 4)
- **Komponen**: `expo-video` (berbasis AndroidX Media3 / ExoPlayer native murni).
- **Alasan Migrasi**: Menghindari *bridge overhead* dari React Native lama dan mengatasi *idle timeout* 56 detik (koneksi diputus oleh Telegram/Cloudflare karena player lama membatasi buffer di 50 detik).
- **Konfigurasi Khusus**: 
  - `preferredForwardBufferDuration` diset ke 300 detik (5 menit) untuk pengunduhan agresif.
  - Memanfaatkan event `timeUpdate` dari Native Listener. **JANGAN PERNAH** menggunakan `setInterval` dari sisi JavaScript untuk melakukan polling `currentTime` pada `expo-video`, karena jika komponen *unmount* atau terganti, *Interval* tersebut akan memicu *Crash (Already released object)*.

## 2. URL Encoding & Cloudflare Worker (Proxy)
- **Karakteristik OkHttp**: Klien jaringan di balik Android secara agresif melakukan URL-Encoding (seperti `:` pada Bot Token Telegram diubah menjadi `%3A`).
- **Aturan Worker (`tele-proxy`)**: Skrip Cloudflare Worker wajib menjalankan `decodeURIComponent(url.pathname)` di baris awal sebelum memilah RegEx. Tanpa ini, Token `%3A` akan terkirim ke Telegram API dan menghasilkan **HTTP 404 (Not Found)** untuk setiap pengambilan segmen video `.ts`.

## 3. Strategi Cache-Busting (HLS/M3U8)
- **Cache M3U8 Lokal**: OkHttp sering kali menyimpan memori cache HTTP 404 jika ada segmen video yang gagal diunduh. Jika tidak disiasati, ExoPlayer akan menolak mencoba ulang pengunduhan.
- **Implementasi**:
  1. **Sisi React Native**: URL awal proxy dibumbui `?cb=Date.now()` untuk membypass Edge Cache Cloudflare. Wajib dibungkus dengan `React.useMemo` agar `Date.now()` tidak dieksekusi berulang kali pada setiap siklus re-render UI.
  2. **Sisi Worker**: Worker secara dinamis mencari semua baris URL segmen di dalam manifest `.m3u8` dan menyuntikkan `&xcb=randomString` agar OkHttp di sisi Android selalu menganggap segmen tersebut sebagai file baru dan mengunduh ulang alih-alih melempar cache 404 lama.
  3. **Penanda Ekstensi**: Proxy HLS wajib memiliki ekstensi `.m3u8` di *pathname* agar `expo-video` bisa mengetahui bahwa itu adalah stream HLS (Mencegah error *None of the available extractors could read the stream*).

## 4. Bypass Limit EAS & Sinkronisasi SHA-1 Google Sign-In
- **Limit Bypass**: Jika batas gratis Expo Application Services (EAS) habis, proses *build* dapat dialihkan sepenuhnya ke GitHub Actions menggunakan perintah:
  `pnpm exec expo prebuild --platform android --clean` diikuti dengan `./gradlew assembleDebug`.
- **Ancaman Google Sign-In**: GitHub Actions secara bawaan men-generate `debug.keystore` yang berbeda setiap saat. Ini akan merusak validasi SHA-1 di Google Cloud Console sehingga memicu `DEVELOPER_ERROR` saat *Login*.
- **Solusi Ekstraksi Keystore**:
  - Telah diekstrak `expo.keystore` orisinal milik server EAS. File ini diamankan di dalam direktori `apps/mobile/`.
  - Di dalam *Workflow* GitHub Actions (`.github/workflows/build-expo-apk.yml`), `expo.keystore` tersebut disuntikkan secara dinamis (menggantikan *debug keystore* bawaan) dan memodifikasi file Gradle memakai `sed` untuk memasukkan password (`storePassword`, `keyAlias`, `keyPassword`).
  - **Hasil**: APK yang di-build dari GitHub Actions memiliki struktur sidik jari SHA-1 yang persis sama dengan build milik EAS.

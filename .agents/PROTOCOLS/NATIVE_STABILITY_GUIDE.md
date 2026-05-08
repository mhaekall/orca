# 🛡️ Protokol Stabilitas Native & Anti-Force Close (Android)

Dokumen ini adalah warisan dari sesi *debugging* intensif. Setiap AI Agent yang bertugas di proyek ini **WAJIB** membaca aturan ini sebelum melakukan modifikasi pada UI, Event Listeners, atau pemanggilan Native Modules (seperti Video Player atau Slider) di React Native.

Tujuan dokumen ini adalah untuk mencegah terjadinya **Fatal Native Crash (Force Close / FC)** di OS Android.

## 1. The OTA Trap (Native Modules vs OTA Updates)
- **Aturan:** JANGAN PERNAH mengirimkan OTA Update (`eas update`) jika Anda baru saja mengubah, menambah, atau menghapus library yang mengandung kode native (C++/Java/Kotlin/Swift) di `package.json`.
- **Alasan:** OTA Update hanya mengunduh *bundle Javascript*. Jika JS memanggil library native baru yang belum ada di APK pengguna, aplikasi akan mengalami `Fatal Exception` dan langsung *Force Close* saat halaman dirender.
- **Solusi:** Perubahan pada struktur native WAJIB menggunakan perintah Rebuild APK: `eas build -p android`.

## 2. The JNI Float Precision Overflow
- **Aturan:** Seluruh angka desimal (Float) yang akan dilempar dari Javascript ke Native Modules (misalnya mengatur `player.currentTime` atau `width` persentase di Yoga Layout) **WAJIB** dibatasi presisinya dan dilindungi dari `NaN` / `Infinity`.
- **Alasan:** Perhitungan koordinat sentuh (`pageX / width`) dapat menghasilkan angka desimal tak terhingga (contoh: `123.333333333333333...`). Mengirim angka ini ke jembatan JNI (Java Native Interface) akan menyebabkan kelebihan muatan (*Buffer Overload*) di ExoPlayer atau Yoga Layout Engine, memicu *Force Close*.
- **Solusi Baku:** 
  ```javascript
  // Salah ❌
  player.currentTime = time;
  
  // Benar ✅
  if (time !== null && isFinite(time)) {
    const safeTime = Number(time.toFixed(3)); // Batasi 3 desimal
    player.currentTime = safeTime;
  }
  ```

## 3. The React State Anti-Pattern (Concurrency Crash)
- **Aturan:** JANGAN PERNAH melakukan mutasi atau memanggil fungsi eksternal Native Module secara sinkron di dalam fungsi pengubah State (*State Updater*).
- **Alasan:** *State Updater* (seperti `setPreviewTime(prev => ...)`) berjalan di tengah *Render Phase* React. Melakukan efek samping (seperti menyetel `player.currentTime = prev`) di dalam fase ini melanggar arsitektur *Concurrent React* dan menyebabkan aplikasi membeku hingga OS Android menembak mati prosesnya.
- **Solusi Baku:** Gunakan `useRef` untuk menyimpan nilai mutasi, dan panggil pembaruan native di luar blok *State Updater* atau melalui `useEffect`.

## 4. Touch Event Hijacking & `stopPropagation`
- **Aturan:** JANGAN menggunakan `e.stopPropagation()` pada React Native `Pressable` atau `View` *Touch Events* secara sembarangan, terutama di versi React Native modern.
- **Alasan:** Pada beberapa konteks komponen, memanggil `stopPropagation` akan melempar `TypeError` atau `ReferenceError` di OS Android. Jika komponen anak (seperti `Slider`) tidak bisa ditekan karena terhalang `Pressable` transparan di atasnya, **jangan gunakan stopPropagation**.
- **Solusi Baku:** Perbaiki hierarki `zIndex` di *StyleSheet* agar komponen kontrol sejajar (*sibling*) dengan lapisan interaksi, lalu posisikan kontrol di atas lapisan interaksi (`zIndex` lebih tinggi).

## 5. Hermes Engine vs `toLocaleString`
- **Aturan:** Hindari penggunaan opsi `timeZone` pada `toLocaleString()` jika menargetkan OS Android rendah.
- **Alasan:** Engine Javascript Hermes di beberapa Android bawaan pabrik memiliki pustaka ICU (International Components for Unicode) yang tidak lengkap. Meminta `timeZone: 'Asia/Jakarta'` dapat mereturn string kosong atau menyebabkan `Invalid Date` saat di-parse ulang yang berujung ke layar menampilkan `NaN`.
- **Solusi Baku:** Gunakan hitung-hitungan *Epoch Milliseconds Offset* absolut:
  ```javascript
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (7 * 3600000)); // +7 Jam
  ```
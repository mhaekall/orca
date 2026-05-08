# Protokol EAS OTA Update (Hotfix) via Termux

Dokumen ini berisi panduan dan perintah wajib bagi AI Agent di sesi mendatang saat diminta untuk melakukan **Over-The-Air (OTA) Update** atau **Hotfix** pada proyek React Native/Expo ini melalui lingkungan Termux (Android).

## Masalah Lingkungan (Termux Context)
Di lingkungan Termux ARM64:
1. Kompilator **Hermes Bytecode** (`hermesc`) tidak didukung secara native. Jika `eas update` dijalankan secara standar, ia akan mencoba mem-build bytecode dan gagal (`Unsupported host platform for Hermes compiler: android`).
2. Proses kalkulasi **Project Fingerprint** bawaan `eas-cli` sering kali gagal atau *hang*.
3. Jika Agent membuat file baru atau memodifikasi file tanpa melakukan `git add` (karena instruksi pelarangan Git), `eas-cli` akan mengabaikan perubahan tersebut karena fitur pelacakan VCS aktif secara default.

## Solusi & Perintah Wajib (The Golden Command)

Untuk melakukan publikasi OTA Update yang 100% dijamin berhasil di lingkungan ini, Agent **WAJIB** mengeksekusi dua perintah ini secara berurutan dalam satu baris (chaining):

```bash
cd apps/mobile && npx expo export --platform android --no-bytecode && EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli update --branch preview --message "Pesan update Anda di sini" --skip-bundler --platform android --non-interactive
```

### Penjelasan Parameter (DO NOT DEVIATE):
1. `npx expo export --platform android --no-bytecode`: 
   - Memaksa Expo untuk membundel Javascript murni secara manual tanpa mencoba mengkompilasi *Hermes Bytecode* yang tidak kompatibel di Termux.
   - Hasilnya akan disimpan di folder `dist/`.
2. `EAS_NO_VCS=1`: 
   - Memaksa EAS untuk mengunggah **semua** file di folder kerja saat ini ke Cloud, terlepas dari apakah file tersebut sudah di-track oleh Git atau belum (Sangat penting jika Agent baru saja membuat komponen baru).
3. `EAS_SKIP_AUTO_FINGERPRINT=1`: 
   - Melewati proses kalkulasi sidik jari proyek yang bermasalah di Termux.
4. `--skip-bundler`: 
   - Menginstruksikan EAS untuk tidak mencoba melakukan *bundling* sendiri (karena pasti akan *crash* mencari `hermesc`), melainkan langsung mengambil hasil dari folder `dist/` yang sudah kita buat di langkah pertama.
5. `--branch preview`: 
   - Menargetkan pembaruan ini ke aplikasi dengan profil `preview` yang sudah diinstal di HP *user*.
6. `--non-interactive`: 
   - Wajib digunakan oleh AI Agent agar terminal tidak *nyangkut* menunggu input interaktif (seperti konfirmasi Y/N).

## Kapan Boleh Menggunakan OTA Update?
- ✅ Memperbaiki logika Javascript, React Hooks, atau Bug UI.
- ✅ Mengubah warna, teks, gaya (StyleSheet), atau tata letak (Layout).
- ✅ Menambah/mengubah file `.ts`, `.tsx`, `.js`.

## Kapan OTA Update DILARANG (Wajib Rebuild APK)?
- ❌ Menginstal *Native Module* baru (library yang mengandung kode Java/Kotlin/C++/Swift) seperti `react-native-video`, `expo-camera`, dll.
- ❌ Mengubah App Icon, Splash Screen, `versionCode`, atau `targetSdkVersion` di `app.json`.
- ❌ Mengubah pengaturan fundamental Expo SDK.

Jika terjadi hal di atas, gunakan perintah *Rebuild APK*:
```bash
cd apps/mobile && EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli build -p android --profile preview --non-interactive
```
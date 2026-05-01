# 📱 Strategi Migrasi Expo & Fondasi Sosial (Orca)

Dokumen ini memuat urutan eksekusi (Layer 1-5) untuk memigrasikan aplikasi web Next.js ke React Native (Expo) di dalam arsitektur Strict Monorepo. Urutan ini **tidak boleh dibalik** karena setiap layer bergantung pada layer di bawahnya.

---

## 🏗️ Fondasi Eksekusi (Layer 1-4)

### Layer 1 — Auth (Prioritas Tertinggi)
Ini yang paling kritis. Di Expo, urutannya:
1. Daftar di **Google Cloud Console** → buat OAuth Client ID tipe **iOS** (Expo pakai scheme iOS meski di Android).
2. Setup `expo-auth-session`.
3. Test di Expo Go dulu sebelum build APK (EAS).
> **Aturan:** Jangan lanjut ke fitur apapun sebelum auth benar-benar stabil. Auth yang rapuh akan merusak semua fitur sosial yang akan datang.

### Layer 2 — Data Layer
Backend tetap sama (FastAPI). Yang perlu dipastikan:
- SWR tetap bisa dipakai di Expo. Setup `SWRConfig` di root layout dengan provider yang benar.
- Semua hooks `use-watch-history`, `use-collection`, `use-fetch-video` — mayoritas bisa dimigrasikan dengan perubahan minimal karena logicnya tidak bergantung pada DOM.

### Layer 3 — Navigation Architecture (Expo Router)
Menentukan skalabilitas jangka panjang untuk fitur sosial. Struktur tab harus dipikirkan dari awal:
```text
(tabs)/
  beranda/
  jadwal/
  explore/        ← penting untuk discovery sosial
  notifikasi/     ← siapkan dari awal meski belum ada konten
  profil/
```
> **Aturan:** Slot notifikasi dan explore harus ada dari hari pertama agar tidak perlu re-architect saat fitur sosial masuk.

### Layer 4 — Video Player
Pakai `expo-video` bukan `react-native-video` (officially supported). 
- Setup sekali dengan benar: landscape lock, gesture controls, auto-next. 
- Ini adalah *core experience* Orca.

---

## 🌐 Layer 5 — Sosial Foundation (Post-Stabilization)

Ini yang membedakan Orca dari sekadar tracker anime. Sebelum implement fitur sosial apapun, putuskan arsitektur **Real-time infrastructure**.
- Jika menggunakan Neon + Drizzle, pikirkan integrasi WebSocket atau SSE (misal: Cloudflare Durable Objects) untuk *feed* yang hidup.
- **Keputusan Krusial:** Putuskan fitur pertama: komentar, following/follower, atau activity feed? Ketiganya butuh schema DB yang berbeda.

### 💡 Filosofi Fitur Sosial Pertama (The Facebook/TikTok Way)
Fitur sosial pertama yang masuk harus yang paling natural dengan konten (anime).
**Bukan chat, bukan story**, tapi:
- *"Teman kamu sedang nonton apa"*
- *"Episode ini dikomentari 47 orang"*

Itu adalah *hook* (pancingan) yang membuat orang membuka app bukan karena mau menonton, tapi karena FOMO (ingin tahu apa yang orang lain lakukan). Mekanisme ini yang membuat aplikasi menjadi *addictive*.

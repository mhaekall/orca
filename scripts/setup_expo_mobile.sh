#!/usr/bin/env bash

set -e

echo "🚀 [Fase 1] Memulai Setup Infrastruktur Expo Mobile (Layer 1-4)..."

# 1. Setup Monorepo Workspace (pnpm)
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "📦 Membuat pnpm-workspace.yaml untuk Monorepo..."
  echo -e "packages:\n  - 'apps/*'\n  - 'services/*'" > pnpm-workspace.yaml
fi

# 2. Inisialisasi Aplikasi Expo (TypeScript Blank Template)
echo "📱 Mengunduh template aplikasi Expo ke apps/mobile..."
# Menggunakan npx create-expo-app dengan template kosong agar struktur router bisa kita bangun bersih
npx create-expo-app@latest apps/mobile -t expo-template-blank-typescript --yes

# Masuk ke direktori mobile
cd apps/mobile

# 3. Instalasi Dependensi Kritis (Layer 1 - Auth & Layer 2 - Data)
echo "🔐 Mengunduh dependensi Auth (Layer 1) & SWR (Layer 2)..."
npx expo install expo-auth-session expo-crypto expo-web-browser expo-secure-store @react-native-async-storage/async-storage
pnpm add better-auth swr

# 4. Instalasi Dependensi Inti (Layer 3 - Navigasi & Layer 4 - Video)
echo "🗺️ Mengunduh dependensi Navigasi (Expo Router) & Video Player (Layer 3 & 4)..."
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-video
pnpm add lucide-react-native

# 5. Instalasi Styling (NativeWind v4 & Tailwind CSS)
echo "🎨 Mengunduh NativeWind (Tailwind untuk Expo)..."
pnpm add nativewind@^4.0.1 tailwindcss@^3.4.1
npx expo install react-native-reanimated

# 6. Konfigurasi Expo Router (mengganti titik masuk utama package.json)
echo "⚙️ Mengkonfigurasi entry point package.json untuk Expo Router..."
# Pastikan entry point mengarah ke expo-router
if grep -q '"main": "App.js"' package.json; then
  sed -i 's/"main": "App.js"/"main": "expo-router\/entry"/g' package.json
fi

echo "✅ ========================================================================= ✅"
echo "✅ SETUP SELESAI! Seluruh package berukuran ratusan MB berhasil diunduh. ✅"
echo "✅ ========================================================================= ✅"
echo ""
echo "Tindakan selanjutnya (di sesi Agen baru):"
echo "1. Minta Agen mengonfigurasi NativeWind (tailwind.config.js, babel.config.js, metro.config.js)."
echo "2. Minta Agen membangun struktur file 'app/(tabs)/' (Layer 3) dan root layout '_layout.tsx'."
echo "3. Mulai implementasi Layer 1 (Auth) sesuai EXPO_MIGRATION.md."

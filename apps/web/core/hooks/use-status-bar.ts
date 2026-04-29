// core/hooks/use-status-bar.ts
// Konfigurasi status bar Android/iOS agar transparan & immersive
// Sesuai Apple HIG standard

"use client";

import { useEffect } from "react";
import { isCapacitor } from "@/core/lib/capacitor";

export function useStatusBar() {
  useEffect(() => {
    if (!isCapacitor()) return;

    async function setup() {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");

        // Transparan overlay — konten bisa di bawah status bar
        await StatusBar.setOverlaysWebView({ overlay: true });

        // Teks/icon status bar putih (cocok untuk background gelap Orca)
        await StatusBar.setStyle({ style: Style.Dark });

        // Background transparan
        await StatusBar.setBackgroundColor({ color: "#00000000" });
      } catch (e) {
        console.warn("[StatusBar] Plugin tidak tersedia:", e);
      }
    }

    setup();
  }, []);
}
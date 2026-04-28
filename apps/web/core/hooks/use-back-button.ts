// core/hooks/use-back-button.ts
// Handle hardware back button Android di Capacitor
// Tanpa ini, tombol back fisik langsung close app alih-alih navigate back

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isCapacitor } from "@/core/lib/capacitor";

/**
 * Daftarkan di RootLayout atau Navigation component.
 * Logika:
 * - Kalau ada history (bisa back) → router.back()
 * - Kalau sudah di root (/) → minimize app, JANGAN close
 */
export function useHardwareBackButton() {
  const router = useRouter();

  useEffect(() => {
    if (!isCapacitor()) return;

    let App: any = null;
    let listenerHandle: any = null;

    async function setup() {
      try {
        // Lazy import supaya tidak error di web build
        const { App: CapApp } = await import("@capacitor/app");
        App = CapApp;

        listenerHandle = await App.addListener("backButton", async ({ canGoBack }: { canGoBack: boolean }) => {
          if (canGoBack) {
            router.back();
          } else {
            // Sudah di halaman root — minimize app, jangan exit
            await App.minimizeApp();
          }
        });
      } catch (e) {
        console.warn("[BackButton] Capacitor App plugin tidak tersedia:", e);
      }
    }

    setup();

    return () => {
      listenerHandle?.remove?.();
    };
  }, [router]);
}
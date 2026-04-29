// core/hooks/use-deep-link.ts
// Handle deep linking / Universal Links di Capacitor
// Contoh: https://orcanime.pages.dev/anime/11061
// → Buka langsung halaman /anime/11061 di dalam app

"use client";

import { useEffect } from "react";
import { useAppRouter } from "@/core/lib/router";
import { isCapacitor } from "@/core/lib/capacitor";

const APP_DOMAIN = "orcanime.pages.dev";

function urlToPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Hanya handle URL dari domain kita sendiri
    if (parsed.hostname !== APP_DOMAIN) return null;
    // Return pathname + search, contoh: /anime/11061
    return parsed.pathname + parsed.search;
  } catch {
    return null;
  }
}

/**
 * Daftarkan di RootLayout.
 * Listen ke appUrlOpen event dari Capacitor,
 * lalu navigate ke route yang sesuai di dalam app.
 */
export function useDeepLink() {
  const router = useAppRouter();

  useEffect(() => {
    if (!isCapacitor()) return;

    let listenerHandle: any = null;

    async function setup() {
      try {
        const { App } = await import("@capacitor/app");

        // Handle deep link saat app sudah terbuka
        listenerHandle = await App.addListener("appUrlOpen", ({ url }: { url: string }) => {
          const path = urlToPath(url);
          if (path) {
            router.push(path);
          }
        });

        // Handle deep link saat app baru dibuka dari killed state
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          const path = urlToPath(launchUrl.url);
          if (path && path !== "/") {
            // Sedikit delay supaya router sudah siap
            setTimeout(() => router.push(path), 300);
          }
        }
      } catch (e) {
        console.warn("[DeepLink] Capacitor App plugin tidak tersedia:", e);
      }
    }

    setup();

    return () => {
      listenerHandle?.remove?.();
    };
  }, [router]);
}
// core/hooks/use-screen-orientation.ts
// Otomatis rotate ke landscape saat fullscreen video,
// dan kembali ke portrait saat keluar fullscreen.
// Pakai @capacitor/screen-orientation kalau tersedia,
// fallback ke Web Screen Orientation API.

"use client";

import { isCapacitor } from "@/core/lib/capacitor";

export async function lockLandscape() {
  if (isCapacitor()) {
    try {
      const { ScreenOrientation } = await import("@capacitor/screen-orientation");
      await ScreenOrientation.lock({ orientation: "landscape" });
      return;
    } catch (e) {
      // Fallback ke Web API
    }
  }

  // Web Screen Orientation API (Chromium-based WebView support ini)
  try {
    if (screen.orientation && (screen.orientation as any).lock) {
      await (screen.orientation as any).lock("landscape");
    }
  } catch (e) {}
}

export async function unlockOrientation() {
  if (isCapacitor()) {
    try {
      const { ScreenOrientation } = await import("@capacitor/screen-orientation");
      await ScreenOrientation.unlock();
      return;
    } catch (e) {
      // Fallback ke Web API
    }
  }

  try {
    if (screen.orientation?.unlock) {
      screen.orientation.unlock();
    }
  } catch (e) {}
}

export async function lockPortrait() {
  if (isCapacitor()) {
    try {
      const { ScreenOrientation } = await import("@capacitor/screen-orientation");
      await ScreenOrientation.lock({ orientation: "portrait" });
      return;
    } catch (e) {}
  }

  try {
    if (screen.orientation && (screen.orientation as any).lock) {
      await (screen.orientation as any).lock("portrait");
    }
  } catch (e) {}
}
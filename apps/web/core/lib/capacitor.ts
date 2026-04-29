// core/lib/capacitor.ts — Capacitor environment detection & helpers

/**
 * Apakah app ini jalan di dalam Capacitor (Android/iOS native)?
 * Safe dipanggil di server (return false) maupun client.
 */
export const isCapacitor = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:" ||
    !!(window as any).Capacitor?.isNativePlatform?.()
  );
};

/**
 * Base URL untuk hit API yang butuh absolute URL di Capacitor.
 * Di web biasa, return '' supaya fetch tetap pakai relative path.
 */
export const getAppBaseUrl = (): string => {
  if (typeof window === "undefined") {
    // Server-side
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
  }

  if (isCapacitor()) {
    // Di Capacitor tidak ada domain, harus absolute ke server kita
    return process.env.NEXT_PUBLIC_APP_URL ?? "https://orcanime.pages.dev";
  }

  // Browser biasa — pakai origin biar works di semua env (localhost, staging, prod)
  return window.location.origin;
};

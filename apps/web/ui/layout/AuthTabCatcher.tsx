"use client";

import { useEffect } from "react";

export function AuthTabCatcher() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Jika halaman ini dibuka di dalam Custom Tab Capacitor untuk proses login,
      // tangkap dan paksa redirect ke mobile-callback API untuk menyelesaikan flow
      // jika Better Auth secara tidak sengaja melempar user ke halaman utama.
      if (localStorage.getItem("orca_auth_tab") === "true") {
        window.location.href = "/api/mobile-callback";
      }
    }
  }, []);

  return null;
}
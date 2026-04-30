"use client";

export const runtime = "edge";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/core/lib/auth-client";

function MobileLoginContent() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider") as "google" | "github" | "discord" || "google";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = window.location.origin; // Will be https://orcanime.pages.dev inside the custom tab

    // Set flag that we are opening a custom tab for auth.
    // AuthTabCatcher will use this to intercept fallback redirects.
    localStorage.setItem("orca_auth_tab", "true");

    // Gunakan SDK resmi Better Auth agar state callback dikelola dengan benar via session/cookies
    authClient.signIn.social({
      provider: provider,
      callbackURL: `${baseUrl}/api/mobile-callback`
    }).catch(err => {
      console.error("Auth SDK redirect failed:", err);
      setError(err.message || String(err));
    });
  }, [provider]);

  return (
    <>
      {error ? (
        <>
          <p className="text-red-500 font-bold mb-2">Error</p>
          <p className="text-sm text-white/60">{error}</p>
        </>
      ) : (
        <>
          <div className="w-8 h-8 border-4 border-[#0A84FF] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-white/60 font-medium">Menghubungkan ke {provider}...</p>
        </>
      )}
    </>
  );
}

export default function MobileLogin() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>}>
        <MobileLoginContent />
      </Suspense>
    </div>
  );
}
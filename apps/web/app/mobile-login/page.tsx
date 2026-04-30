"use client";

import { useEffect, useState, Suspense } from "react";
import { authClient } from "@/core/lib/auth-client";
import { useSearchParams } from "next/navigation";

function MobileLoginContent() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider") as "google" | "github" | "discord" || "google";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = window.location.origin;
    authClient.signIn.social({
      provider,
      callbackURL: `${baseUrl}/api/mobile-callback`
    }).catch(e => setError(e.message || String(e)));
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
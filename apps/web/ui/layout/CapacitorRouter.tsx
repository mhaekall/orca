// ui/layout/CapacitorRouter.tsx
"use client";

import React, { useState, useEffect } from "react";
import { isCapacitor } from "@/core/lib/capacitor";

// Dynamic imports to avoid loading everything on first paint
import dynamicNext from "next/dynamic";

const HomeView = dynamicNext(() => import("@/features/home/HomeView"));
const ExploreView = dynamicNext(() => import("@/features/explore/ExploreView"));
const ScheduleView = dynamicNext(() => import("@/features/schedule/ScheduleView").then(m => m.ScheduleView));
const CollectionView = dynamicNext(() => import("@/features/collection/CollectionView"));
const ProfileView = dynamicNext(() => import("@/features/profile/ProfileView"));
const NotificationsPage = dynamicNext(() => import("@/app/notifications/page"));

const DetailClientWrapper = dynamicNext(() => import("./DetailClientWrapper"), {
  loading: () => <div className="min-h-screen bg-black"></div>
});

const WatchClientWrapper = dynamicNext(() => import("./WatchClientWrapper"), {
  loading: () => <div className="min-h-screen bg-black"></div>
});

export function CapacitorRouter({ children }: { children: React.ReactNode }) {
  const [currentUrl, setCurrentUrl] = useState("/");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isCapacitor()) {
      // Listen for Deep Links (orca://app/...)
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appUrlOpen', async (data) => {
          if (data.url.includes('auth-callback') || data.url.includes('token=')) {
            const urlObj = new URL(data.url);
            const token = urlObj.searchParams.get('token');
            if (token) {
              // Simpan session token asli ke Local Storage
              localStorage.setItem('better_auth_session', token);
              
              // Tutup in-app browser
              const { Browser } = await import('@capacitor/browser');
              await Browser.close();
              
              // Force reload agar authClient membaca token baru
              window.location.reload();
            }
          }
        });
      }).catch(console.error);

      setCurrentUrl(window.location.pathname + window.location.search);

      const handlePopState = () => {
        setCurrentUrl(window.location.pathname + window.location.search);
      };

      const handlePushState = () => {
        setCurrentUrl(window.location.pathname + window.location.search);
      };

      window.addEventListener("popstate", handlePopState);
      window.addEventListener("cap:pushstate", handlePushState);

      // Global click interceptor for all <Link> and <a> tags
      const handleGlobalClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest("a");
        if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
          e.preventDefault();
          e.stopPropagation(); // Prevent Next.js from seeing this click
          const path = anchor.href.replace(window.location.origin, "");
          window.history.pushState(null, "", path);
          window.dispatchEvent(new Event("cap:pushstate"));
        }
      };

      window.addEventListener("click", handleGlobalClick, true);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("cap:pushstate", handlePushState);
        window.removeEventListener("click", handleGlobalClick, true);
      };
    }
  }, []);

  if (!mounted || !isCapacitor()) {
    // Di Web (Vercel/Cloudflare) render Next.js router bawaan (children)
    return <>{children}</>;
  }

  // --- CAPACITOR ROUTING LAYER --- //

  // Parse path & search params
  const path = currentUrl.split("?")[0];
  const search = currentUrl.includes("?") ? "?" + currentUrl.split("?")[1] : "";

  // 1. Home
  if (path === "/") {
    return <HomeView />;
  }

  // 2. Schedule
  if (path === "/schedule") {
    return <ScheduleView initialSchedule={{}} />;
  }

  // 3. Explore
  if (path === "/explore") {
    return <ExploreView initialResults={[]} />;
  }

  // 4. Collection
  if (path === "/collection") {
    return <CollectionView />;
  }

  // 5. Notifications
  if (path === "/notifications") {
    return <NotificationsPage />;
  }

  // 6. Profile
  if (path === "/profile") {
    return <ProfileView />;
  }

  // 7. Anime Detail (/anime/:id)
  const animeMatch = path.match(/^\/anime\/(\d+)$/);
  if (animeMatch) {
    const id = animeMatch[1];
    return <DetailClientWrapper id={id} />;
  }

  // 8. Watch (/watch/:id/:episode)
  const watchMatch = path.match(/^\/watch\/(\d+)\/([\d.]+)$/);
  if (watchMatch) {
    const id = watchMatch[1];
    const episode = watchMatch[2];
    // Perlu wrapper untuk fetching data sebelum merender WatchClient yang murni client component
    return <WatchClientWrapper id={id} episode={episode} />;
  }

  // Fallback 404 Capacitor
  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-black mb-2 text-[#ff453a]">404</h1>
      <p className="text-[#8e8e93] text-sm">Halaman {path} tidak ditemukan (Capacitor).</p>
    </div>
  );
}

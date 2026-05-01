"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppRouter } from "@/core/lib/router";
import { IconHome, IconCollection, IconUser, IconBell, IconCalendar } from "@/ui/icons";
import { useMounted } from "@/core/hooks/use-mounted";
import { useKonami } from "@/core/hooks/use-konami";
import { useViewTransition } from "@/core/hooks/use-view-transition";
import { SnakeGame } from "@/ui/games/SnakeGame";
import { useState, useEffect } from "react";
import { authClient } from "@/core/lib/auth-client";
import { useHardwareBackButton } from "@/core/hooks/use-back-button";
import { useStatusBar } from "@/core/hooks/use-status-bar";
import { useDeepLink } from "@/core/hooks/use-deep-link";

const TABS = [
  { id: "/", label: "Beranda", icon: IconHome },
  { id: "/schedule", label: "Jadwal", icon: IconCalendar },
  { id: "/collection", label: "Koleksi", icon: IconCollection },
  { id: "/profile", label: "Profil", icon: IconUser },
];

export function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useAppRouter();
  const navigate = useViewTransition();
  const mounted = useMounted();
  const [snakeActive, setSnakeActive] = useState(false);
  const { data: session, refetch } = authClient.useSession();

  useEffect(() => {
    const handleAuthSuccess = () => {
      if (typeof refetch === 'function') refetch();
    };
    window.addEventListener("cap:auth-success", handleAuthSuccess);
    return () => window.removeEventListener("cap:auth-success", handleAuthSuccess);
  }, [refetch]);

  // Capacitor: hardware back button, status bar, deep linking
  useHardwareBackButton();
  useStatusBar();
  useDeepLink();

  useKonami(() => setSnakeActive(true));

  // Determine if current route is exactly one of the main tabs
  const isMainTab = TABS.some(t => pathname === t.id);

  return (
    <div className="w-full min-h-[100dvh] bg-[#13111a] text-white flex flex-col relative select-none antialiased min-w-0 transition-colors duration-500">
      {/* Main content */}
      <div className="flex-1 w-full min-h-[100dvh] relative flex flex-col min-w-0">
        <main className={`flex-1 w-full min-w-0 ${mounted && isMainTab ? 'pb-[calc(100px+env(safe-area-inset-bottom))]' : 'pb-[env(safe-area-inset-bottom)]'}`}>
          {children}
        </main>

        {/* Global Bottom Nav - Render when mounted and on a main tab */}
        {mounted && isMainTab && (
          <div className="fixed bottom-0 left-0 right-0 z-[90] pointer-events-auto bg-[#13111a] border-t border-white/[0.02] pb-safe" aria-hidden="true" title="Bottom Navigation Area">
            <nav className="relative w-full max-w-md mx-auto z-[100]" aria-hidden="false">
              <div className="flex justify-around items-center px-2 h-[48px]">
                {TABS.map((t) => {
                  const active = pathname === t.id || (t.id !== "/" && pathname.startsWith(t.id));
                  const Icon = t.icon;
                  
                  const isProfileTab = t.id === "/profile";
                  const isLoggedIn = !!session?.user;
                  const avatarUrl = session?.user?.image || (isLoggedIn ? `https://api.dicebear.com/7.x/notionists/svg?seed=${session?.user?.id || 'orca'}&backgroundColor=0a84ff,bf5af2` : null);

                  return (
                    <Link key={t.id} href={t.id} prefetch={true} className="flex flex-col items-center justify-center h-full aspect-square group focus:outline-none">
                      <div className={`transition-all duration-200 ${active ? "scale-105" : "scale-100 opacity-60 group-hover:opacity-100"}`}>
                        {isProfileTab && avatarUrl ? (
                          <img src={avatarUrl} alt="Profile" className={`w-[20px] h-[20px] rounded-full object-cover border-2 ${active ? 'border-white' : 'border-transparent'}`} />
                        ) : (
                          <Icon className="w-[20px] h-[20px] text-white" filled={active} />
                        )}
                      </div>
                      <span className={`text-[9px] mt-1 transition-colors ${active ? "text-white font-bold" : "text-white/40 font-medium group-hover:text-white/70"}`}>{t.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        )}
      </div>

      {snakeActive && <SnakeGame onClose={() => setSnakeActive(false)} />}
    </div>
  );
}

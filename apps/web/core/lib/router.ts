// core/lib/router.ts
"use client";

import { useRouter as useNextRouter, usePathname, useSearchParams } from "next/navigation";
import { isCapacitor } from "./capacitor";

/**
 * Drop-in replacement for Next.js useRouter.
 * On web, it uses standard next/navigation.
 * On Capacitor, it uses history.pushState and fires a custom event
 * so the CapacitorRouter wrapper can react.
 */
export function useAppRouter() {
  const nextRouter = useNextRouter();

  if (typeof window === "undefined" || !isCapacitor()) {
    return nextRouter;
  }

  // Capacitor custom router implementation
  return {
    ...nextRouter,
    push: (href: string) => {
      window.history.pushState(null, "", href);
      window.dispatchEvent(new Event("cap:pushstate"));
    },
    replace: (href: string) => {
      window.history.replaceState(null, "", href);
      window.dispatchEvent(new Event("cap:pushstate"));
    },
    back: () => {
      window.history.back();
    },
    refresh: () => {
      window.dispatchEvent(new Event("cap:pushstate"));
    }
  };
}

/**
 * Drop-in for usePathname in Capacitor
 */
export function useAppPathname() {
  const nextPathname = usePathname();
  if (typeof window !== "undefined" && isCapacitor()) {
    return window.location.pathname;
  }
  return nextPathname;
}

/**
 * Drop-in for useSearchParams in Capacitor
 */
export function useAppSearchParams() {
  const nextSearchParams = useSearchParams();
  if (typeof window !== "undefined" && isCapacitor()) {
    return new URLSearchParams(window.location.search);
  }
  return nextSearchParams;
}

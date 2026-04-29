// ui/primitives/AppLink.tsx
"use client";

import Link from "next/link";
import { useAppRouter } from "@/core/lib/router";
import { isCapacitor } from "@/core/lib/capacitor";

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  prefetch?: boolean;
}

/**
 * Drop-in replacement for next/link.
 * On Capacitor, it intercepts the click and uses CapacitorRouter history manipulation
 * to prevent 404 hard reloads on dynamic routes.
 */
export function AppLink({ href, children, onClick, ...props }: Props) {
  const router = useAppRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isCapacitor()) {
      e.preventDefault(); // Mencegah reload HTML
      if (onClick) onClick(e);
      router.push(href);
    } else {
      if (onClick) onClick(e);
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}

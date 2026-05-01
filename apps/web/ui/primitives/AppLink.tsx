// ui/primitives/AppLink.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  prefetch?: boolean;
}

/**
 * Drop-in replacement for next/link.
 */
export function AppLink({ href, children, onClick, ...props }: Props) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
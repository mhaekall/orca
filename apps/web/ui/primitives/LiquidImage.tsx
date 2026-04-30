"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { OrcaLogo } from "@/ui/icons/OrcaLogo";

interface LiquidImageProps extends Omit<ImageProps, "src" | "fill" | "color"> {
  src: string;
  fallbackSrc?: string;
  color?: string | null;
}

export function LiquidImage({ src, fallbackSrc, color, className = "", alt, ...props }: LiquidImageProps) {
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const finalSrc = error && fallbackSrc ? fallbackSrc : src;

  return (
    <div 
      className={`relative overflow-hidden flex items-center justify-center ${className} ${!color ? "bg-[#1f1c29]" : ""}`}
      style={color ? { backgroundColor: `${color}40` } : undefined}
    >
      {/* Skeleton / Liquid color base while loading */}
      {isLoading && !color && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 animate-pulse z-0 flex items-center justify-center">
           <OrcaLogo className="w-10 h-10 text-white/5" animated={false} />
        </div>
      )}
      {isLoading && color && (
        <div 
          className="absolute inset-0 animate-pulse z-0 flex items-center justify-center" 
          style={{ backgroundImage: `linear-gradient(to bottom right, ${color}80, ${color}30)` }} 
        >
           <OrcaLogo className="w-10 h-10 text-white/20" animated={false} />
        </div>
      )}
      <Image
        src={finalSrc}
        alt={alt || ""}
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
        fill
        className={`
          object-cover transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-10
          ${isLoading 
            ? "scale-125 blur-2xl saturate-200 contrast-[1.2]" // Liquid State (removed opacity-0 to show progressive load)
            : "scale-100 blur-0 saturate-100 contrast-100" // Settled State
          }
        `}
        {...props}
      />
    </div>
  );
}

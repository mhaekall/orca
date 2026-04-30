import { Skeleton } from "@/ui/primitives/Skeleton";
import { OrcaLogo } from "@/ui/icons/OrcaLogo";

export function AnimeCardSkeleton({ variant = "vertical" }: { variant?: "vertical" | "horizontal" }) {
  const aspectClass = variant === "horizontal" ? "aspect-video" : "aspect-[2/3]";

  return (
    <div className="flex flex-col h-full w-full animate-pulse">
      <div className={`w-full ${aspectClass} rounded-2xl mb-2 border border-white/5 bg-[#151E32] flex items-center justify-center overflow-hidden relative`}>
         <div className="absolute inset-0 bg-white/5" />
         <OrcaLogo className="w-10 h-10 text-white/10 relative z-10" animated={false} />
      </div>
      <div className="h-3.5 bg-white/10 rounded w-3/4 mb-1.5" />
      <div className="h-3.5 bg-white/10 rounded w-1/2 mb-2" />
      <div className="flex gap-2">
        <div className="h-2.5 bg-white/10 rounded w-8" />
        <div className="h-2.5 bg-white/10 rounded w-12" />
      </div>
    </div>
  );
}

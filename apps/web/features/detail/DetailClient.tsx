// features/detail/DetailClient.tsx — Anime detail page client component
"use client";

import { useState, memo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconBack, IconPlay, IconBookmark, IconShare, IconStar } from "@/ui/icons";
import { useSettings, useToast } from "@/core/stores/app-store";
import { useCollection } from "@/core/hooks/use-collection";
import { authClient } from "@/core/lib/auth-client";
import { EpisodeList } from "./EpisodeList";
import { AnimeCard } from "@/ui/cards/AnimeCard";
import { LiquidImage } from "@/ui/primitives/LiquidImage";

const ShareArrowIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m15 5 6 6-6 6"/><path d="M21 11H9C4.029 11 2 14 2 18"/></svg>
);

const EyeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);

function formatSynopsis(text: string) {
  if (!text) return "Sinopsis belum tersedia.";
  
  // 1. Hapus tag HTML
  let clean = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " ").trim();
  
  // 2. Potong sampai sebelum teks sumber (Sumber: / Source:)
  const sourceIndex = clean.search(/\(?\[?(Sumber|Source|Written by)\s*:/i);
  if (sourceIndex !== -1) {
    clean = clean.substring(0, sourceIndex).trim();
  }
  
  // 3. Restruktur teks: hapus enter dan spasi berlebih agar lebih padat dan to-the-point
  clean = clean.replace(/\n{3,}/g, '\n\n');
  clean = clean.replace(/ {2,}/g, ' ');

  return clean;
}

function formatCountdown(seconds: number) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}H ${h}J`;
  if (h > 0) return `${h}J ${m}M`;
  return `${m}M`;
}

import useSWR from "swr";
import { API } from "@/core/lib/api";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DetailClient({ detail, id }: { detail: any; id: string }) {
  const router = useRouter();
  const accent = "#0A84FF";
  const { data: session } = authClient.useSession();
  const { items, toggle } = useCollection(session?.user?.id);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: stats } = useSWR(
    `${API}/api/v2/social/anime/${id}/stats`,
    fetcher
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const d = detail;
  const saved = mounted ? !!items.find((w: any) => String(w.id) === id) : false;
  const desc = formatSynopsis(d.synopsis || "");
  const eps = d.episodes || [];
  const recs = d.recommendations || [];
  const realViews = d.views || 0;

  // Determine airing day
  let scheduleDay = d.airSchedule;
  if (!scheduleDay && d.nextAiringEpisode?.airingAt) {
    const dt = new Date(d.nextAiringEpisode.airingAt * 1000);
    const daysArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    scheduleDay = daysArr[dt.getDay()];
  }

  const firstEp = eps.length > 0 && eps[0].url ? eps[0].url.replace(/\/$/, "").split("/").pop() : null;

  const displayEps = d.latestEpisode || d.totalEpisodes || eps.length || '?';

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: d.title,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast("Link disalin!", "success");
    }
  };

  return (
    <main className="min-h-screen bg-black pb-24 text-white overflow-y-auto no-scrollbar">
      {/* Hero */}
      <div className="w-full h-[600px] md:h-[700px] relative bg-black anim-fade">
        {d.poster && (
          <div className="absolute top-0 w-full h-[70%] md:h-[80%] opacity-80">
            <LiquidImage 
              src={d.poster} 
              alt={d.title || "Poster"} 
              color={d.color || accent}
              className="w-full h-full object-[center_85%]" 
              priority 
              sizes="100vw"
            />
          </div>
        )}
        
        {/* Accent Glow */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 100%, ${accent}, transparent 70%)` }} />

        {/* Top shading for header buttons */}
        <div className="absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-black/60 to-transparent" />
        
        {/* Main gradient (Bottom to Top) */}
        <div className="absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black via-black/90 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[150px] bg-gradient-to-t from-black to-transparent" />
        
        <button onClick={() => router.back()} className="absolute top-10 left-5 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white border border-white/20 active:scale-90 z-20"><IconBack /></button>
        <button onClick={handleShare} className="absolute top-10 right-5 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white border border-white/20 active:scale-90 z-20"><ShareArrowIcon size={18} /></button>
      </div>

      <div className="px-5 md:px-8 -mt-[300px] md:-mt-[350px] relative z-10 max-w-4xl mx-auto">
        {/* Title row */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-8 anim-up">
          <div className="flex-1 min-w-0">
            {d.status === "FINISHED" ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#30D158]/20 text-[#30D158] rounded-full text-[11px] font-bold mb-3 border border-[#30D158]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] shadow-[0_0_8px_#30D158]" />
                Anime Tamat
              </div>
            ) : scheduleDay ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFD60A]/20 text-white rounded-full text-[11px] font-bold mb-3 border border-[#FFD60A]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD60A] shadow-[0_0_8px_#FFD60A]" />
                Update setiap {scheduleDay}
              </div>
            ) : null}
            <h1 className="text-2xl md:text-4xl font-black text-white leading-[1.1] mb-1">{d.title}</h1>
            {d.nativeTitle && <h2 className="text-sm text-[#8e8e93] mb-3">{d.nativeTitle}</h2>}

            <div className="flex items-center gap-2.5 text-[13px] font-medium flex-wrap mb-6 text-[#e5e5ea]">
              {[
                realViews > 0 ? <span key="views" className="flex items-center gap-1.5 font-bold"><EyeIcon size={14} /> {Intl.NumberFormat('id-ID', { notation: "compact", maximumFractionDigits: 1 }).format(realViews)}</span> : null,
                d.score ? <span key="score" className="text-[#30D158] flex items-center gap-1 font-bold"><IconStar /> {(d.score / 10).toFixed(1)}</span> : null,
                d.season && d.seasonYear ? <span key="season" className="capitalize">{d.season.toLowerCase()} {d.seasonYear}</span> : null,
                d.studios && d.studios.length > 0 ? <span key="studio">{d.studios[0]}</span> : null,
              ].filter(Boolean).map((item, index, arr) => (
                <div key={index} className="flex items-center gap-2.5">
                  {item}
                  <span className="text-[#48484a] text-[10px]">●</span>
                </div>
              ))}
              {d.genres && d.genres.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {d.genres.slice(0, 3).map((g: string) => (
                    <Link key={g} href={`/explore?genre=${encodeURIComponent(g)}`} className="px-2.5 py-0.5 bg-white/10 hover:bg-[#0A84FF] hover:border-[#0A84FF] border border-white/10 rounded-full text-[11px] font-bold text-white transition-colors">
                      {g}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-row items-center gap-2.5 w-full max-w-[460px]">
              {firstEp ? (
                <Link href={`/watch/${id}/${firstEp}`} className="flex-1 py-3.5 rounded-full text-white font-bold flex items-center justify-center gap-2 text-[14px] active:scale-95 shadow-lg shadow-[#0A84FF]/20" style={{ backgroundColor: accent }}>
                  <IconPlay className="w-5 h-5" /> Mulai Tonton
                </Link>
              ) : (
                <button disabled className="flex-1 py-3.5 rounded-full text-[#8e8e93] bg-[#1c1c1e] font-bold text-[14px] cursor-not-allowed flex items-center justify-center">Belum Tersedia</button>
              )}
              <button onClick={() => { const added = toggle({ id, title: d.title, img: d.poster, totalEps: d.latestEpisode || d.totalEpisodes || eps.length }); toast(added ? "Ditambahkan ke Koleksi" : "Dihapus dari Koleksi", added ? "success" : "error"); }}
                className={`flex-1 py-3.5 px-2 rounded-full flex items-center justify-center gap-1.5 font-bold text-[14px] border active:scale-95 transition-all ${saved ? "bg-white/15 border-white/30 text-white" : "bg-[#1c1c1e] border-white/5 text-[#e5e5ea] hover:bg-white/5"}`}>
                <IconBookmark filled={saved} className="w-4 h-4 shrink-0" /> <span className="truncate">Tambah ke Koleksi</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8 anim-up" style={{ animationDelay: "80ms" }}>
          {/* Synopsis */}
          <div>
            <h3 className="text-white font-bold text-base mb-2">Sinopsis</h3>
            <p className={`text-[#e5e5ea] text-[14px] leading-relaxed whitespace-pre-line transition-all duration-300 ${isExpanded ? "" : "line-clamp-3"}`}>
              {desc || "Sinopsis tidak tersedia."}
            </p>
            {desc && desc.length > 150 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[#0A84FF] text-[13px] font-bold mt-2 hover:underline focus:outline-none"
              >
                {isExpanded ? "Sembunyikan" : "Selengkapnya"}
              </button>
            )}
          </div>

          {/* Episodes List */}
          <div>
            <h3 className="text-white font-bold text-base mb-4">Episode</h3>
            <EpisodeList episodes={eps} animeId={id} cover={d.poster} />
          </div>

          {/* Recommendations */}
          {recs.length > 0 && (
            <div className="mt-8">
              <h3 className="text-white font-bold text-base mb-4">Rekomendasi</h3>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 snap-x">
                {recs.map((r: any, i: number) => (
                  <div key={i} className="min-w-[120px] snap-start">
                    <AnimeCard id={String(r.id)} title={r.title} img={r.cover || r.poster || r.image} totalEps={r.latestEpisode || r.totalEpisodes || r.episodes} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
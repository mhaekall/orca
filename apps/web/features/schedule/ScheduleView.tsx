"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { useMounted } from "@/core/hooks/use-mounted";
import useSWR from "swr";
import { API } from "@/core/lib/api";
import { LiquidImage } from "@/ui/primitives/LiquidImage";
import { IconPlay } from "@/ui/icons";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Props {
  initialSchedule: Record<string, any[]>;
}

function ScheduleRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 md:py-4 border-b border-white/5">
      <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-[14px] bg-white/5 animate-pulse" />
      <div className="flex-1">
        <div className="h-4 bg-white/10 rounded w-2/3 mb-2.5 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-3 bg-white/10 rounded w-12 animate-pulse" />
          <div className="h-3 bg-white/10 rounded w-16 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const ScheduleRow = memo(function ScheduleRow({ item }: { item: any }) {
  return (
    <Link href={`/anime/${item.id}`} className="flex items-center gap-3 md:gap-4 py-3 md:py-4 border-b border-white/5 group active:opacity-50 transition-opacity">
      <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-[14px] overflow-hidden bg-[#151E32] border border-white/10">
        <LiquidImage 
          src={item.img || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg"} 
          alt={item.title} 
          color={item.color} 
          className="w-full h-full"
          sizes="80px"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <IconPlay className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <h3 className="text-[15px] md:text-base font-bold text-[#f2f2f7] group-hover:text-white leading-tight mb-1.5 truncate">{item.title}</h3>
        <div className="flex items-center gap-2 text-xs md:text-[13px] text-[#8e8e93] font-medium">
          {item.airingTime && (
            <>
              <span className="text-[#32D74B] bg-[#32D74B]/10 px-1.5 py-0.5 rounded tracking-wider font-mono font-black">{item.airingTime}</span>
              <span className="text-[#48484a]">●</span>
            </>
          )}
          <span>Ep. {item.latestEpisode || '?'}</span>
          {item.score && (
            <>
              <span className="text-[#48484a]">●</span>
              <span className="text-[#FFD60A] font-bold">★ {(item.score / 10).toFixed(1)}</span>
            </>
          )}
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/40 group-hover:text-white transition-colors"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </Link>
  );
});

export function ScheduleView({ initialSchedule }: Props) {
  const mounted = useMounted();
  const [activeDay, setActiveDay] = useState<string>("Senin");

  // Swipe handling state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const { data: swrData } = useSWR(`${API}/api/v2/schedule?v=2`, fetcher, { 
    fallbackData: { data: initialSchedule },
    revalidateOnFocus: false 
  });

  const schedData = swrData?.data || {};

  // Set default day to today once mounted
  useEffect(() => {
    const todayIndex = new Date().getDay() - 1;
    const daysArr = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    const today = daysArr[todayIndex < 0 ? 6 : todayIndex];
    if (schedData[today]) {
      setActiveDay(today);
    } else {
      setActiveDay(Object.keys(schedData)[0] || "Senin");
    }
  }, [schedData]);

  const days = Object.keys(schedData).filter(k => k !== "TBA");
  if (schedData["TBA"]) days.push("TBA");

  // Swipe Logic
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = days.indexOf(activeDay);
      if (currentIndex === -1) return;

      if (isLeftSwipe && currentIndex < days.length - 1) {
        // Swipe left -> go to next day
        setActiveDay(days[currentIndex + 1]);
      } else if (isRightSwipe && currentIndex > 0) {
        // Swipe right -> go to prev day
        setActiveDay(days[currentIndex - 1]);
      }
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black pb-32 text-white">
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-2xl px-5 md:px-8 pt-[env(safe-area-inset-top)] pb-4 border-b border-white/5">
          <div className="max-w-3xl mx-auto flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                  Jadwal Rilis
                </h1>
                <p className="text-white/40 text-[13px] font-medium mt-1">Cek jadwal tayang episode terbaru minggu ini.</p>
              </div>
            </div>
            <div className="w-full overflow-x-hidden pb-2 -mx-5 px-5 md:mx-0 md:px-0">
              <div className="flex bg-[#151E32] p-0.5 rounded-full border border-white/5 min-w-max">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1 min-w-[48px] md:min-w-[64px] h-[24px] md:h-[28px] rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 md:px-8 pt-2 max-w-3xl mx-auto">
           {Array.from({ length: 10 }).map((_, i) => (
             <ScheduleRowSkeleton key={i} />
           ))}
        </div>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white pb-24">
        <p className="text-white/40">Belum ada jadwal tayang tersedia.</p>
      </div>
    );
  }

  const currentItems = schedData[activeDay] || [];

  return (
    <div className="min-h-screen bg-black pb-32 text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-2xl px-5 md:px-8 pt-[env(safe-area-inset-top)] pb-4 border-b border-white/5">
        <div className="max-w-3xl mx-auto flex flex-col gap-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                Jadwal Rilis
              </h1>
              <p className="text-white/40 text-[13px] font-medium mt-1">Cek jadwal tayang episode terbaru minggu ini.</p>
            </div>
          </div>
          
          {/* Days Filter (Segmented Control) */}
          <div className="w-full overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 md:mx-0 md:px-0">
            <div className="relative flex bg-[#151E32] p-1 rounded-full border border-white/5 min-w-max">
              {/* Active Highlight (Sliding background) */}
              <div 
                className="absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                style={{
                  width: `calc((100% - 8px) / ${days.length})`,
                  transform: `translateX(${days.indexOf(activeDay) * 100}%)`
                }}
              />
              {days.map(day => {
                const isActive = activeDay === day;
                const shortDay = day.substring(0, 3);
                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`relative flex-1 min-w-[60px] md:min-w-[80px] px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors duration-300 z-10 ${
                      isActive ? "text-black" : "text-[#8e8e93] hover:text-white"
                    }`}
                  >
                    <span className="md:hidden">{shortDay}</span>
                    <span className="hidden md:inline">{day}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div 
        className="px-5 md:px-8 pt-2 max-w-3xl mx-auto min-h-[50vh]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <div className="flex flex-col anim-fade" key={activeDay}>
          {currentItems.map((item: any, idx: number) => (
            <ScheduleRow key={`${item.id}-${idx}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

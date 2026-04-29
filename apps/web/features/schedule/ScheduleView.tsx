"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimeCard } from "@/ui/cards/AnimeCard";
import { useMounted } from "@/core/hooks/use-mounted";
import useSWR from "swr";
import { API } from "@/core/lib/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Props {
  initialSchedule: Record<string, any[]>;
}

export function ScheduleView({ initialSchedule }: Props) {
  const mounted = useMounted();
  const [activeDay, setActiveDay] = useState<string>("Senin");
  const scrollRef = useRef<HTMLDivElement>(null);

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

  if (!mounted) return null;

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
        <div className="max-w-7xl mx-auto flex flex-col gap-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0A84FF] shadow-[0_0_8px_#0A84FF]" />
                Jadwal Rilis
              </h1>
              <p className="text-white/40 text-[13px] font-medium mt-1">Cek jadwal tayang episode terbaru minggu ini.</p>
            </div>
          </div>
          
          {/* Days Filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5 md:mx-0 md:px-0">
            {days.map(day => {
              const isActive = activeDay === day;
              return (
                <button
                  key={day}
                  onClick={() => {
                    setActiveDay(day);
                  }}
                  className={`shrink-0 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all ${
                    isActive 
                      ? "bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.2)]" 
                      : "bg-[#1c1c1e] text-[#8e8e93] hover:bg-white/10 hover:text-white border border-white/5"
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-5 md:px-8 pt-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4 anim-fade" key={activeDay}>
          {currentItems.map((item: any, idx: number) => (
            <div key={`${item.id}-${idx}`} className="w-full relative">
              <AnimeCard
                id={String(item.id)}
                title={item.title}
                img={item.img}
                score={item.score}
                views={item.views}
                epId={item.latestEpisode ? String(item.latestEpisode) : undefined}
                totalEps={item.latestEpisode}
                variant="vertical"
              />
              {/* Time Badge */}
              {item.airingTime && (
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-[6px] text-[10px] font-bold text-[#32D74B] border border-white/10 z-10 pointer-events-none">
                  {item.airingTime}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

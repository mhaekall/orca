"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface Props {
  schedule: Record<string, any[]>;
}

export function AiringSchedule({ schedule }: Props) {
  const [activeDay, setActiveDay] = useState<string>(() => {
    const todayIndex = new Date().getDay() - 1;
    const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    const today = days[todayIndex < 0 ? 6 : todayIndex];
    return schedule[today] ? today : Object.keys(schedule)[0] || "Senin";
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = Object.keys(schedule).filter(k => k !== "TBA");
  if (schedule["TBA"]) days.push("TBA");

  if (days.length === 0) return null;

  const currentItems = schedule[activeDay] || [];

  return (
    <section className="mb-12 px-5 md:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0A84FF] shadow-[0_0_8px_#0A84FF]" />
            Jadwal Rilis
          </h2>
          <p className="text-white/40 text-[13px] font-medium mt-1">Cek jadwal tayang episode terbaru minggu ini.</p>
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
                  if (scrollRef.current) scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
                }}
                className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-all ${
                  isActive 
                    ? "bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.2)]" 
                    : "bg-[#1f1c29] text-[#8e8e93] hover:bg-white/10 hover:text-white"
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid of anime for selected day */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar snap-x pb-4"
      >
        {currentItems.map((item, idx) => (
          <Link 
            key={`${item.id}-${idx}`}
            href={`/anime/${item.id}`} 
            className="group shrink-0 w-[140px] md:w-[160px] snap-start flex flex-col focus:outline-none"
          >
            <div className="w-full aspect-[2/3] bg-[#1f1c29] rounded-xl overflow-hidden relative shadow-md mb-2 border border-white/5 group-hover:border-white/20 transition-all">
              {item.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={item.img} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  loading="lazy" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#2a2536]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#13111a]/90 via-transparent to-transparent pointer-events-none" />
              
              {/* Time Badge */}
              {item.airingTime && (
                <div className="absolute top-2 right-2 bg-[#13111a]/60 backdrop-blur-md px-2 py-1 rounded-[6px] text-[10px] font-bold text-[#32D74B] border border-white/10">
                  {item.airingTime}
                </div>
              )}
            </div>
            
            <h3 className="text-[#f2f2f7] font-semibold text-[13px] line-clamp-2 leading-[1.3] group-hover:text-white transition-colors">
              {item.title}
            </h3>
            <p className="text-[11px] font-medium text-white/40 mt-0.5">
              Eps Terbaru: {item.latestEpisode || '?'}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

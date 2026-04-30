'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import DetailClient from '@/features/detail/DetailClient';
import WatchClient from '@/features/watch/WatchClient';
import { API } from "@/core/lib/api";

export default function NotFoundFallback() {
  const pathname = usePathname();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pathname) return;
    
    if (pathname.startsWith('/anime/')) {
      const id = pathname.split('/')[2];
      fetch(`${API}/api/v2/anime/${id}`)
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data) {
            const a = json.data;
            setData({
              type: 'anime',
              id,
              detail: {
                title: a.cleanTitle ?? a.nativeTitle ?? "Unknown Title",
                nativeTitle: a.nativeTitle,
                poster: a.coverImage,
                banner: a.bannerImage,
                synopsis: a.synopsis,
                score: a.score,
                genres: a.genres ?? [],
                studios: a.studios ?? [],
                status: a.status,
                airSchedule: a.airSchedule || null,
                views: a.views || 0,
                totalEpisodes: a.totalEpisodes,
                season: a.season,
                seasonYear: a.year,
                recommendations: a.recommendations ?? [],
                nextAiringEpisode: a.nextAiringEpisode,
                episodes: (a.episodes ?? []).map((e: any) => ({
                  title: `Episode ${e.episodeNumber}`,
                  url: `/watch/${id}/${e.episodeNumber}`,
                  number: e.episodeNumber,
                  provider: e.providerId,
                  thumbnailUrl: e.thumbnailUrl,
                })),
              }
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } 
    else if (pathname.startsWith('/watch/')) {
      const parts = pathname.split('/');
      const id = parts[2];
      const episode = parts[3];
      fetch(`${API}/api/v2/anime/${id}`)
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data) {
            setData({
              type: 'watch',
              id,
              episode,
              animeDetails: json.data,
              allEpisodes: json.data.episodes || [],
              recommendations: json.data.recommendations || []
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [pathname]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#13111a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0a84ff]/30 border-t-[#0a84ff] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (data?.type === 'anime') {
    return <DetailClient id={data.id} detail={data.detail} />;
  }

  if (data?.type === 'watch') {
    return (
      <WatchClient 
        id={data.id} 
        episode={data.episode} 
        title={`Episode ${data.episode}`} 
        poster={data.animeDetails?.coverImage} 
        sources={[]} 
        allEpisodes={data.allEpisodes} 
        recommendations={data.recommendations} 
        animeDetails={data.animeDetails} 
      />
    );
  }

  return (
    <div className="w-full h-screen bg-[#13111a] flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-black mb-2 text-[#ff453a]">404</h1>
      <p className="text-[#8e8e93] text-sm">Halaman tidak ditemukan.</p>
    </div>
  );
}

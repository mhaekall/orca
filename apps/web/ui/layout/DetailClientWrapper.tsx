"use client";

import { useEffect, useState } from "react";
import DetailClient from "@/features/detail/DetailClient";
import DetailSkeleton from "@/features/detail/DetailSkeleton";
import { API } from "@/core/lib/api";

export default function DetailClientWrapper({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/v2/anime/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError("Anime tidak ditemukan");
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || String(err));
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#13111a] flex flex-col items-center justify-center text-white">
        <h1 className="text-xl font-bold text-[#ff453a] mb-2">Gagal memuat anime</h1>
      </div>
    );
  }

  const detailObj = {
    title: data.cleanTitle ?? data.nativeTitle ?? "Unknown Title",
    nativeTitle: data.nativeTitle,
    poster: data.coverImage || data.image || data.poster || data.thumbnail,
    banner: data.bannerImage,
    synopsis: data.synopsis,
    score: data.score,
    genres: data.genres ?? [],
    studios: data.studios ?? [],
    status: data.status,
    airSchedule: data.airSchedule || null,
    views: data.views || 0,
    totalEpisodes: data.totalEpisodes,
    latestEpisode: data.latestEpisode,
    season: data.season,
    seasonYear: data.year,
    recommendations: data.recommendations ?? [],
    nextAiringEpisode: data.nextAiringEpisode,
    episodes: (data.episodes ?? []).map((e: any) => ({
      title: `Episode ${e.episodeNumber}`,
      url: `/watch/${id}/${e.episodeNumber}`,
      number: e.episodeNumber,
      provider: e.providerId,
      thumbnailUrl: e.thumbnailUrl,
    })),
  };

  return <DetailClient id={id} detail={detailObj} />;
}

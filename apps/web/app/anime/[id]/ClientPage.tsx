"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import DetailClient from "@/features/detail/DetailClient";
import DetailSkeleton from "@/features/detail/DetailSkeleton";
import { API } from "@/core/lib/api";

export default function AnimeClientPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const paramIdRaw = params?.id;
  const paramId = Array.isArray(paramIdRaw) ? paramIdRaw[0] : paramIdRaw;
  const resolvedParamId = paramId && paramId !== "fallback" ? paramId : null;
  const id = resolvedParamId || searchParams.get("id");
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID tidak valid");
      setLoading(false);
      return;
    }
    
    fetch(`${API}/api/v2/anime/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError("Gagal memuat anime");
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || String(err));
        setLoading(false);
      });
  }, [id]);

  if (loading) return <DetailSkeleton />;
  
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#13111a] flex items-center justify-center text-white">
        <p className="text-red-500 font-bold">Error: {error || "Anime tidak ditemukan"}</p>
      </div>
    );
  }

  // Map API response to match DetailClient props
  const detailObj = {
    title: data.cleanTitle ?? data.nativeTitle ?? "Unknown Title",
    nativeTitle: data.nativeTitle,
    poster: data.coverImage,
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
      url: `/watch?id=${id}&episode=${e.episodeNumber}`,
      number: e.episodeNumber,
      provider: e.providerId,
      thumbnailUrl: e.thumbnailUrl,
    })),
  };

  return <DetailClient id={String(id)} detail={detailObj} />;
}

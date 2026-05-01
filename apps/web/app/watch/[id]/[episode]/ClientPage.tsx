"use client";

import { useEffect, useState } from "react";
import WatchClient from "@/features/watch/WatchClient";
import { api } from "@/core/lib/api";

export default function WatchClientPage({ id, episode }: { id: string; episode: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !episode) {
      setError("ID atau Episode tidak valid");
      setLoading(false);
      return;
    }
    
    api.animeDetail(id)
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
  }, [id, episode]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#13111a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#13111a] flex items-center justify-center text-white">
        <p className="text-red-500 font-bold">Error: {error || "Anime tidak ditemukan"}</p>
      </div>
    );
  }

  return (
    <WatchClient 
      id={String(id)} 
      episode={String(episode)} 
      title={`Episode ${episode}`} 
      poster={data.coverImage} 
      sources={[]} 
      allEpisodes={data.episodes || []} 
      recommendations={data.recommendations || []} 
      animeDetails={data} 
    />
  );
}

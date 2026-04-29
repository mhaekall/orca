"use client";

import { useEffect, useState } from "react";
import WatchClient from "@/features/watch/WatchClient";
import { API } from "@/core/lib/api";

export default function WatchClientWrapper({ id, episode }: { id: string; episode: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/v2/anime/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setData(json.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, episode]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className="text-xl font-bold text-[#ff453a] mb-2">Gagal memuat anime</h1>
      </div>
    );
  }

  return (
    <WatchClient 
      id={id} 
      episode={episode} 
      title={`Episode ${episode}`} 
      poster={data.coverImage} 
      sources={[]} 
      allEpisodes={data.episodes || []} 
      recommendations={data.recommendations || []} 
      animeDetails={data} 
    />
  );
}

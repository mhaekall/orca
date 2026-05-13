import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { HF_API_URL } from '../config';
import { fetcher, fetchWithAuth } from '../fetcher';

export function useWatchProgress(userId: string | undefined, anilistId: string, episode: string, videoUrl: string | null) {
  const currentVideoTime = useRef(0);
  const currentVideoDuration = useRef(0);

  const { data: watchSessionData } = useSWR(
    userId ? `${HF_API_URL}/api/v2/social/watch-session/${anilistId}/${episode}?user_id=${userId}` : null,
    fetcher
  );

  useEffect(() => {
    if (!userId || !videoUrl) return;

    const saveProgress = () => {
      try {
        const currentT = currentVideoTime.current;
        const durationT = currentVideoDuration.current;
        if (currentT > 1) {
          // Update granular watch session
          fetchWithAuth(`${HF_API_URL}/api/v2/social/watch-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              anilist_id: parseInt(anilistId),
              episode_number: parseFloat(episode),
              watch_duration_sec: Math.floor(currentT),
              total_duration_sec: Math.floor(durationT),
              quality_watched: "Auto",
              provider_used: "Cloudflare"
            }),
          }).catch(() => {});

          // Update main watch history for Collection/Home timeline
          const isComp = durationT > 0 && (currentT / durationT) > 0.9;
          fetchWithAuth(`${HF_API_URL}/api/v2/social/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              anilistId: anilistId,
              episodeNumber: episode,
              progressSeconds: Math.floor(currentT),
              durationSeconds: Math.floor(durationT),
              isCompleted: isComp
            }),
          }).catch(() => {});
        }
      } catch (e) {}
    };

    const interval = setInterval(saveProgress, 15000);

    return () => {
      clearInterval(interval);
      saveProgress();
    };
  }, [userId, anilistId, episode, videoUrl]);

  const updateProgress = (time: number, duration: number) => {
    currentVideoTime.current = time;
    currentVideoDuration.current = duration;
  };

  return { updateProgress, watchSessionData };
}

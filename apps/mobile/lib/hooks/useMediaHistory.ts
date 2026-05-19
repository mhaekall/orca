import React from 'react';
import useSWR from 'swr';
import { useAuth } from '../auth';
import { HF_API_URL } from '../config';
import { fetcher } from '../fetcher';

export function useMediaHistory() {
  const { user } = useAuth();
  const userId = user?.id || user?.email;

  const { data: historyRes, isLoading, error, mutate } = useSWR(
    userId ? `${HF_API_URL}/api/v2/social/progress?user_id=${userId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  const historyItems = React.useMemo(() => {
    const raw = Array.isArray(historyRes) ? historyRes : (historyRes?.data || []);
    return raw;
  }, [historyRes]);

  const animeHistory = React.useMemo(() => {
    const grouped = new Map();
    historyItems.forEach((item: any) => {
      const id = String(item.anilist_id || item.anilistId || item.animeSlug || '');
      if (!id || id.includes('|')) return;

      const existing = grouped.get(id);
      if (!existing || new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        grouped.set(id, item);
      }
    });
    return Array.from(grouped.values()).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [historyItems]);

  const mangaHistory = React.useMemo(() => {
    const grouped = new Map();
    historyItems.forEach((item: any) => {
      const id = String(item.anilist_id || item.anilistId || item.animeSlug || '');
      if (!id || !id.includes('|')) return;

      const existing = grouped.get(id);
      if (!existing || new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        grouped.set(id, item);
      }
    });
    return Array.from(grouped.values()).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [historyItems]);

  return {
    animeHistory,
    mangaHistory,
    isLoading,
    error,
    mutate
  };
}

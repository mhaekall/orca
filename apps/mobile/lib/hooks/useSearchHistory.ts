import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@search_history";
const MAX_HISTORY = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load search history", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveHistory = async (newHistory: string[]) => {
    const sliced = newHistory.slice(0, MAX_HISTORY);
    setHistory(sliced);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sliced));
    } catch (e) {
      console.error("Failed to save search history", e);
    }
  };

  const addSearchTerm = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const updated = [trimmed, ...prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())];
      saveHistory(updated);
      return updated.slice(0, MAX_HISTORY); // Optimistic update
    });
  }, []);

  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, []);

  return { history, isLoading, addSearchTerm, clearHistory };
}

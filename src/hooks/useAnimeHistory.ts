"use client";

import { useState, useEffect } from "react";
import {
  getAnimeHistory,
  clearAnimeHistory,
} from "@/lib/anime/history";
import type { AnimeWatchHistoryEntry } from "@/lib/types";

export function useAnimeHistory() {
  const [history, setHistory] = useState<AnimeWatchHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getAnimeHistory());
  }, []);

  function clearHistory() {
    clearAnimeHistory();
    setHistory([]);
  }

  function refresh() {
    setHistory(getAnimeHistory());
  }

  return { history, clearHistory, refresh };
}

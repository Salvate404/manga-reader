"use client";

import type { AnimeWatchHistoryEntry } from "@/lib/types";

const HISTORY_KEY = "anime_watch_history";
const MAX_ENTRIES = 50;

export function getAnimeHistory(): AnimeWatchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as AnimeWatchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addToAnimeHistory(
  entry: Omit<AnimeWatchHistoryEntry, "watchedAt" | "kind">
): void {
  if (typeof window === "undefined") return;
  const history = getAnimeHistory();
  const existing = history.find(
    (h) =>
      h.sourceId === entry.sourceId &&
      h.animeId === entry.animeId &&
      h.episodeId === entry.episodeId
  );
  const filtered = history.filter(
    (h) =>
      !(
        h.sourceId === entry.sourceId &&
        h.animeId === entry.animeId &&
        h.episodeId === entry.episodeId
      )
  );
  filtered.unshift({
    ...entry,
    kind: "anime",
    watchedAt: new Date().toISOString(),
    progressSeconds: existing?.progressSeconds,
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
}

export function getLastWatchedForAnime(
  sourceId: string,
  animeId: string
): AnimeWatchHistoryEntry | undefined {
  return getAnimeHistory().find(
    (h) => h.sourceId === sourceId && h.animeId === animeId
  );
}

export function clearAnimeHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

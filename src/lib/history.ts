"use client";

import type { ReadingHistoryEntry } from "@/lib/types";

const HISTORY_KEY = "manga_reading_history";
const MAX_ENTRIES = 50;

export function getHistory(): ReadingHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ReadingHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addToHistory(entry: Omit<ReadingHistoryEntry, "readAt">): void {
  if (typeof window === "undefined") return;
  const history = getHistory().filter(
    (h) => !(h.sourceId === entry.sourceId && h.mangaId === entry.mangaId && h.chapterId === entry.chapterId)
  );
  history.unshift({ ...entry, readAt: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_ENTRIES)));
}

export function updateHistoryPage(
  sourceId: string,
  mangaId: string,
  chapterId: string,
  page: number
): void {
  if (typeof window === "undefined") return;
  const history = getHistory();
  const idx = history.findIndex(
    (h) => h.sourceId === sourceId && h.mangaId === mangaId && h.chapterId === chapterId
  );
  if (idx !== -1) {
    history[idx].page = page;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

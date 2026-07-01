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
  const history = getHistory();
  // Preserva a página salva ao re-adicionar a mesma entrada
  const existing = history.find(
    (h) => h.sourceId === entry.sourceId && h.mangaId === entry.mangaId && h.chapterId === entry.chapterId
  );
  const filtered = history.filter(
    (h) => !(h.sourceId === entry.sourceId && h.mangaId === entry.mangaId && h.chapterId === entry.chapterId)
  );
  filtered.unshift({ ...entry, readAt: new Date().toISOString(), page: existing?.page });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
}

/** Retorna a entrada mais recente lida de um mangá específico (qualquer capítulo). */
export function getLastReadForManga(
  sourceId: string,
  mangaId: string
): ReadingHistoryEntry | undefined {
  return getHistory().find((h) => h.sourceId === sourceId && h.mangaId === mangaId);
}

/** Retorna a última página salva para um capítulo específico. */
export function getChapterSavedPage(sourceId: string, mangaId: string, chapterId: string): number {
  const entry = getHistory().find(
    (h) => h.sourceId === sourceId && h.mangaId === mangaId && h.chapterId === chapterId
  );
  return entry?.page ?? 0;
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

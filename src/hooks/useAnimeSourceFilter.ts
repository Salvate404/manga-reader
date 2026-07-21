"use client";

import { useState, useEffect, useCallback } from "react";
import type { AnimeAudioType } from "@/lib/types";

export interface AnimeSourceOption {
  id: string;
  name: string;
  language: string;
}

export const ALL_ANIME_SOURCES: AnimeSourceOption[] = [
  { id: "animefire", name: "AnimeFire", language: "PT-BR" },
  { id: "goyabu", name: "Goyabu", language: "PT-BR" },
  { id: "animesonline", name: "AnimesOnline", language: "PT-BR" },
];

const STORAGE_KEY = "anime_reader_sources_v4";
const AUDIO_KEY = "anime_audio_filter";

export type AudioFilter = "all" | AnimeAudioType;

export function useAnimeSourceFilter() {
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    () => new Set(["animefire", "goyabu", "animesonline"])
  );
  const [audioFilter, setAudioFilterState] = useState<AudioFilter>("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedSources(new Set(parsed));
        }
      }
      const audio = localStorage.getItem(AUDIO_KEY);
      if (audio === "all" || audio === "dublado" || audio === "legendado") {
        setAudioFilterState(audio);
      }
    } catch {}
    setHydrated(true);
  }, []);

  const toggle = useCallback((sourceId: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        if (next.size > 1) next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  const setAudioFilter = useCallback((next: AudioFilter) => {
    setAudioFilterState(next);
    try {
      localStorage.setItem(AUDIO_KEY, next);
    } catch {}
  }, []);

  const sourcesParam = [...selectedSources].sort().join(",");
  const allSelected = selectedSources.size === ALL_ANIME_SOURCES.length;

  return {
    selectedSources,
    toggle,
    sourcesParam,
    allSelected,
    hydrated,
    audioFilter,
    setAudioFilter,
  };
}

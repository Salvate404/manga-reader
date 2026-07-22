"use client";

import { useState, useEffect, useCallback } from "react";

export interface ShortsSourceOption {
  id: string;
  name: string;
  language: string;
}

export const ALL_SHORTS_SOURCES: ShortsSourceOption[] = [
  { id: "flextv", name: "FlexTV", language: "PT-BR" },
  { id: "dramashorts", name: "DramaShorts", language: "PT-BR" },
  { id: "shortdrama", name: "ShortDrama", language: "EN" },
];

const STORAGE_KEY = "shorts_reader_sources_v3";
const DEFAULT_SOURCES = ["flextv", "dramashorts"] as const;

export function useShortsSourceFilter() {
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    () => new Set(DEFAULT_SOURCES)
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem("shorts_reader_sources_v2") ||
        localStorage.getItem("shorts_reader_sources_v1");
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const next = new Set(parsed);
          // Garante DramaShorts após adicionar a fonte
          if (![...next].some((id) => id === "dramashorts" || id === "flextv")) {
            next.add("dramashorts");
          }
          if (!next.has("dramashorts")) next.add("dramashorts");
          setSelectedSources(next);
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        }
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

  const sourcesParam = [...selectedSources].sort().join(",");

  return {
    selectedSources,
    toggle,
    sourcesParam,
    hydrated,
  };
}

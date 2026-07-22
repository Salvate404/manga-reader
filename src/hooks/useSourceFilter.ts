"use client";

import { useState, useEffect, useCallback } from "react";

export interface SourceOption {
  id: string;
  name: string;
  language: string;
}

// Todas as fontes disponíveis
export const ALL_SOURCES: SourceOption[] = [
  { id: "leituramanga", name: "Leitura Manga", language: "PT-BR" },
  { id: "nexustoons",  name: "Nexus Toons",   language: "PT-BR" },
  { id: "mangafire",   name: "MangaFire",     language: "EN/PT-BR" },
  { id: "mangalix",    name: "MangaLix",       language: "EN"    },
  { id: "mangadex",    name: "MangaDex",       language: "EN"    },
];

const STORAGE_KEY = "manga_reader_sources_v2";

export function useSourceFilter() {
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    () => new Set(ALL_SOURCES.map((s) => s.id))
  );
  const [hydrated, setHydrated] = useState(false);

  // Carregar do localStorage após hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedSources(new Set(parsed));
        }
      }
    } catch {
      // ignora erros de localStorage
    }
    setHydrated(true);
  }, []);

  const toggle = useCallback((sourceId: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        // Não permite desmarcar todos
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
  const allSelected = selectedSources.size === ALL_SOURCES.length;

  return { selectedSources, toggle, sourcesParam, allSelected, hydrated };
}

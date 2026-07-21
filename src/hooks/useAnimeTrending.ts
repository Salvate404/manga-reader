"use client";

import { useState, useEffect } from "react";
import type { AnimeTrendingSection } from "@/lib/anime/anime-service";

const CACHE_KEY = "anime_trending_cache";
const CACHE_DURATION = 5 * 60 * 1000;

function getCached(): AnimeTrendingSection[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { data: AnimeTrendingSection[]; timestamp: number };
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCached(data: AnimeTrendingSection[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function useAnimeTrending() {
  const [sections, setSections] = useState<AnimeTrendingSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = getCached();
    if (cached) {
      setSections(cached);
      setIsLoading(false);
    }

    fetch("/api/anime/trending")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Erro ao carregar destaques"))))
      .then((data: { sections?: AnimeTrendingSection[] }) => {
        if (cancelled) return;
        const next = data.sections ?? [];
        setSections(next);
        setCached(next);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { sections, isLoading, error };
}

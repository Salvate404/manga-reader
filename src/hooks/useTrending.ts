"use client";

import { useState, useEffect } from "react";
import { fetchMangaFireTrending } from "@/lib/mangafire-api";
import type { TrendingSection } from "@/lib/trending-service";

const TRENDING_CACHE_KEY = "manga_trending_cache_v3";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedTrending(): TrendingSection[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TRENDING_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { data: TrendingSection[]; timestamp: number };
    const now = Date.now();
    if (now - cached.timestamp > CACHE_DURATION) {
      localStorage.removeItem(TRENDING_CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCachedTrending(data: TrendingSection[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      TRENDING_CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Ignore storage errors
  }
}

export function useTrending() {
  const [sections, setSections] = useState<TrendingSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Try to load from cache first
    const cached = getCachedTrending();
    if (cached) {
      setSections(cached);
      setIsLoading(false);
    }

    // Busca fontes regulares + Nexus em paralelo; Nexus usa rota Edge diretamente
    // (evita o salto serverless→edge que falha silenciosamente na Vercel)
    const mainFetch = fetch("/api/trending")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Erro ao carregar destaques"))))
      .then((data) => (data.sections ?? []) as TrendingSection[])
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido");
        return [] as TrendingSection[];
      });

    const nexusFetch = fetch("/api/trending/nexus")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TrendingSection | null) =>
        data && Array.isArray(data.items) && data.items.length > 0
          ? [data]
          : ([] as TrendingSection[])
      )
      .catch(() => [] as TrendingSection[]);

    // MangaFire: browser → API (Vercel IP bloqueado)
    const mangafireFetch = fetchMangaFireTrending(12)
      .then((items) =>
        items.length
          ? [{ sourceId: "mangafire", sourceName: "MangaFire", items }]
          : ([] as TrendingSection[])
      )
      .catch(() => [] as TrendingSection[]);

    Promise.all([mainFetch, nexusFetch, mangafireFetch]).then(
      ([mainSections, nexusSections, mangafireSections]) => {
        if (!cancelled) {
          const allSections = [
            ...mainSections,
            ...nexusSections,
            ...mangafireSections,
          ];
          setSections(allSections);
          setCachedTrending(allSections);
          setIsLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return { sections, isLoading, error };
}

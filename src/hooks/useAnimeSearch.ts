"use client";

import { useState, useCallback, useRef } from "react";
import type { AnimeSearchApiResponse, AnimeSearchResult } from "@/lib/types";

function cacheKey(q: string, sources: string) {
  return `anime_search__${q.toLowerCase().trim()}__${sources}`;
}

function readCache(key: string): AnimeSearchResult[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as AnimeSearchResult[];
  } catch {
    return null;
  }
}

function writeCache(key: string, results: AnimeSearchResult[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify(results));
  } catch {}
}

export function useAnimeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string, sourcesParam = "") => {
    const trimmed = q.trim();
    if (!trimmed) return;

    const key = cacheKey(trimmed, sourcesParam);
    const cached = readCache(key);
    if (cached) {
      setQuery(trimmed);
      setResults(cached);
      setHasSearched(true);
      setError(null);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const url = new URL("/api/anime/search", location.origin);
      url.searchParams.set("q", trimmed);
      if (sourcesParam) url.searchParams.set("sources", sourcesParam);

      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) throw new Error("Erro ao buscar animes");
      const json = (await res.json()) as AnimeSearchApiResponse;
      setResults(json.results);
      writeCache(key, json.results);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setError(null);
  }, []);

  return { query, setQuery, results, isLoading, error, hasSearched, search, clear };
}

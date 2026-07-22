"use client";

import { useState, useCallback, useRef } from "react";
import type { ShortSearchApiResponse, ShortSearchResult } from "@/lib/types";

function cacheKey(q: string, sources: string) {
  return `shorts_search__${q.toLowerCase().trim()}__${sources}`;
}

function readCache(key: string): ShortSearchResult[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ShortSearchResult[];
  } catch {
    return null;
  }
}

function writeCache(key: string, results: ShortSearchResult[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify(results));
  } catch {}
}

export function useShortsSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShortSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string, sourcesParam = "dramashorts,flextv") => {
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
      const url = new URL("/api/shorts/search", location.origin);
      url.searchParams.set("q", trimmed);
      if (sourcesParam) url.searchParams.set("sources", sourcesParam);
      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) throw new Error("Erro ao buscar short dramas");
      const json = (await res.json()) as ShortSearchApiResponse;
      setResults(json.results ?? []);
      writeCache(key, json.results ?? []);
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

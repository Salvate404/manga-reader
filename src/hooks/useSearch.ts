"use client";

import { useState, useCallback, useRef } from "react";
import type { SearchApiResponse, MangaSearchResult } from "@/lib/types";

function cacheKey(q: string, sources: string) {
  return `search__${q.toLowerCase().trim()}__${sources}`;
}

function readCache(key: string): MangaSearchResult[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as MangaSearchResult[];
  } catch {
    return null;
  }
}

function writeCache(key: string, results: MangaSearchResult[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify(results));
  } catch {}
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string, sourcesParam = "") => {
    const trimmed = q.trim();
    if (!trimmed) return;

    // Verificar cache primeiro
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

    // Cancela busca anterior se ainda estiver pendente
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const url = new URL("/api/search", location.origin);
      url.searchParams.set("q", trimmed);
      if (sourcesParam) url.searchParams.set("sources", sourcesParam);

      const res = await fetch(url.toString(), { signal: abortRef.current.signal });
      if (!res.ok) throw new Error("Erro ao buscar mangás");
      const json: SearchApiResponse = await res.json();
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

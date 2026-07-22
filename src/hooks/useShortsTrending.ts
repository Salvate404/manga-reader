"use client";

import { useState, useEffect } from "react";
import type { ShortsTrendingSection } from "@/lib/shorts/service";

const CACHE_KEY = "shorts_trending_sections_v2";
const CACHE_DURATION = 5 * 60 * 1000;

function getCached(): ShortsTrendingSection[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as {
      data: ShortsTrendingSection[];
      timestamp: number;
    };
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCached(data: ShortsTrendingSection[]) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {}
}

export function useShortsTrending() {
  const [sections, setSections] = useState<ShortsTrendingSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = getCached();
    if (cached) {
      setSections(cached);
      setIsLoading(false);
    }

    fetch("/api/shorts/trending")
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error("Erro ao carregar destaques"))
      )
      .then((data: { sections?: ShortsTrendingSection[] }) => {
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

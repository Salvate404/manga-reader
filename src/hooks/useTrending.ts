"use client";

import { useState, useEffect } from "react";
import type { TrendingSection } from "@/lib/trending-service";

export function useTrending() {
  const [sections, setSections] = useState<TrendingSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/trending")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar destaques");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSections(data.sections ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro desconhecido");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { sections, isLoading, error };
}

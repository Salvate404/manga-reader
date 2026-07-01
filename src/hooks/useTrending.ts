"use client";

import { useState, useEffect } from "react";
import type { TrendingSection } from "@/lib/trending-service";

export function useTrending() {
  const [sections, setSections] = useState<TrendingSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

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

    Promise.all([mainFetch, nexusFetch]).then(([mainSections, nexusSections]) => {
      if (!cancelled) {
        setSections([...mainSections, ...nexusSections]);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { sections, isLoading, error };
}

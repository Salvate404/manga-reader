import { NextRequest, NextResponse } from "next/server";
import { getAllScrapers } from "@/lib/scrapers/registry";
import type { SearchApiResponse, MangaSearchResult } from "@/lib/types";

export const maxDuration = 30;

/** Fontes que rodam só em Edge (bloqueiam IP Node da Vercel). */
const EDGE_ONLY = new Set(["nexustoons", "mangafire"]);

/**
 * Busca somente nas fontes serverless (leituramanga, mangalix, etc.).
 * NexusToons / MangaFire: browser → /api/search/{fonte} (Edge).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Parâmetro 'q' é obrigatório." }, { status: 400 });
  }

  const sourcesParam = searchParams.get("sources")?.trim();
  const allowedSources = sourcesParam ? new Set(sourcesParam.split(",")) : null;

  const allScrapers = getAllScrapers();
  const scrapers = allowedSources
    ? allScrapers.filter(
        (s) => allowedSources.has(s.sourceId) && !EDGE_ONLY.has(s.sourceId)
      )
    : allScrapers.filter((s) => !EDGE_ONLY.has(s.sourceId));

  const results: MangaSearchResult[] = [];
  const sourceErrors: SearchApiResponse["sourceErrors"] = [];

  if (scrapers.length > 0) {
    const settled = await Promise.allSettled(scrapers.map((scraper) => scraper.search(query)));
    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i];
      if (outcome.status === "fulfilled") {
        results.push(...outcome.value);
      } else {
        sourceErrors.push({
          sourceId: scrapers[i].sourceId,
          error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
        });
      }
    }
  }

  // Ordenar por relevância: correspondência exata primeiro, depois começa com, depois contém
  const queryLower = query.toLowerCase();
  results.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();

    // Correspondência exata
    const aExact = aTitle === queryLower;
    const bExact = bTitle === queryLower;
    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;

    // Começa com a query (prioridade maior)
    const aStarts = aTitle.startsWith(queryLower);
    const bStarts = bTitle.startsWith(queryLower);
    if (aStarts && !bStarts) return -1;
    if (bStarts && !aStarts) return 1;

    // Se ambos começam com a query, dar prioridade ao título mais curto
    if (aStarts && bStarts) {
      return aTitle.length - bTitle.length;
    }

    // Contém a query como palavra inteira (ex: "one" em "one piece")
    const aWordMatch = new RegExp(`\\b${queryLower}\\b`).test(aTitle);
    const bWordMatch = new RegExp(`\\b${queryLower}\\b`).test(bTitle);
    if (aWordMatch && !bWordMatch) return -1;
    if (bWordMatch && !aWordMatch) return 1;

    // Contém a query em qualquer lugar
    const aContains = aTitle.includes(queryLower);
    const bContains = bTitle.includes(queryLower);
    if (aContains && !bContains) return -1;
    if (bContains && !aContains) return 1;

    // Se ambos contém, ordenar por posição da ocorrência
    if (aContains && bContains) {
      const aIndex = aTitle.indexOf(queryLower);
      const bIndex = bTitle.indexOf(queryLower);
      if (aIndex !== bIndex) return aIndex - bIndex;
    }

    // Ordem alfabética como fallback
    return aTitle.localeCompare(bTitle);
  });

  const response: SearchApiResponse = { results, sourceErrors };
  return NextResponse.json(response);
}

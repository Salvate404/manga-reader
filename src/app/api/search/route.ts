import { NextRequest, NextResponse } from "next/server";
import { getAllScrapers } from "@/lib/scrapers/registry";
import type { SearchApiResponse, MangaSearchResult } from "@/lib/types";

export const maxDuration = 30;

/**
 * Busca somente nas fontes serverless (leituramanga, mangalix, etc.).
 * NexusToons é buscado no browser via /api/search/nexus (rota Edge)
 * pelo hook useSearch, para evitar o salço serverless→edge que falha na Vercel.
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
    ? allScrapers.filter((s) => allowedSources.has(s.sourceId) && s.sourceId !== "nexustoons")
    : allScrapers.filter((s) => s.sourceId !== "nexustoons");

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

  const response: SearchApiResponse = { results, sourceErrors };
  return NextResponse.json(response);
}

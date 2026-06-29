import { NextRequest, NextResponse } from "next/server";
import { getAllScrapers } from "@/lib/scrapers/registry";
import type { SearchApiResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Parâmetro 'q' é obrigatório." }, { status: 400 });
  }

  // Filtro de fontes opcional: ?sources=leituramanga,nexustoons
  const sourcesParam = searchParams.get("sources")?.trim();
  const allowedSources = sourcesParam ? new Set(sourcesParam.split(",")) : null;

  const allScrapers = getAllScrapers();
  const scrapers = allowedSources
    ? allScrapers.filter((s) => allowedSources.has(s.sourceId))
    : allScrapers;

  if (scrapers.length === 0) {
    const response: SearchApiResponse = { results: [], sourceErrors: [] };
    return NextResponse.json(response);
  }

  // Busca em todas as fontes em paralelo
  const settled = await Promise.allSettled(
    scrapers.map((scraper) => scraper.search(query))
  );

  const results = [];
  const sourceErrors: SearchApiResponse["sourceErrors"] = [];

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

  const response: SearchApiResponse = { results, sourceErrors };
  return NextResponse.json(response);
}

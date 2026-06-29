import { NextRequest, NextResponse } from "next/server";
import { getAllScrapers } from "@/lib/scrapers/registry";
import { fetchNexusViaEdge } from "@/lib/nexus-api";
import type { SearchApiResponse, MangaSearchResult } from "@/lib/types";

export const maxDuration = 30;

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

  const includeNexus = !allowedSources || allowedSources.has("nexustoons");

  const results: MangaSearchResult[] = [];
  const sourceErrors: SearchApiResponse["sourceErrors"] = [];

  const tasks: Promise<void>[] = [];

  if (scrapers.length > 0) {
    tasks.push(
      Promise.allSettled(scrapers.map((scraper) => scraper.search(query))).then((settled) => {
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
      })
    );
  }

  if (includeNexus) {
    tasks.push(
      fetchNexusViaEdge<{ results: MangaSearchResult[]; error?: string }>(
        `/api/search/nexus?q=${encodeURIComponent(query)}`
      ).then((data) => {
        if (data?.results?.length) {
          results.push(...data.results);
        } else if (data?.error) {
          sourceErrors.push({ sourceId: "nexustoons", error: data.error });
        }
      })
    );
  }

  await Promise.all(tasks);

  const response: SearchApiResponse = { results, sourceErrors };
  return NextResponse.json(response);
}

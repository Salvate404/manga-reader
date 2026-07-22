import { getAllScrapers } from "@/lib/scrapers/registry";
import type { MangaSearchResult } from "@/lib/types";

export interface TrendingSection {
  sourceId: string;
  sourceName: string;
  items: MangaSearchResult[];
}

const EDGE_ONLY = new Set(["nexustoons", "mangafire"]);

/**
 * Trending serverless. Nexus / MangaFire vêm do browser via rotas Edge.
 */
export async function getTrendingBySource(limit = 10): Promise<TrendingSection[]> {
  const scrapers = getAllScrapers().filter((s) => !EDGE_ONLY.has(s.sourceId));

  const settled = await Promise.allSettled(
    scrapers.map(async (scraper) => ({
      sourceId: scraper.sourceId,
      sourceName: scraper.sourceName,
      items: await scraper.getTrending(limit),
    }))
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<TrendingSection> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((section) => section.items.length > 0);
}

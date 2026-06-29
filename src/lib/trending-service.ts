import { getAllScrapers } from "@/lib/scrapers/registry";
import { fetchNexusViaEdge } from "@/lib/nexus-api";
import type { MangaSearchResult } from "@/lib/types";

export interface TrendingSection {
  sourceId: string;
  sourceName: string;
  items: MangaSearchResult[];
}

export async function getTrendingBySource(limit = 10): Promise<TrendingSection[]> {
  const scrapers = getAllScrapers().filter((s) => s.sourceId !== "nexustoons");

  const settled = await Promise.allSettled([
    ...scrapers.map(async (scraper) => ({
      sourceId: scraper.sourceId,
      sourceName: scraper.sourceName,
      items: await scraper.getTrending(limit),
    })),
    fetchNexusViaEdge<TrendingSection>("/api/trending/nexus"),
  ]);

  return settled
    .filter((r): r is PromiseFulfilledResult<TrendingSection | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((section): section is TrendingSection => !!section && section.items.length > 0);
}

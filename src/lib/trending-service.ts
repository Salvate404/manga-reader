import { getAllScrapers } from "@/lib/scrapers/registry";
import type { MangaSearchResult } from "@/lib/types";

export interface TrendingSection {
  sourceId: string;
  sourceName: string;
  items: MangaSearchResult[];
}

/**
 * Busca trending somente das fontes serverless (leituramanga, mangalix, etc.).
 * NexusToons é carregado no browser via /api/trending/nexus (rota Edge)
 * pelo hook useTrending, para evitar o salço serverless→edge que falha na Vercel.
 */
export async function getTrendingBySource(limit = 10): Promise<TrendingSection[]> {
  const scrapers = getAllScrapers().filter((s) => s.sourceId !== "nexustoons");

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

import { getScraperById } from "@/lib/scrapers/registry";
import { fetchNexusViaEdge } from "@/lib/nexus-api";
import type { ChaptersApiResponse } from "@/lib/types";

/** Busca detalhes do mangá direto no scraper (sem HTTP interno). */
export async function getMangaChapters(
  sourceId: string,
  mangaId: string
): Promise<ChaptersApiResponse | null> {
  if (sourceId === "nexustoons") {
    return fetchNexusViaEdge<ChaptersApiResponse>(
      `/api/nexus/manga/${encodeURIComponent(mangaId)}`
    );
  }

  const scraper = getScraperById(sourceId);
  if (!scraper) return null;

  try {
    const manga = await scraper.getMangaDetail(mangaId);
    return { manga };
  } catch {
    return null;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAllScrapers } from "@/lib/scrapers/registry";
import type { MangaSearchResult } from "@/lib/types";

export const maxDuration = 30;

const BLOCK_SIZE = 36; // 12 rows x 3 columns
const INITIAL_PAGES_PER_SOURCE = 3; // Fetch 3 pages initially (150 manga per source)
const MAX_PAGES_PER_SOURCE = 10; // Max 10 pages per source (500 manga per source)

/**
 * Returns random manga from all sources for the explore page.
 * Supports pagination with the 'page' parameter.
 * Optimized to fetch pages in parallel and limit initial load.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const sourcesParam = searchParams.get("sources")?.trim();
  const allowedSources = sourcesParam ? new Set(sourcesParam.split(",")) : null;

  // Nexus / MangaFire: 403 no Node da Vercel — fora do explore serverless
  const EDGE_ONLY = new Set(["nexustoons", "mangafire"]);
  const allScrapers = getAllScrapers();
  const scrapers = (allowedSources
    ? allScrapers.filter((s) => allowedSources.has(s.sourceId))
    : allScrapers
  ).filter((s) => !EDGE_ONLY.has(s.sourceId));

  const allResults: MangaSearchResult[] = [];

  // Determine how many pages to fetch based on requested page
  // For page 1, fetch fewer pages. For higher pages, fetch more.
  const pagesToFetch = page === 1 ? INITIAL_PAGES_PER_SOURCE : MAX_PAGES_PER_SOURCE;

  // Fetch manga from all sources in parallel
  const sourcePromises = scrapers.map(async (scraper) => {
    const sourceResults: MangaSearchResult[] = [];
    try {
      // Fetch pages in parallel for this source
      const pagePromises = [];
      for (let p = 1; p <= pagesToFetch; p++) {
        pagePromises.push(
          scraper.getAllManga(p, 50).catch((error) => {
            console.error(`Error getting manga page ${p} from ${scraper.sourceId}:`, error);
            return [] as MangaSearchResult[];
          })
        );
      }

      const pageResults = await Promise.all(pagePromises);
      for (const results of pageResults) {
        sourceResults.push(...results);
        // If we got fewer than 50, we've reached the end
        if (results.length < 50) break;
      }
    } catch (error) {
      console.error(`Error getting manga from ${scraper.sourceId}:`, error);
    }
    return sourceResults;
  });

  const resultsBySource = await Promise.all(sourcePromises);
  for (const results of resultsBySource) {
    allResults.push(...results);
  }

  // Shuffle results for randomness
  const shuffled = allResults.sort(() => Math.random() - 0.5);

  // Calculate pagination
  const startIndex = (page - 1) * BLOCK_SIZE;
  const endIndex = startIndex + BLOCK_SIZE;
  const paginatedResults = shuffled.slice(startIndex, endIndex);

  return NextResponse.json({
    results: paginatedResults,
    hasMore: endIndex < shuffled.length,
    total: shuffled.length,
    currentPage: page,
  });
}

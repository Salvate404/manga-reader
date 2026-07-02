import { NextRequest, NextResponse } from "next/server";
import { getAllScrapers } from "@/lib/scrapers/registry";
import type { MangaSearchResult } from "@/lib/types";

export const maxDuration = 60; // Increased timeout for fetching all manga

const BLOCK_SIZE = 36; // 12 rows x 3 columns
const MAX_PAGES_PER_SOURCE = 50; // Fetch up to 50 pages per source (2500 manga per source)

/**
 * Returns random manga from all sources for the explore page.
 * Supports pagination with the 'page' parameter.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const sourcesParam = searchParams.get("sources")?.trim();
  const allowedSources = sourcesParam ? new Set(sourcesParam.split(",")) : null;

  const allScrapers = getAllScrapers();
  const scrapers = allowedSources
    ? allScrapers.filter((s) => allowedSources.has(s.sourceId))
    : allScrapers;

  const allResults: MangaSearchResult[] = [];

  // Get all manga from each source using pagination
  for (const scraper of scrapers) {
    try {
      // Fetch pages until we hit the limit or run out of results
      for (let p = 1; p <= MAX_PAGES_PER_SOURCE; p++) {
        try {
          const results = await scraper.getAllManga(p, 50);
          allResults.push(...results);
          // If we got fewer than 50, we've reached the end
          if (results.length < 50) break;
        } catch (error) {
          console.error(`Error getting manga page ${p} from ${scraper.sourceId}:`, error);
          break; // Stop fetching pages from this source if one fails
        }
      }
    } catch (error) {
      console.error(`Error getting manga from ${scraper.sourceId}:`, error);
    }
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

import { BaseScraper } from "../base";
import type {
  ChapterPage,
  MangaDetail,
  MangaSearchResult,
} from "@/lib/types";
import {
  fetchMangaFireAll,
  fetchMangaFireDetail,
  fetchMangaFirePages,
  fetchMangaFireSearch,
  fetchMangaFireTrending,
  MANGAFIRE_IMAGE_HEADERS,
} from "@/lib/mangafire-api";

export class MangaFireScraper extends BaseScraper {
  readonly sourceId = "mangafire";
  readonly sourceName = "MangaFire";
  readonly baseUrl = "https://mangafire.to";
  readonly language = "EN/PT-BR";

  search(query: string): Promise<MangaSearchResult[]> {
    return fetchMangaFireSearch(query);
  }

  getTrending(limit = 10): Promise<MangaSearchResult[]> {
    return fetchMangaFireTrending(limit);
  }

  getAllManga(page = 1, limit = 50): Promise<MangaSearchResult[]> {
    return fetchMangaFireAll(page, limit);
  }

  getMangaDetail(mangaId: string): Promise<MangaDetail> {
    return fetchMangaFireDetail(mangaId);
  }

  getChapterPages(chapterId: string): Promise<ChapterPage[]> {
    return fetchMangaFirePages(chapterId);
  }

  getImageHeaders(_imageUrl: string): Record<string, string> {
    return { ...MANGAFIRE_IMAGE_HEADERS };
  }
}

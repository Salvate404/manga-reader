import type { BaseScraper } from "./base";
import { LeituraMangaScraper } from "./sources/leituramanga";
import { NexusToonsScraper  } from "./sources/nexustoons";
import { MangaLixScraper    } from "./sources/mangalix";

const scrapers: BaseScraper[] = [
  new LeituraMangaScraper(),
  new NexusToonsScraper(),
  new MangaLixScraper(),
];

/** Retorna todos os scrapers habilitados. */
export function getAllScrapers(): BaseScraper[] {
  return scrapers;
}

/** Retorna um scraper específico pelo sourceId. */
export function getScraperById(sourceId: string): BaseScraper | undefined {
  return scrapers.find((s) => s.sourceId === sourceId);
}

/** Lista de fontes configuradas (para exibição na UI). */
export function getSourceList() {
  return scrapers.map((s) => ({
    id: s.sourceId,
    name: s.sourceName,
    baseUrl: s.baseUrl,
    language: s.language,
  }));
}

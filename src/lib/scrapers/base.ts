import type { MangaDetail, MangaSearchResult, ChapterPage } from "@/lib/types";

/**
 * Interface que todo scraper de fonte deve implementar.
 * Cada site de mangá terá sua própria classe que estende BaseScraper.
 */
export abstract class BaseScraper {
  abstract readonly sourceId: string;
  abstract readonly sourceName: string;
  abstract readonly baseUrl: string;
  abstract readonly language: string;

  /**
   * Busca mangás pelo nome na fonte.
   */
  abstract search(query: string): Promise<MangaSearchResult[]>;

  /**
   * Retorna os detalhes do mangá e a lista de capítulos.
   * @param mangaId - slug ou id interno da fonte
   */
  abstract getMangaDetail(mangaId: string): Promise<MangaDetail>;

  /**
   * Retorna as URLs das imagens de um capítulo.
   * @param chapterId - slug ou id interno do capítulo na fonte
   */
  abstract getChapterPages(chapterId: string): Promise<ChapterPage[]>;

  /**
   * Retorna mangás em alta/populares da fonte.
   */
  async getTrending(_limit = 10): Promise<MangaSearchResult[]> {
    return [];
  }

  /**
   * Retorna todos os mangás da fonte (para a página de explorar).
   * Suporta paginação com page e limit.
   */
  async getAllManga(_page = 1, _limit = 50): Promise<MangaSearchResult[]> {
    return [];
  }

  /**
   * Retorna os headers HTTP necessários para fazer proxy das imagens desta fonte.
   * Por padrão retorna apenas o Referer. Sobrescreva quando necessário.
   */
  getImageHeaders(imageUrl: string): Record<string, string> {
    return {
      Referer: this.baseUrl,
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    };
  }
}

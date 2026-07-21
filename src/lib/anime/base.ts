import type {
  AnimeDetail,
  AnimeEpisodeStreams,
  AnimeSearchResult,
} from "@/lib/types";

/**
 * Interface que toda fonte de anime deve implementar.
 * Pararela ao BaseScraper de mangá — domínio de vídeo/episódios.
 */
export abstract class BaseAnimeSource {
  abstract readonly sourceId: string;
  abstract readonly sourceName: string;
  abstract readonly baseUrl: string;
  abstract readonly language: string;

  /** Busca animes pelo nome. */
  abstract search(query: string): Promise<AnimeSearchResult[]>;

  /** Detalhes + lista de episódios (com sinopse quando disponível). */
  abstract getAnimeDetail(animeId: string): Promise<AnimeDetail>;

  /** URLs de stream (HLS/MP4) de um episódio. */
  abstract getEpisodeStreams(episodeId: string): Promise<AnimeEpisodeStreams>;

  async getTrending(_limit = 12): Promise<AnimeSearchResult[]> {
    return [];
  }
}

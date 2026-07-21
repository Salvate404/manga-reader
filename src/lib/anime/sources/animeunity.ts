import type {
  AnimeDetail,
  AnimeEpisode,
  AnimeEpisodeStreams,
  AnimeSearchResult,
} from "@/lib/types";
import { BaseAnimeSource } from "@/lib/anime/base";

type ConsumetSearchResult = {
  id: string;
  title: string;
  image?: string;
  url?: string;
  releaseDate?: string;
  status?: string;
};

type ConsumetEpisode = {
  id: string;
  number: number;
  title?: string;
  image?: string;
  description?: string;
};

type ConsumetInfo = {
  id: string;
  title: string;
  image?: string;
  cover?: string;
  description?: string;
  status?: string;
  genres?: string[];
  releaseDate?: string;
  totalEpisodes?: number;
  episodes?: ConsumetEpisode[];
};

type ConsumetSource = {
  url: string;
  quality?: string;
  isM3U8?: boolean;
  isDASH?: boolean;
};

type ConsumetSubtitle = {
  url: string;
  lang: string;
};

function mapStatus(status?: string): AnimeDetail["status"] {
  const s = (status || "").toLowerCase();
  if (s.includes("ongoing") || s.includes("releasing") || s.includes("airing")) return "ongoing";
  if (s.includes("completed") || s.includes("finished")) return "completed";
  if (s.includes("hiatus")) return "hiatus";
  return "unknown";
}

function stripHtml(html?: string): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Codifica id de episódio com `/` para uso em rotas Next. */
export function encodeEpisodeId(id: string): string {
  return id.replace(/\//g, "__");
}

export function decodeEpisodeId(id: string): string {
  return id.replace(/__/g, "/");
}

/**
 * AnimeUnity — melhor provedor de stream estável via @consumet/extensions
 * (HiAnime/Zoro frequentemente retornam 522).
 */
export class AnimeUnitySource extends BaseAnimeSource {
  readonly sourceId = "animeunity";
  readonly sourceName = "AnimeUnity";
  readonly baseUrl = "https://www.animeunity.so";
  readonly language = "IT";

  private async provider() {
    const { ANIME } = await import("@consumet/extensions");
    return new ANIME.AnimeUnity();
  }

  async search(query: string): Promise<AnimeSearchResult[]> {
    const provider = await this.provider();
    const data = await provider.search(query);
    const results = (data.results ?? []) as ConsumetSearchResult[];

    return results.map((item) => ({
      sourceId: this.sourceId,
      sourceName: this.sourceName,
      animeId: item.id,
      title: item.title,
      cover: item.image || null,
      url: item.url || `${this.baseUrl}/anime/${item.id}`,
      status: mapStatus(item.status),
      year: item.releaseDate ? Number(item.releaseDate) || undefined : undefined,
    }));
  }

  async getTrending(_limit = 12): Promise<AnimeSearchResult[]> {
    // Sem endpoint de trending confiável — AniList cobre os destaques
    return [];
  }

  async getAnimeDetail(animeId: string): Promise<AnimeDetail> {
    const provider = await this.provider();
    const info = (await provider.fetchAnimeInfo(animeId)) as ConsumetInfo;
    const episodes: AnimeEpisode[] = (info.episodes ?? []).map((ep) => ({
      id: encodeEpisodeId(ep.id),
      number: ep.number,
      title: ep.title || `Episódio ${ep.number}`,
      description: stripHtml(ep.description),
      thumbnail: ep.image || null,
      url: `${this.baseUrl}/anime/${animeId}`,
    }));

    return {
      sourceId: this.sourceId,
      animeId: info.id || animeId,
      title: info.title,
      cover: info.image || info.cover || null,
      banner: info.cover || null,
      description: stripHtml(info.description),
      status: mapStatus(info.status),
      genres: info.genres,
      year: info.releaseDate ? Number(info.releaseDate) || undefined : undefined,
      episodeCount: info.totalEpisodes ?? episodes.length,
      episodes,
    };
  }

  async getEpisodeStreams(episodeId: string): Promise<AnimeEpisodeStreams> {
    const provider = await this.provider();
    const rawId = decodeEpisodeId(episodeId);
    const data = await provider.fetchEpisodeSources(rawId);
    const sources = ((data.sources ?? []) as ConsumetSource[]).map((s) => ({
      url: s.url,
      quality: s.quality || "auto",
      isM3U8: s.isM3U8 ?? s.url.includes(".m3u8"),
      isDASH: s.isDASH,
    }));
    const subtitles = ((data.subtitles ?? []) as ConsumetSubtitle[]).map((s) => ({
      url: s.url,
      lang: s.lang,
      label: s.lang,
    }));

    if (!sources.length) throw new Error("Nenhuma fonte de vídeo encontrada");

    return {
      sources,
      subtitles,
      headers: (data.headers as Record<string, string> | undefined) ?? undefined,
    };
  }
}

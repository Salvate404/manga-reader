import type {
  AnimeDetail,
  AnimeEpisode,
  AnimeEpisodeStreams,
  AnimeSearchResult,
} from "@/lib/types";
import { BaseAnimeSource } from "@/lib/anime/base";
import { translateGenres } from "@/lib/anime/i18n";

const ANILIST_URL = "https://graphql.anilist.co";
const ANIZIP_URL = "https://api.ani.zip/mappings";

type AnilistMedia = {
  id: number;
  siteUrl?: string;
  episodes?: number | null;
  status?: string | null;
  format?: string | null;
  averageScore?: number | null;
  seasonYear?: number | null;
  season?: string | null;
  description?: string | null;
  genres?: string[] | null;
  coverImage?: { large?: string | null; extraLarge?: string | null } | null;
  bannerImage?: string | null;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  } | null;
  studios?: { nodes?: { name: string }[] } | null;
};

type AniZipEpisode = {
  title?: Record<string, string>;
  overview?: string;
  image?: string;
  runtime?: number;
  airDate?: string;
};

function pickTitle(title?: AnilistMedia["title"]): string {
  return title?.english || title?.romaji || title?.native || "Sem título";
}

function mapStatus(status?: string | null): AnimeDetail["status"] {
  switch (status) {
    case "RELEASING":
      return "ongoing";
    case "FINISHED":
      return "completed";
    case "HIATUS":
      return "hiatus";
    default:
      return "unknown";
  }
}

function stripHtml(html?: string | null): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?i>/gi, "")
    .replace(/<\/?b>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function anilistQuery<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error("AniList sem dados");
  return json.data;
}

async function fetchAniZipEpisodes(anilistId: string): Promise<Map<number, AniZipEpisode>> {
  const map = new Map<number, AniZipEpisode>();
  try {
    const res = await fetch(`${ANIZIP_URL}?anilist_id=${anilistId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return map;
    const json = (await res.json()) as { episodes?: Record<string, AniZipEpisode> };
    for (const [key, ep] of Object.entries(json.episodes ?? {})) {
      const num = Number(key);
      if (!Number.isFinite(num) || num <= 0) continue;
      map.set(num, ep);
    }
  } catch {
    // opcional
  }
  return map;
}

function mediaToSearchResult(media: AnilistMedia): AnimeSearchResult {
  return {
    sourceId: "anilist",
    sourceName: "AniList",
    animeId: String(media.id),
    title: pickTitle(media.title),
    cover: media.coverImage?.extraLarge || media.coverImage?.large || null,
    url: media.siteUrl || `https://anilist.co/anime/${media.id}`,
    episodeCount: media.episodes ?? undefined,
    status: mapStatus(media.status),
    genres: translateGenres(media.genres),
    format: media.format ?? undefined,
    score: media.averageScore ? media.averageScore / 10 : undefined,
    year: media.seasonYear ?? undefined,
    audioType: "unknown",
  };
}

/**
 * Catálogo AniList (metadados). Não hospeda vídeo.
 * Play só via resolve estrito em fontes PT-BR (feito no anime-service).
 */
export class AnilistSource extends BaseAnimeSource {
  readonly sourceId = "anilist";
  readonly sourceName = "AniList";
  readonly baseUrl = "https://anilist.co";
  readonly language = "PT-BR";

  async search(query: string): Promise<AnimeSearchResult[]> {
    const data = await anilistQuery<{
      Page: { media: AnilistMedia[] };
    }>(
      `query ($search: String) {
        Page(page: 1, perPage: 20) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id
            siteUrl
            episodes
            status
            format
            averageScore
            seasonYear
            genres
            coverImage { large extraLarge }
            title { romaji english native }
          }
        }
      }`,
      { search: query }
    );
    return (data.Page.media ?? []).map(mediaToSearchResult);
  }

  /** Não aparece no trending — evita clique em catálogo sem host de vídeo. */
  async getTrending(_limit = 12): Promise<AnimeSearchResult[]> {
    return [];
  }

  async getAnimeDetail(animeId: string): Promise<AnimeDetail> {
    const data = await anilistQuery<{ Media: AnilistMedia }>(
      `query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          siteUrl
          episodes
          status
          format
          averageScore
          seasonYear
          season
          description(asHtml: false)
          genres
          bannerImage
          coverImage { large extraLarge }
          title { romaji english native }
          studios(isMain: true) { nodes { name } }
        }
      }`,
      { id: Number(animeId) }
    );

    const media = data.Media;
    if (!media) throw new Error("Anime não encontrado no AniList");

    const zip = await fetchAniZipEpisodes(animeId);
    const total =
      media.episodes && media.episodes > 0
        ? media.episodes
        : zip.size > 0
          ? Math.max(...zip.keys())
          : 0;

    const episodes: AnimeEpisode[] = [];
    for (let n = 1; n <= total; n++) {
      const meta = zip.get(n);
      const title =
        meta?.title?.["pt-BR"] ||
        meta?.title?.pt ||
        meta?.title?.en ||
        meta?.title?.ja ||
        `Episódio ${n}`;

      episodes.push({
        id: `${animeId}:${n}`,
        number: n,
        title,
        description: meta?.overview?.trim() || undefined,
        thumbnail: meta?.image || null,
        duration: meta?.runtime,
        airedAt: meta?.airDate,
        url: `https://anilist.co/anime/${animeId}`,
      });
    }

    return {
      sourceId: this.sourceId,
      animeId: String(media.id),
      title: pickTitle(media.title),
      cover: media.coverImage?.extraLarge || media.coverImage?.large || null,
      banner: media.bannerImage || null,
      description: stripHtml(media.description),
      status: mapStatus(media.status),
      genres: translateGenres(media.genres),
      studios: media.studios?.nodes?.map((s) => s.name),
      format: media.format ?? undefined,
      score: media.averageScore ? media.averageScore / 10 : undefined,
      year: media.seasonYear ?? undefined,
      season: media.season ?? undefined,
      episodeCount: media.episodes ?? episodes.length,
      episodes,
      audioType: "unknown",
    };
  }

  /**
   * AniList não tem CDN próprio — o anime-service resolve em hosts PT-BR.
   * Mantém método por contrato; falha de propósito se chamado isolado sem resolve.
   */
  async getEpisodeStreams(_episodeId: string): Promise<AnimeEpisodeStreams> {
    throw new Error(
      "AniList é só catálogo. Use uma fonte PT-BR (AnimeFire, Goyabu ou AnimesOnline)."
    );
  }
}

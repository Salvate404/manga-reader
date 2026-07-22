import { getAllAnimeSources, getAnimeSourceById } from "@/lib/anime/registry";
import { titleMatchScore } from "@/lib/anime/title-match";
import type {
  AnimeAudioType,
  AnimeDetail,
  AnimeEpisodeStreams,
  AnimeSearchApiResponse,
  AnimeSearchResult,
} from "@/lib/types";

export interface AnimeTrendingSection {
  sourceId: string;
  sourceName: string;
  items: AnimeSearchResult[];
}

/** Fontes que hospedam o vídeo de verdade (não só catálogo). */
const STREAM_HOSTS = new Set(["animefire", "goyabu", "animesonline"]);

/** Hosts PT-BR usados no fallback cruzado. */
const CROSS_SOURCE_HOSTS = new Set(["animefire", "goyabu", "animesonline"]);

export async function searchAnime(
  query: string,
  sourceIds?: string[]
): Promise<AnimeSearchApiResponse> {
  const sources = getAllAnimeSources().filter(
    (s) => !sourceIds || sourceIds.includes(s.sourceId)
  );

  const settled = await Promise.allSettled(sources.map((s) => s.search(query)));

  const results: AnimeSearchResult[] = [];
  const sourceErrors: { sourceId: string; error: string }[] = [];

  settled.forEach((item, i) => {
    if (item.status === "fulfilled") {
      results.push(...item.value);
    } else {
      sourceErrors.push({
        sourceId: sources[i].sourceId,
        error:
          item.reason instanceof Error
            ? item.reason.message
            : "Erro desconhecido",
      });
    }
  });

  return { results, sourceErrors };
}

export async function getAnimeDetail(
  sourceId: string,
  animeId: string
): Promise<AnimeDetail | null> {
  const source = getAnimeSourceById(sourceId);
  if (!source) return null;
  try {
    return await source.getAnimeDetail(animeId);
  } catch {
    return null;
  }
}

function audioMatches(
  result: AnimeSearchResult,
  prefer?: AnimeAudioType | "all" | "unknown"
): boolean {
  if (!prefer || prefer === "all" || prefer === "unknown") return true;
  if (!result.audioType || result.audioType === "unknown") return true;
  return result.audioType === prefer;
}

async function resolveStrictCrossSourceStreams(
  title: string,
  episodeNumber: number,
  audioType?: AnimeAudioType | "all" | "unknown"
): Promise<AnimeEpisodeStreams | null> {
  const hosts = getAllAnimeSources().filter((s) =>
    CROSS_SOURCE_HOSTS.has(s.sourceId)
  );
  const MIN_SCORE = 90;

  for (const source of hosts) {
    try {
      const results = (await source.search(title)).filter((r) =>
        audioMatches(r, audioType)
      );
      const ranked = results
        .map((r) => ({ r, score: titleMatchScore(r.title, title) }))
        .filter((x) => x.score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score);

      if (!ranked.length) continue;

      const best = ranked[0].r;
      const detail = await source.getAnimeDetail(best.animeId);
      const episode = detail.episodes.find((e) => e.number === episodeNumber);
      if (!episode) continue;

      const streams = await source.getEpisodeStreams(episode.id);
      if (!streams.sources.length) continue;

      return {
        ...streams,
        sources: streams.sources.map((s) => ({
          ...s,
          quality: `${s.quality} · ${source.sourceName}`,
        })),
      };
    } catch {
      // próxima fonte
    }
  }

  return null;
}

/**
 * Stream sempre na mesma fonte do card/página.
 * Só AniList (catálogo) pode cruzar para hosts PT-BR — e com match estrito.
 */
export async function getAnimeStreams(
  sourceId: string,
  episodeId: string,
  opts?: {
    title?: string;
    episodeNumber?: number;
    audioType?: AnimeAudioType | "all" | "unknown";
  }
): Promise<AnimeEpisodeStreams | null> {
  const primary = getAnimeSourceById(sourceId);
  if (!primary) return null;

  if (STREAM_HOSTS.has(sourceId)) {
    try {
      const streams = await primary.getEpisodeStreams(episodeId);
      if (streams.sources.length) return streams;
    } catch {
      try {
        const streams = await primary.getEpisodeStreams(episodeId);
        if (streams.sources.length) return streams;
      } catch {
        return null;
      }
    }
    return null;
  }

  const title = opts?.title?.trim();
  const epNum = opts?.episodeNumber;
  if (title && epNum != null && Number.isFinite(epNum)) {
    return resolveStrictCrossSourceStreams(title, epNum, opts?.audioType);
  }

  return null;
}

export async function findSameAnimeElsewhere(
  title: string,
  currentSourceId: string,
  audioType?: AnimeAudioType | "unknown"
): Promise<AnimeSearchResult[]> {
  const hosts = getAllAnimeSources().filter(
    (s) => CROSS_SOURCE_HOSTS.has(s.sourceId) && s.sourceId !== currentSourceId
  );
  const out: AnimeSearchResult[] = [];

  await Promise.all(
    hosts.map(async (source) => {
      try {
        const results = await source.search(title);
        const best = results
          .filter((r) => audioMatches(r, audioType))
          .map((r) => ({ r, score: titleMatchScore(r.title, title) }))
          .filter((x) => x.score >= 90)
          .sort((a, b) => b.score - a.score)[0];
        if (best) out.push(best.r);
      } catch {
        // ignora
      }
    })
  );

  return out;
}

export async function getAnimeTrending(): Promise<AnimeTrendingSection[]> {
  const hosts = getAllAnimeSources().filter((s) => STREAM_HOSTS.has(s.sourceId));

  const settled = await Promise.allSettled(
    hosts.map(async (source) => {
      const items = await source.getTrending(12);
      return {
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        items,
      } satisfies AnimeTrendingSection;
    })
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<AnimeTrendingSection> =>
        r.status === "fulfilled" && r.value.items.length > 0
    )
    .map((r) => r.value);
}

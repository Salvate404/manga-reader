import { dramaShorts } from "@/lib/shorts/dramashorts";
import { flexTv } from "@/lib/shorts/flextv";
import { shortDrama } from "@/lib/shorts/shortdrama";
import type {
  AnimeEpisodeStreams,
  ShortDetail,
  ShortSearchResult,
} from "@/lib/types";

export type ShortsSourceId = "flextv" | "dramashorts" | "shortdrama";

const sources = {
  flextv: flexTv,
  dramashorts: dramaShorts,
  shortdrama: shortDrama,
} as const;

function isShortsSourceId(id: string): id is ShortsSourceId {
  return id === "flextv" || id === "dramashorts" || id === "shortdrama";
}

export function getShortsSource(sourceId: string) {
  if (isShortsSourceId(sourceId)) {
    return sources[sourceId];
  }
  return undefined;
}

export function getShortsSourceList() {
  return Object.values(sources).map((s) => ({
    id: s.sourceId,
    name: s.sourceName,
    baseUrl: s.baseUrl,
    language: s.language,
  }));
}

export async function searchShorts(
  query: string,
  sourceIds?: string[]
): Promise<{
  results: ShortSearchResult[];
  sourceErrors: { sourceId: string; error: string }[];
}> {
  const ids = (sourceIds?.length
    ? sourceIds
    : (["flextv", "dramashorts"] as ShortsSourceId[])
  ).filter(isShortsSourceId);

  const settled = await Promise.allSettled(
    ids.map(async (id) => ({ id, items: await sources[id].search(query) }))
  );

  const results: ShortSearchResult[] = [];
  const sourceErrors: { sourceId: string; error: string }[] = [];

  settled.forEach((item, i) => {
    if (item.status === "fulfilled") {
      results.push(...item.value.items);
    } else {
      sourceErrors.push({
        sourceId: ids[i],
        error:
          item.reason instanceof Error
            ? item.reason.message
            : "Erro desconhecido",
      });
    }
  });

  return { results, sourceErrors };
}

export interface ShortsTrendingSection {
  sourceId: ShortsSourceId;
  sourceName: string;
  items: ShortSearchResult[];
}

/** Destaques por fonte (DramaShorts e FlexTV em PT; ShortDrama em EN). */
export async function getShortsTrending(
  limit = 16
): Promise<ShortsTrendingSection[]> {
  const order: ShortsSourceId[] = ["dramashorts", "flextv", "shortdrama"];

  const settled = await Promise.allSettled(
    order.map(async (id) => {
      const source = sources[id];
      const items = await source.getTrending(limit);
      return {
        sourceId: id,
        sourceName:
          id === "flextv"
            ? "FlexTV · PT-BR"
            : id === "dramashorts"
              ? "DramaShorts · PT-BR"
              : "ShortDrama · EN",
        items,
      } satisfies ShortsTrendingSection;
    })
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<ShortsTrendingSection> =>
        r.status === "fulfilled" && r.value.items.length > 0
    )
    .map((r) => r.value);
}

export async function getShortDetail(
  sourceId: string,
  seriesId: string
): Promise<ShortDetail | null> {
  const source = getShortsSource(sourceId);
  if (!source) return null;
  try {
    return await source.getDetail(seriesId);
  } catch {
    return null;
  }
}

export async function getShortStreams(
  sourceId: string,
  episodeId: string
): Promise<AnimeEpisodeStreams | null> {
  const source = getShortsSource(sourceId);
  if (!source) return null;
  return source.getEpisodeStreams(episodeId);
}

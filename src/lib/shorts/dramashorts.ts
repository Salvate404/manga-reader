import type {
  AnimeEpisode,
  AnimeEpisodeStreams,
  ShortDetail,
  ShortSearchResult,
} from "@/lib/types";

const API = "https://web-api.dramashorts.io/v1";
const SITE = "https://dramashorts.io";
const CDN = "https://cdn.dramashorts.io";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function toSnake(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
      v,
    ])
  );
}

type ApiEnvelope<T> = { result?: T; error?: { message?: string } };

async function apiPost<T>(
  path: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Origin: SITE,
      Referer: `${SITE}/pt`,
      Authorization: "",
      "X-Interface-Language": "pt",
      "X-OS": "web",
      "X-OS-Version": "1.0.0",
      "X-App-Version": "1.0.0",
    },
    body: JSON.stringify({ data: toSnake(data) }),
    next: { revalidate: 300 },
  });

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.error) {
    throw new Error(
      json.error?.message || `DramaShorts ${path} HTTP ${res.status}`
    );
  }
  if (json.result === undefined) {
    throw new Error(`DramaShorts ${path}: resposta vazia`);
  }
  return json.result;
}

type DsMovie = {
  id?: string;
  title?: string;
  description?: string;
  episodes_count?: number;
  images?: { cover?: string; cover_with_title?: string };
  genre?: { title?: string };
};

type DsEpisodeRow = {
  episode?: {
    id?: string;
    index?: number;
    duration?: number;
    cover_url?: string;
  };
  user_episode?: { status?: string };
};

type DsAccess =
  | { type: "content"; payload?: { video_url?: string } }
  | { type: "paywall"; payload?: unknown };

function coverOf(m: DsMovie): string | null {
  return m.images?.cover || m.images?.cover_with_title || null;
}

function toSearchResult(m: DsMovie): ShortSearchResult | null {
  if (!m.id || !m.title) return null;
  return {
    sourceId: "dramashorts",
    sourceName: "DramaShorts",
    seriesId: m.id,
    title: m.title,
    cover: coverOf(m),
    url: `${SITE}/pt/shorts/${m.id}`,
    episodeCount: m.episodes_count,
    format: m.genre?.title || "Short Drama",
  };
}

function parseEpisodeId(
  episodeId: string
): { movieId: string; ep: number } | null {
  const m = episodeId.match(/^(.+):(\d+)$/);
  if (!m) return null;
  const ep = Number(m[2]);
  if (!Number.isFinite(ep) || ep < 1) return null;
  return { movieId: m[1], ep };
}

/** Extrai chaves CDN a partir da capa do episódio. */
function streamFromCover(coverUrl: string | undefined): string | null {
  if (!coverUrl) return null;
  const m = coverUrl.match(/episodes-previews\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return `${CDN}/video/${m[1]}/${m[2]}/manifest.m3u8`;
}

/** DramaShorts — short dramas em português (dramashorts.io/pt). */
export const dramaShorts = {
  sourceId: "dramashorts" as const,
  sourceName: "DramaShorts" as const,
  baseUrl: SITE,
  language: "PT-BR" as const,

  async search(query: string): Promise<ShortSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const result = await apiPost<{ data?: DsMovie[] }>("web-movie-search", {
      query: q,
      page: 1,
      size: 24,
    });
    return (result.data || [])
      .map(toSearchResult)
      .filter((x): x is ShortSearchResult => !!x);
  },

  async getTrending(limit = 16): Promise<ShortSearchResult[]> {
    type Block = { type?: string; data?: { movies?: DsMovie[] } };
    const blocks = await apiPost<Block[]>("web-discover-get", {});
    const seen = new Set<string>();
    const out: ShortSearchResult[] = [];
    for (const block of blocks || []) {
      for (const m of block.data?.movies || []) {
        if (!m.id || seen.has(m.id)) continue;
        seen.add(m.id);
        const item = toSearchResult(m);
        if (item) out.push(item);
        if (out.length >= limit) return out;
      }
    }
    if (out.length > 0) return out;

    const list = await apiPost<{ data?: DsMovie[] }>("web-movie-list", {
      page: 1,
      size: limit,
    });
    return (list.data || [])
      .map(toSearchResult)
      .filter((x): x is ShortSearchResult => !!x)
      .slice(0, limit);
  },

  async getDetail(seriesId: string): Promise<ShortDetail> {
    const id = decodeURIComponent(seriesId);
    const [movieWrap, episodeRows] = await Promise.all([
      apiPost<{ movie?: DsMovie }>("web-movie-get", { movieId: id }),
      apiPost<DsEpisodeRow[]>("web-episode-list", { movieId: id }),
    ]);

    const movie = movieWrap.movie || { id, title: id };
    const episodes = (episodeRows || [])
      .flatMap((row): AnimeEpisode[] => {
        const n = Number(row.episode?.index);
        if (!row.episode?.id || !Number.isFinite(n) || n < 1) return [];
        return [
          {
            id: `${id}:${n}`,
            number: n,
            title: `Episódio ${n}`,
          },
        ];
      })
      .sort((a, b) => a.number - b.number);

    return {
      sourceId: "dramashorts",
      seriesId: movie.id || id,
      title: movie.title || id,
      cover: coverOf(movie),
      description: movie.description,
      episodeCount: movie.episodes_count || episodes.length,
      episodes,
      format: movie.genre?.title
        ? `Short Drama · ${movie.genre.title}`
        : "Short Drama · DramaShorts",
    };
  },

  async getEpisodeStreams(episodeId: string): Promise<AnimeEpisodeStreams> {
    const parsed = parseEpisodeId(decodeURIComponent(episodeId));
    if (!parsed) throw new Error(`DramaShorts episódio inválido: ${episodeId}`);

    const rows = await apiPost<DsEpisodeRow[]>("web-episode-list", {
      movieId: parsed.movieId,
    });
    const row = (rows || []).find(
      (r) => Number(r.episode?.index) === parsed.ep
    );
    const epUuid = row?.episode?.id;
    if (!epUuid) {
      throw new Error(`DramaShorts: episódio ${parsed.ep} não encontrado`);
    }

    let videoUrl: string | null = null;
    try {
      const access = await apiPost<DsAccess>("web-episode-access", {
        movieId: parsed.movieId,
        episodeId: epUuid,
      });
      if (access.type === "content" && access.payload?.video_url) {
        videoUrl = access.payload.video_url;
      }
    } catch {
      // fallback via CDN abaixo
    }

    if (!videoUrl) {
      videoUrl = streamFromCover(row?.episode?.cover_url);
    }
    if (!videoUrl) {
      throw new Error(
        "Episódio bloqueado ou sem URL de vídeo na fonte (DramaShorts)"
      );
    }

    return {
      sources: [
        {
          url: videoUrl,
          quality: "HLS",
          isM3U8: true,
        },
      ],
      headers: {
        Referer: `${SITE}/`,
        Origin: SITE,
      },
    };
  },
};

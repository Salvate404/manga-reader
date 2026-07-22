import * as cheerio from "cheerio";
import type {
  AnimeEpisode,
  AnimeEpisodeStreams,
  ShortDetail,
  ShortSearchResult,
} from "@/lib/types";

const BASE = "https://shortdrama.st";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function absUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function slugFromSeriesHref(href: string): string | null {
  const m = href.match(/\/series\/([^/?#]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function parseEpisodeId(episodeId: string): { slug: string; ep: number } | null {
  const m = episodeId.match(/^(.+):(\d+)$/);
  if (!m) return null;
  const ep = Number(m[2]);
  if (!Number.isFinite(ep) || ep < 1) return null;
  return { slug: m[1], ep };
}

function cleanSeriesTitle(raw: string): string {
  return raw
    .replace(/\s*[—–-]\s*Episode\s+\d+\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function sdFetch(path: string): Promise<Response> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  return fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: `${BASE}/`,
    },
    next: { revalidate: 300 },
  });
}

function parseBrowseCards(html: string): ShortSearchResult[] {
  const $ = cheerio.load(html);
  const results: ShortSearchResult[] = [];
  const seen = new Set<string>();

  $(".drama-card").each((_, el) => {
    const a = $(el).find("a[href*='/series/']").first();
    const href = a.attr("href") || "";
    const slug = slugFromSeriesHref(href);
    if (!slug || seen.has(slug)) return;

    const title =
      cleanSeriesTitle(
        $(el).find(".drama-title, .title, h3, h2").first().text() ||
          a.attr("title") ||
          a.attr("aria-label") ||
          ""
      ) || slug.replace(/-/g, " ");

    const img =
      $(el).find("img").attr("src") ||
      $(el).find("img").attr("data-src") ||
      null;

    seen.add(slug);
    results.push({
      sourceId: "shortdrama",
      sourceName: "ShortDrama",
      seriesId: slug,
      title,
      cover: absUrl(img),
      url: `${BASE}/series/${slug}`,
      format: "Short Drama",
    });
  });

  if (results.length) return results;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "");
      const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
      for (const node of graph) {
        const list = node?.mainEntity?.itemListElement;
        if (!Array.isArray(list)) continue;
        for (const item of list) {
          const url = String(item?.url || "");
          const slug = slugFromSeriesHref(url);
          if (!slug || seen.has(slug)) continue;
          seen.add(slug);
          results.push({
            sourceId: "shortdrama",
            sourceName: "ShortDrama",
            seriesId: slug,
            title: cleanSeriesTitle(String(item?.name || slug)),
            cover: null,
            url: `${BASE}/series/${slug}`,
            format: "Short Drama",
          });
        }
      }
    } catch {
      // ignora JSON inválido
    }
  });

  return results;
}

function parsePlayerPage(html: string, slug: string) {
  const $ = cheerio.load(html);
  const player = $("#player");
  const totalRaw = player.attr("data-total-episodes");
  const total = totalRaw ? Number(totalRaw) : NaN;
  const dataSrc = player.attr("data-src") || null;
  const platform = player.attr("data-platform") || undefined;
  const poster =
    absUrl(player.attr("data-poster")) ||
    absUrl($('meta[property="og:image"]').attr("content")) ||
    null;
  const title = cleanSeriesTitle(
    $("h1").first().text() ||
      $('meta[property="og:title"]').attr("content") ||
      slug
  );
  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    undefined;

  return {
    title,
    description,
    cover: poster,
    platform,
    total: Number.isFinite(total) && total > 0 ? total : 1,
    streamPath: dataSrc,
  };
}

/** ShortDrama.st — mini-dramas (DramaBox, ReelShort, etc.). */
export const shortDrama = {
  sourceId: "shortdrama" as const,
  sourceName: "ShortDrama" as const,
  baseUrl: BASE,
  language: "EN" as const,

  async search(query: string): Promise<ShortSearchResult[]> {
    const q = encodeURIComponent(query.trim());
    const res = await sdFetch(`/browse?q=${q}`);
    if (!res.ok) throw new Error(`ShortDrama busca HTTP ${res.status}`);
    return parseBrowseCards(await res.text());
  },

  async getTrending(limit = 12): Promise<ShortSearchResult[]> {
    const res = await sdFetch("/browse?sort=views");
    if (!res.ok) throw new Error(`ShortDrama trending HTTP ${res.status}`);
    return parseBrowseCards(await res.text()).slice(0, limit);
  },

  async getDetail(seriesId: string): Promise<ShortDetail> {
    const slug = decodeURIComponent(seriesId);
    const res = await sdFetch(`/series/${encodeURIComponent(slug)}/1`);
    if (!res.ok) throw new Error(`ShortDrama detalhe HTTP ${res.status}`);

    const parsed = parsePlayerPage(await res.text(), slug);
    const episodes: AnimeEpisode[] = [];
    for (let n = 1; n <= parsed.total; n++) {
      episodes.push({
        id: `${slug}:${n}`,
        number: n,
        title: `Episódio ${n}`,
        url: `${BASE}/series/${slug}/${n}`,
      });
    }

    return {
      sourceId: "shortdrama",
      seriesId: slug,
      title: parsed.title,
      cover: parsed.cover,
      description: parsed.description,
      episodeCount: parsed.total,
      episodes,
      format: parsed.platform
        ? `Short Drama · ${parsed.platform}`
        : "Short Drama",
    };
  },

  async getEpisodeStreams(episodeId: string): Promise<AnimeEpisodeStreams> {
    const parsedId = parseEpisodeId(decodeURIComponent(episodeId));
    if (!parsedId) {
      throw new Error(`ShortDrama episódio inválido: ${episodeId}`);
    }

    const res = await sdFetch(
      `/series/${encodeURIComponent(parsedId.slug)}/${parsedId.ep}`
    );
    if (!res.ok) throw new Error(`ShortDrama stream HTTP ${res.status}`);

    const { streamPath } = parsePlayerPage(await res.text(), parsedId.slug);
    const url = absUrl(streamPath);
    if (!url) {
      throw new Error("ShortDrama: playlist HLS não encontrada");
    }

    return {
      sources: [{ url, quality: "HLS", isM3U8: true }],
      headers: { Referer: `${BASE}/` },
    };
  },
};

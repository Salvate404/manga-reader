import * as cheerio from "cheerio";
import type {
  AnimeAudioType,
  AnimeDetail,
  AnimeEpisode,
  AnimeEpisodeStreams,
  AnimeSearchResult,
} from "@/lib/types";
import { BaseAnimeSource } from "@/lib/anime/base";

const BASE = "https://animefire.io";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function detectAudioType(titleOrSlug: string): AnimeAudioType {
  const t = titleOrSlug.toLowerCase();
  if (t.includes("dublado")) return "dublado";
  if (t.includes("legendado")) return "legendado";
  return "legendado";
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*Epis[oó]dio\s+\d+\s*$/i, "")
    .replace(/\s*-\s*Todos os Epis[oó]dios\s*$/i, "")
    .replace(/\s*-\s*(Filme|OVA|Especial).*$/i, "")
    .trim();
}

function extractScore(text: string): number | undefined {
  const m = text.match(/(\d+[.,]\d+)/);
  if (!m) return undefined;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function mapStatus(raw?: string): AnimeDetail["status"] {
  const s = (raw || "").toLowerCase();
  if (s.includes("completo") || s.includes("finalizado")) return "completed";
  if (s.includes("lançamento") || s.includes("lancamento") || s.includes("em andamento"))
    return "ongoing";
  if (s.includes("hiato")) return "hiatus";
  return "unknown";
}

/** slug de página completa → slug de vídeo/episódio */
export function pageSlugToVideoSlug(pageSlug: string): string {
  return pageSlug
    .replace(/-todos-os-episodios$/i, "")
    .replace(/\/\d+$/, "")
    .replace(/\/$/, "");
}

export function animeFireCoverUrl(pageSlug: string): string {
  return `${BASE}/img/animes/${pageSlugToVideoSlug(pageSlug)}.webp`;
}

async function afFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json,*/*",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Referer: `${BASE}/`,
      ...(init?.headers || {}),
    },
    next: { revalidate: 300 },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickCover($card: any, pageSlug: string): string {
  const img = $card.find("img").first();
  const raw =
    (img.attr("data-src") as string | undefined) ||
    (img.attr("data-lazy-src") as string | undefined) ||
    (img.attr("src") as string | undefined) ||
    "";
  if (!raw || raw.startsWith("data:") || raw.includes("/img/video/")) {
    return animeFireCoverUrl(pageSlug);
  }
  return raw.startsWith("http") ? raw : `${BASE}${raw}`;
}

function parseSearchCard($: cheerio.Root, el: cheerio.Element): AnimeSearchResult | null {
  const a = $(el).find('a[href*="/animes/"]').first();
  const href = a.attr("href");
  if (!href) return null;

  const url = href.startsWith("http") ? href : `${BASE}${href}`;
  let pageSlug = url.split("/animes/")[1]?.replace(/\/$/, "");
  if (!pageSlug) return null;

  // links de episódio: slug/3 → página do anime
  if (/\/\d+$/.test(pageSlug)) {
    pageSlug = `${pageSlugToVideoSlug(pageSlug)}-todos-os-episodios`;
  }

  const imgEl = $(el);
  const alt = $(el).find("img").attr("alt") || "";
  const rawText = (alt || a.text()).replace(/\s+/g, " ").trim();
  const titleMatch = rawText.match(/^(.*?)(?:\s+\d+[.,]\d+)?(?:\s+A\d+)?$/);
  let title = cleanTitle(titleMatch?.[1] || rawText);
  const audioType = detectAudioType(`${title} ${pageSlug}`);
  if (audioType === "dublado" && !/\(dublado\)/i.test(title)) {
    title = `${title.replace(/\s*\(dublado\)/i, "")} (Dublado)`.trim();
  } else if (audioType === "legendado" && !/\(legendado\)/i.test(title) && !/\(dublado\)/i.test(title)) {
    // só marca legendado se não for óbvio demais na listagem — mantém limpo
  }

  return {
    sourceId: "animefire",
    sourceName: "AnimeFire",
    animeId: pageSlug,
    title,
    cover: pickCover(imgEl, pageSlug),
    url: `${BASE}/animes/${pageSlug}`,
    score: extractScore(rawText),
    audioType,
  };
}

/**
 * AnimeFire — fonte PT-BR com dublado e legendado.
 */
export class AnimeFireSource extends BaseAnimeSource {
  readonly sourceId = "animefire";
  readonly sourceName = "AnimeFire";
  readonly baseUrl = BASE;
  readonly language = "PT-BR";

  async search(query: string): Promise<AnimeSearchResult[]> {
    const q = encodeURIComponent(query.trim().toLowerCase().replace(/\s+/g, "-"));
    const res = await afFetch(`/pesquisar/${q}`);
    if (!res.ok) throw new Error(`AnimeFire busca HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: AnimeSearchResult[] = [];
    const seen = new Set<string>();

    $("article.card").each((_, el) => {
      const item = parseSearchCard($, el);
      if (!item || seen.has(item.animeId)) return;
      seen.add(item.animeId);
      results.push(item);
    });

    return results;
  }

  async getTrending(limit = 12): Promise<AnimeSearchResult[]> {
    // /genero/* tem capas reais; a home lista episódios sem capa de anime
    const genres = ["acao", "aventura", "comedia", "fantasia"];
    const results: AnimeSearchResult[] = [];
    const seen = new Set<string>();

    for (const g of genres) {
      if (results.length >= limit) break;
      try {
        const res = await afFetch(`/genero/${g}`);
        if (!res.ok) continue;
        const $ = cheerio.load(await res.text());
        $("article.card").each((_, el) => {
          if (results.length >= limit) return;
          const item = parseSearchCard($, el);
          if (!item || seen.has(item.animeId)) return;
          seen.add(item.animeId);
          results.push(item);
        });
      } catch {
        // tenta próximo gênero
      }
    }

    return results.slice(0, limit);
  }

  async getAnimeDetail(animeId: string): Promise<AnimeDetail> {
    const pageSlug = animeId.includes("todos-os-episodios")
      ? animeId
      : `${pageSlugToVideoSlug(animeId)}-todos-os-episodios`;
    const res = await afFetch(`/animes/${pageSlug}`);
    if (!res.ok) throw new Error(`AnimeFire detalhe HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = cleanTitle($("h1").first().text().trim() || pageSlug);
    const audioType = detectAudioType(`${title} ${pageSlug}`);
    const cover =
      $(".sub_animepage_img img").attr("data-src") ||
      $(".sub_animepage_img img").attr("src") ||
      $(`img[src*="/img/animes/"]`).attr("src") ||
      $(`img[data-src*="/img/animes/"]`).attr("data-src") ||
      animeFireCoverUrl(pageSlug);

    const sinopseRaw = $(".divSinopse")
      .text()
      .replace(/Sinopse\s*:\s*/i, "")
      .trim();

    const infoTexts = $(".spanAnimeInfo")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

    const genreAnchors = $(".animeInfo a")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t && !/^A\d+$/i.test(t));

    const statusText = infoTexts.find((t) =>
      /completo|lançamento|lancamento|hiato|andamento/i.test(t)
    );
    const yearText = infoTexts.find((t) => /^\d{4}$/.test(t));
    const score =
      extractScore($("#anime_score").text()) ?? extractScore(infoTexts.join(" "));
    const studio = infoTexts.find((t) =>
      /studio|pierrot|madhouse|bones|ufotable|mappa|toei|kyoto|a-?1|wit /i.test(t)
    );

    const videoSlug = pageSlugToVideoSlug(pageSlug);
    const epNumbers = new Set<number>();
    $(`a[href*="/animes/${videoSlug}/"]`).each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(
        new RegExp(
          `/animes/${videoSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(\\d+)`
        )
      );
      if (m) epNumbers.add(Number(m[1]));
    });

    if (epNumbers.size === 0) {
      const countHint = infoTexts.find(
        (t) => /^\d{1,4}$/.test(t) && Number(t) > 0 && Number(t) < 3000
      );
      if (countHint) {
        for (let i = 1; i <= Number(countHint); i++) epNumbers.add(i);
      }
    }

    const sorted = [...epNumbers].sort((a, b) => a - b);
    const episodes: AnimeEpisode[] = sorted.map((n) => ({
      id: `${videoSlug}:${n}`,
      number: n,
      title: `Episódio ${n}`,
      url: `${BASE}/animes/${videoSlug}/${n}`,
    }));

    const displayTitle =
      audioType === "dublado" && !/\(dublado\)/i.test(title)
        ? `${title} (Dublado)`
        : audioType === "legendado" && !/\(legendado\)/i.test(title)
          ? `${title} (Legendado)`
          : title;

    return {
      sourceId: this.sourceId,
      animeId: pageSlug,
      title: displayTitle,
      cover: cover.startsWith("http") ? cover : `${BASE}${cover}`,
      description: sinopseRaw || undefined,
      status: mapStatus(statusText),
      genres: [...new Set(genreAnchors)].filter(
        (g) => !["Dublado", "Legendado"].includes(g)
      ),
      studios: studio ? [studio] : undefined,
      score,
      year: yearText ? Number(yearText) : undefined,
      episodeCount: episodes.length || undefined,
      episodes,
      audioType,
    };
  }

  async getEpisodeStreams(episodeId: string): Promise<AnimeEpisodeStreams> {
    const [slug, epStr] = episodeId.split(":");
    const ep = Number(epStr);
    if (!slug || !Number.isFinite(ep)) {
      throw new Error("ID de episódio AnimeFire inválido");
    }

    const videoSlug = pageSlugToVideoSlug(slug);
    const detected = detectAudioType(videoSlug);
    const audioType =
      detected === "dublado" || detected === "legendado" ? detected : undefined;

    // 1) API JSON oficial
    try {
      const res = await afFetch(`/video/${videoSlug}/${ep}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const json = (await res.json()) as {
          data?: { src: string; label: string }[];
          response?: { status?: string };
        };
        if (json.data?.length && json.response?.status !== "500") {
          const sources = json.data
            .filter((d) => d.src)
            .map((d) => ({
              url: d.src.replace(/\\\//g, "/"),
              quality: d.label || "auto",
              isM3U8: d.src.includes(".m3u8"),
              audioType,
            }));
          if (sources.length) {
            return { sources, headers: { Referer: BASE } };
          }
        }
      }
    } catch {
      // cai no fallback HTML
    }

    // 2) Página do episódio (Blogger / mp4 embutido)
    const pageRes = await afFetch(`/animes/${videoSlug}/${ep}`);
    if (!pageRes.ok) throw new Error("Episódio sem vídeo disponível");
    const html = await pageRes.text();
    const $ = cheerio.load(html);

    const sources: AnimeEpisodeStreams["sources"] = [];

    $("[data-video-src]").each((_, el) => {
      const src = $(el).attr("data-video-src");
      if (!src) return;
      sources.push({
        url: src,
        quality: $(el).attr("data-quality") || "auto",
        isM3U8: src.includes(".m3u8"),
        audioType,
      });
    });

    $("video source, video").each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        sources.push({
          url: src,
          quality: "auto",
          isM3U8: src.includes(".m3u8"),
          audioType,
        });
      }
    });

    $("iframe").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (src.includes("blogger.com") || src.includes("blogspot.com")) {
        sources.push({ url: src, quality: "Embed", isEmbed: true, audioType });
      }
    });

    const blogger = html.match(
      /https:\/\/www\.blogger\.com\/video\.g\?token=[A-Za-z0-9_-]+/
    );
    if (blogger) {
      sources.push({ url: blogger[0], quality: "Embed", isEmbed: true, audioType });
    }

    const mp4s = html.match(/https?:[^"'\\\s<>]+\.mp4(?:\?[^"'\\\s<>]*)?/gi) || [];
    for (const u of mp4s.slice(0, 4)) {
      sources.push({ url: u, quality: "MP4", isM3U8: false, audioType });
    }

    if (!sources.length) throw new Error("Episódio sem vídeo disponível");

    // dedupe
    const seen = new Set<string>();
    const unique = sources.filter((s) => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });

    return { sources: unique, headers: { Referer: BASE } };
  }
}

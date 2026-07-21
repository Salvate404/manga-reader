import * as cheerio from "cheerio";
import type {
  AnimeAudioType,
  AnimeDetail,
  AnimeEpisode,
  AnimeEpisodeStreams,
  AnimeSearchResult,
} from "@/lib/types";
import { BaseAnimeSource } from "@/lib/anime/base";

const BASE = "https://animesonline.cloud";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function detectAudio(title: string): AnimeAudioType {
  return /dublado/i.test(title) ? "dublado" : "legendado";
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\s*[–-]\s*Todos os Epis[oó]dios.*$/i, "")
    .trim();
}

async function aoFetch(path: string, init?: RequestInit): Promise<Response> {
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

function extractMp4FromEmbed(embedUrl: string): string | null {
  try {
    const u = new URL(embedUrl);
    const src = u.searchParams.get("source");
    return src ? decodeURIComponent(src) : null;
  } catch {
    return null;
  }
}

/**
 * AnimesOnline.cloud — PT-BR com players Legendado/Dublado (DooPlay ajax).
 */
export class AnimesOnlineSource extends BaseAnimeSource {
  readonly sourceId = "animesonline";
  readonly sourceName = "AnimesOnline";
  readonly baseUrl = BASE;
  readonly language = "PT-BR";

  async search(query: string): Promise<AnimeSearchResult[]> {
    const res = await aoFetch(`/?s=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`AnimesOnline busca HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: AnimeSearchResult[] = [];
    const seen = new Set<string>();

    $(".result-item").each((_, el) => {
      const a = $(el).find("a[href*='/anime/']").first();
      const href = a.attr("href");
      if (!href) return;
      const slug = href.split("/anime/")[1]?.replace(/\/$/, "");
      if (!slug || seen.has(slug)) return;
      seen.add(slug);

      const title = cleanTitle(
        $(el).find(".title a, .title").first().text() || a.text()
      );
      if (!title) return;

      const img =
        $(el).find("img").attr("src") ||
        $(el).find("img").attr("data-src") ||
        null;
      const cover =
        img && !img.startsWith("data:")
          ? img
          : null;

      const audioType = detectAudio(title);
      results.push({
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        animeId: slug,
        title:
          audioType === "dublado" && !/\(dublado\)/i.test(title)
            ? `${title} (Dublado)`
            : title,
        cover,
        url: href.startsWith("http") ? href : `${BASE}${href}`,
        audioType,
      });
    });

    return results;
  }

  async getTrending(limit = 12): Promise<AnimeSearchResult[]> {
    try {
      const res = await aoFetch("/");
      if (!res.ok) return [];
      const $ = cheerio.load(await res.text());
      const results: AnimeSearchResult[] = [];
      const seen = new Set<string>();

      $("article a[href*='/anime/'], .items a[href*='/anime/']").each((_, el) => {
        if (results.length >= limit) return;
        const href = $(el).attr("href");
        if (!href) return;
        const slug = href.split("/anime/")[1]?.replace(/\/$/, "");
        if (!slug || seen.has(slug)) return;
        seen.add(slug);
        const title = cleanTitle($(el).find("img").attr("alt") || $(el).text());
        if (!title || title.length < 2) return;
        const img =
          $(el).find("img").attr("data-src") ||
          $(el).find("img").attr("src") ||
          null;
        results.push({
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          animeId: slug,
          title,
          cover: img && !img.startsWith("data:") ? img : null,
          url: href.startsWith("http") ? href : `${BASE}${href}`,
          audioType: detectAudio(title),
        });
      });

      return results.slice(0, limit);
    } catch {
      return [];
    }
  }

  async getAnimeDetail(animeId: string): Promise<AnimeDetail> {
    const res = await aoFetch(`/anime/${animeId}`);
    if (!res.ok) throw new Error(`AnimesOnline detalhe HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = cleanTitle(
      $("h1").first().text().replace(/^HomeAnimes/i, "").trim() || animeId
    );
    const audioType = detectAudio(title);
    const cover =
      $(".poster img").attr("data-src") ||
      $('meta[property="og:image"]').attr("content") ||
      $(".poster img").attr("src") ||
      null;
    const description =
      $("#info .wp-content p, .description, .wp-content p")
        .first()
        .text()
        .trim() ||
      $('meta[property="og:description"]').attr("content") ||
      undefined;

    const episodes: AnimeEpisode[] = [];
    const seen = new Set<number>();
    $(".episodios a[href*='/episodio/'], #episodes a[href*='/episodio/']").each(
      (_, el) => {
        const href = $(el).attr("href");
        if (!href || !href.includes("/episodio/")) return;
        const slug = href.split("/episodio/")[1]?.replace(/\/$/, "");
        if (!slug) return;
        const numMatch =
          slug.match(/episodio-0*(\d+)/i) ||
          $(el).text().match(/(\d+)/) ||
          slug.match(/(\d+)/);
        const num = numMatch ? Number(numMatch[1]) : NaN;
        if (!Number.isFinite(num) || seen.has(num)) return;
        seen.add(num);
        const epTitle = $(el).text().replace(/\s+/g, " ").trim();
        episodes.push({
          id: slug,
          number: num,
          title: epTitle && !/^\d+$/.test(epTitle) ? epTitle : `Episódio ${num}`,
          url: href.startsWith("http") ? href : `${BASE}${href}`,
        });
      }
    );

    episodes.sort((a, b) => a.number - b.number);

    return {
      sourceId: this.sourceId,
      animeId,
      title:
        audioType === "dublado" && !/\(dublado\)/i.test(title)
          ? `${title} (Dublado)`
          : title.includes("(Legendado)") || audioType !== "legendado"
            ? title
            : `${title} (Legendado)`,
      cover: cover && !cover.startsWith("data:") ? cover : null,
      description,
      status: "unknown",
      episodeCount: episodes.length || undefined,
      episodes,
      audioType,
    };
  }

  async getEpisodeStreams(episodeId: string): Promise<AnimeEpisodeStreams> {
    const path = episodeId.includes("/episodio/")
      ? episodeId
      : `/episodio/${episodeId}`;
    const pageUrl = path.startsWith("http") ? path : `${BASE}${path}`;
    const res = await aoFetch(pageUrl);
    if (!res.ok) throw new Error(`AnimesOnline episódio HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const options: { post: string; nume: string; label: string }[] = [];
    $("#playeroptionsul li, .playeroptionsul li, .options ul li").each((_, el) => {
      const post = $(el).attr("data-post");
      const nume = $(el).attr("data-nume");
      const type = $(el).attr("data-type") || "tv";
      if (!post || !nume) return;
      options.push({
        post,
        nume,
        label: $(el).text().replace(/\s+/g, " ").trim() || `${type}-${nume}`,
      });
    });

    if (!options.length) {
      const postId = html.match(/data-post=["'](\d+)["']/)?.[1];
      if (postId) {
        options.push(
          { post: postId, nume: "1", label: "Legendado" },
          { post: postId, nume: "2", label: "Dublado" }
        );
      }
    }

    const sources: AnimeEpisodeStreams["sources"] = [];

    for (const opt of options) {
      try {
        const body = new URLSearchParams({
          action: "doo_player_ajax",
          post: opt.post,
          nume: opt.nume,
          type: "tv",
        });
        const pr = await aoFetch("/wp-admin/admin-ajax.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: pageUrl,
          },
          body,
        });
        if (!pr.ok) continue;
        const json = (await pr.json()) as { embed_url?: string; type?: string };
        if (!json.embed_url) continue;

        const mp4 = extractMp4FromEmbed(json.embed_url);
        const label = opt.label || "auto";
        const audioType: "dublado" | "legendado" | undefined = /dublado/i.test(label)
          ? "dublado"
          : /legendado/i.test(label)
            ? "legendado"
            : undefined;
        // qualidade real fica "Padrão" — o rótulo Dublado/Legendado vai em audioType
        const quality =
          audioType && /^(dublado|legendado)$/i.test(label.trim())
            ? "Padrão"
            : label;

        if (mp4) {
          sources.push({
            url: mp4,
            quality,
            isM3U8: mp4.includes(".m3u8"),
            audioType,
          });
        } else {
          sources.push({
            url: json.embed_url,
            quality: audioType ? "Padrão" : label || "Embed",
            isEmbed: true,
            audioType,
          });
        }
      } catch {
        // tenta próxima opção
      }
    }

    if (!sources.length) throw new Error("AnimesOnline: nenhum stream encontrado");
    return { sources, headers: { Referer: BASE } };
  }
}

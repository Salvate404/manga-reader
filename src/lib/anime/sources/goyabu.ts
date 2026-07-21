import type {
  AnimeAudioType,
  AnimeDetail,
  AnimeEpisode,
  AnimeEpisodeStreams,
  AnimeSearchResult,
} from "@/lib/types";
import { BaseAnimeSource } from "@/lib/anime/base";

const BASE = "https://goyabu.io";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

type GoyabuSearchItem = {
  title: string;
  url: string;
  img?: string;
  audio?: string;
  year?: string;
};

type GoyabuEpisode = {
  id: number;
  episodio: string;
  link: string;
  episode_name?: string;
  audio?: string;
};

function detectAudio(title: string, audio?: string): AnimeAudioType {
  const t = `${title} ${audio || ""}`.toLowerCase();
  if (t.includes("dublado") || t.includes("ptbr") || t.includes("pt-br") || t === "pt")
    return "dublado";
  return "legendado";
}

function cleanTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

async function gyFetch(path: string, init?: RequestInit): Promise<Response> {
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

async function fetchNonce(): Promise<string | null> {
  const res = await gyFetch("/");
  if (!res.ok) return null;
  const html = await res.text();
  return html.match(/"nonce"\s*:\s*"([a-f0-9]+)"/)?.[1] ?? null;
}

function parseAllEpisodes(html: string): GoyabuEpisode[] {
  const m = html.match(/(?:const|let|var)\s+allEpisodes\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!m) return [];
  try {
    // JS object → JSON
    const fixed = m[1]
      .replace(/([,{[]\s*)(\w+)\s*:/g, '$1"$2":')
      .replace(/'/g, '"');
    return JSON.parse(fixed) as GoyabuEpisode[];
  } catch {
    return [];
  }
}

function extractPlayers(html: string): { url: string; name?: string }[] {
  const m = html.match(/var\s+playersData\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!m) {
    const blogger = html.match(
      /https:\/\/www\.blogger\.com\/video\.g\?token=[A-Za-z0-9_-]+/
    );
    return blogger ? [{ url: blogger[0], name: "Blogger" }] : [];
  }
  try {
    const fixed = m[1]
      .replace(/([,{[]\s*)(\w+)\s*:/g, '$1"$2":')
      .replace(/'/g, '"')
      .replace(/\\\//g, "/");
    const data = JSON.parse(fixed) as { url?: string; name?: string }[];
    return data.filter((d) => d.url).map((d) => ({ url: d.url!, name: d.name }));
  } catch {
    const urls = [...m[1].matchAll(/https:\\\/\\\/[^"\\]+/g)].map((x) =>
      x[0].replace(/\\\//g, "/")
    );
    return urls.map((url) => ({ url }));
  }
}

/**
 * Goyabu — fonte PT-BR (dublado/legendado) via API WordPress.
 */
export class GoyabuSource extends BaseAnimeSource {
  readonly sourceId = "goyabu";
  readonly sourceName = "Goyabu";
  readonly baseUrl = BASE;
  readonly language = "PT-BR";

  async search(query: string): Promise<AnimeSearchResult[]> {
    const nonce = await fetchNonce();
    if (!nonce) throw new Error("Goyabu: nonce indisponível");

    const url = `${BASE}/wp-json/animeonline/search/?keyword=${encodeURIComponent(query)}&nonce=${nonce}`;
    const res = await gyFetch(url);
    if (!res.ok) throw new Error(`Goyabu busca HTTP ${res.status}`);
    const json = (await res.json()) as Record<string, GoyabuSearchItem>;

    return Object.entries(json).map(([id, item]) => {
      const audioType = detectAudio(item.title, item.audio);
      let title = cleanTitle(item.title);
      if (audioType === "dublado" && !/\(dublado\)/i.test(title)) {
        title = `${title} (Dublado)`;
      }
      const slug = item.url.split("/anime/")[1] || id;
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        animeId: slug.replace(/\/$/, ""),
        title,
        cover: item.img || null,
        url: item.url,
        year: item.year ? Number(item.year) || undefined : undefined,
        audioType,
      };
    });
  }

  async getTrending(_limit = 12): Promise<AnimeSearchResult[]> {
    // Destaques ficam a cargo do AnimeFire / AnimesOnline
    return [];
  }

  async getAnimeDetail(animeId: string): Promise<AnimeDetail> {
    const path = animeId.startsWith("http")
      ? animeId
      : `/anime/${animeId.replace(/^anime\//, "")}`;
    const res = await gyFetch(path);
    if (!res.ok) throw new Error(`Goyabu detalhe HTTP ${res.status}`);
    const html = await res.text();

    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const title = cleanTitle(titleMatch?.[1] || animeId);
    const audioType = detectAudio(title);
    const cover =
      html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ||
      html.match(/<img[^>]+class="[^"]*anime[^"]*"[^>]+src="([^"]+)"/i)?.[1] ||
      null;
    const desc =
      html.match(/property="og:description"\s+content="([^"]+)"/i)?.[1] ||
      undefined;

    const rawEps = parseAllEpisodes(html);
    const episodes: AnimeEpisode[] = [];
    for (const ep of rawEps) {
      const num = Number(ep.episodio);
      if (!Number.isFinite(num)) continue;
      const link = ep.link.startsWith("http") ? ep.link : `${BASE}${ep.link}`;
      episodes.push({
        id: `${ep.id}`,
        number: num,
        title: ep.episode_name || `Episódio ${num}`,
        url: link,
      });
    }
    episodes.sort((a, b) => a.number - b.number);

    const displayTitle =
      audioType === "dublado" && !/\(dublado\)/i.test(title)
        ? `${title} (Dublado)`
        : `${title}${audioType === "legendado" && !/\(legendado\)/i.test(title) ? " (Legendado)" : ""}`;

    return {
      sourceId: this.sourceId,
      animeId,
      title: displayTitle,
      cover,
      description: desc?.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
      status: "unknown",
      episodeCount: episodes.length || undefined,
      episodes,
      audioType,
    };
  }

  async getEpisodeStreams(episodeId: string): Promise<AnimeEpisodeStreams> {
    // episodeId = post id numérico
    const res = await gyFetch(`/${episodeId}`);
    if (!res.ok) throw new Error(`Goyabu stream HTTP ${res.status}`);
    const html = await res.text();
    const players = extractPlayers(html);
    if (!players.length) throw new Error("Goyabu: nenhum player encontrado");

    const pageTitle =
      html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
      html.match(/<title>([^<]+)<\/title>/i)?.[1] ||
      "";
    const detected = detectAudio(pageTitle);
    const pageAudio =
      detected === "dublado" || detected === "legendado" ? detected : undefined;

    const sources = players.map((p) => {
      const isBlogger = p.url.includes("blogger.com");
      const isM3U8 = p.url.includes(".m3u8");
      // idioma no player, se vier
      const playerAudio = /dublado|pt-?br/i.test(p.name || "")
        ? ("dublado" as const)
        : /legendado|jap/i.test(p.name || "")
          ? ("legendado" as const)
          : pageAudio;
      return {
        url: p.url,
        quality: p.name || (isBlogger ? "Embed" : "auto"),
        isM3U8,
        isEmbed: isBlogger || p.url.includes("blogspot.com"),
        audioType: playerAudio,
      };
    });

    return { sources, headers: { Referer: BASE } };
  }
}

import { BaseScraper } from "../base";
import type { MangaDetail, MangaSearchResult, ChapterPage } from "@/lib/types";

/**
 * MangaLix - SPA estatica em ingles.
 * Todos os dados vem de /chapters.json (118 titulos, capitulos + paginas).
 * Capas em /covers/{slug}-cover.webp
 * CDN das imagens: https://images.mangafreak.me (prefixo $MFK)
 */

const BASE = "https://mangalix.com";
const CDN_MFK  = "https://images.mangafreak.me";
const CDN_LST  = "https://scans.lastation.us";
const CDN_HOT  = "https://scans-hot.planeptune.us";
const CDN_LOW  = "https://official.lowee.us";
const CDN_TEMP = "https://temp.compsci88.com";
const CHAPTERS_URL = `${BASE}/chapters.json`;

interface MLChapter {
  id: string;
  mangaSlug: string;
  number: number;
  title: string;
  releaseDate: string;
  pages: string[];
}
type ChaptersJson = Record<string, MLChapter[]>;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  Referer: `${BASE}/`,
};

// Cache em memória para reutilização dentro do mesmo processo serverless
let _cache: ChaptersJson | null = null;
let _cacheAt = 0;
const CACHE_TTL = 30 * 60_000; // 30 min por processo

async function getChaptersJson(): Promise<ChaptersJson> {
  // 1. Cache em memória (mesmo processo, hot path)
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;

  // 2. fetch() nativo com Next.js Data Cache (persiste entre cold starts na Vercel)
  const res = await fetch(CHAPTERS_URL, {
    headers: HEADERS,
    next: { revalidate: 1800 }, // 30 min no CDN da Vercel
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`MangaLix chapters.json: HTTP ${res.status}`);
  const data = (await res.json()) as ChaptersJson;
  _cache = data;
  _cacheAt = Date.now();
  return data;
}

/** "one-piece" -> "One Piece" */
function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** "Hajime no Ippo Chapter 1515" -> "Hajime no Ippo" */
function titleFromChapterTitle(ct: string, num: number): string {
  return ct.replace(new RegExp(`\\s+[Cc]hapter\\s+${num}.*$`), "").trim();
}

function expandUrl(url: string): string {
  if (url.startsWith("$MFK"))  return CDN_MFK  + url.slice(4);
  if (url.startsWith("$LST"))  return CDN_LST  + url.slice(4);
  if (url.startsWith("$HOT"))  return CDN_HOT  + url.slice(4);
  if (url.startsWith("$LOW"))  return CDN_LOW  + url.slice(4);
  if (url.startsWith("$TEMP")) return CDN_TEMP + url.slice(5);
  return url;
}

export class MangaLixScraper extends BaseScraper {
  readonly sourceId = "mangalix";
  readonly sourceName = "MangaLix";
  readonly baseUrl = BASE;
  readonly language = "en";

  override getImageHeaders(): Record<string, string> {
    return { Referer: `${BASE}/`, "User-Agent": HEADERS["User-Agent"] };
  }

  async search(query: string): Promise<MangaSearchResult[]> {
    const data = await getChaptersJson();
    const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, "");

    return Object.entries(data)
      .filter(([slug]) => {
        const title = slugToTitle(slug).toLowerCase();
        return title.includes(q) || slug.includes(q.replace(/\s+/g, "-"));
      })
      .map(([slug, chapters]) => {
        const latestChap = chapters[0];
        const title = latestChap
          ? titleFromChapterTitle(latestChap.title, latestChap.number)
          : slugToTitle(slug);
        return {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          mangaId: slug,
          title,
          cover: `${BASE}/covers/${slug}-cover.webp`,
          url: `${BASE}/manga/${slug}`,
          chapterCount: chapters.length,
          lastChapter: latestChap ? String(latestChap.number) : undefined,
          status: "unknown" as const,
        };
      });
  }

  async getTrending(limit = 10): Promise<MangaSearchResult[]> {
    const data = await getChaptersJson();
    const ranked = Object.entries(data)
      .map(([slug, chapters]) => {
        const latestChap = chapters[0];
        const title = latestChap
          ? titleFromChapterTitle(latestChap.title, latestChap.number)
          : slugToTitle(slug);
        return {
          slug,
          title,
          chapters,
          score: chapters.length,
          latest: latestChap?.releaseDate ?? "",
        };
      })
      .sort((a, b) => {
        const dateCmp = b.latest.localeCompare(a.latest);
        return dateCmp !== 0 ? dateCmp : b.score - a.score;
      })
      .slice(0, limit);

    return ranked.map(({ slug, title, chapters }) => {
      const latestChap = chapters[0];
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        mangaId: slug,
        title,
        cover: `${BASE}/covers/${slug}-cover.webp`,
        url: `${BASE}/manga/${slug}`,
        chapterCount: chapters.length,
        lastChapter: latestChap ? String(latestChap.number) : undefined,
        status: "unknown" as const,
      };
    });
  }

  async getAllManga(_page = 1, _limit = 50): Promise<MangaSearchResult[]> {
    const data = await getChaptersJson();
    return Object.entries(data).map(([slug, chapters]) => {
      const latestChap = chapters[0];
      const title = latestChap
        ? titleFromChapterTitle(latestChap.title, latestChap.number)
        : slugToTitle(slug);
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        mangaId: slug,
        title,
        cover: `${BASE}/covers/${slug}-cover.webp`,
        url: `${BASE}/manga/${slug}`,
        chapterCount: chapters.length,
        lastChapter: latestChap ? String(latestChap.number) : undefined,
        status: "unknown" as const,
      };
    });
  }

  async getMangaDetail(mangaId: string): Promise<MangaDetail> {
    const data = await getChaptersJson();
    const chapters = data[mangaId];
    if (!chapters) throw new Error(`Manga nao encontrado no MangaLix: ${mangaId}`);

    const latestChap = chapters[0];
    const title = latestChap
      ? titleFromChapterTitle(latestChap.title, latestChap.number)
      : slugToTitle(mangaId);

    // Ordenar decrescente (mais recente primeiro)
    const sortedChaps = [...chapters].sort((a, b) => b.number - a.number);

    return {
      sourceId: this.sourceId,
      mangaId,
      title,
      cover: `${BASE}/covers/${mangaId}-cover.webp`,
      status: "unknown",
      chapters: sortedChaps.map((c) => ({
        id: `${mangaId}__${c.number}`,
        number: String(c.number),
        title: c.title,
        url: `${BASE}/manga/${mangaId}/chapter/${c.number}`,
        uploadedAt: c.releaseDate,
      })),
    };
  }

  async getChapterPages(chapterId: string): Promise<ChapterPage[]> {
    const sep = chapterId.indexOf("__");
    if (sep < 0) throw new Error(`chapterId invalido: ${chapterId}`);
    const mangaSlug = chapterId.slice(0, sep);
    const chapNum = Number(chapterId.slice(sep + 2));

    const data = await getChaptersJson();
    const chapters = data[mangaSlug];
    if (!chapters) throw new Error(`Manga nao encontrado no MangaLix: ${mangaSlug}`);

    const chapter = chapters.find((c) => c.number === chapNum);
    if (!chapter) throw new Error(`Capitulo ${chapNum} nao encontrado em ${mangaSlug}`);

    return chapter.pages.map((url, i) => ({
      index: i,
      imageUrl: expandUrl(url),
    }));
  }
}

/**
 * Cliente MangaFire (API JSON).
 * Usado pelo scraper local e pelas rotas Edge na Vercel
 * (IP serverless Node recebe 403; Edge costuma passar).
 */

import type {
  Chapter,
  ChapterPage,
  ChaptersApiResponse,
  MangaDetail,
  MangaSearchResult,
} from "@/lib/types";

const BASE = "https://mangafire.to";
const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";

const PREFERRED_LANGS = ["pt-br", "en"] as const;

type Poster = { small?: string; medium?: string; large?: string };

interface TitleItem {
  id: number;
  hid: string;
  slug?: string;
  title: string;
  type?: string;
  status?: string;
  poster?: Poster;
  latestChapter?: number;
  year?: number;
  url?: string;
  synopsisHtml?: string;
  authors?: { title: string }[];
  artists?: { title: string }[];
  genres?: { title: string }[];
  themes?: { title: string }[];
  languages?: string[];
}

interface ChapterItem {
  id: number;
  number: number;
  name?: string;
  language?: string;
  type?: string;
  createdAt?: number;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapStatus(
  status?: string
): "ongoing" | "completed" | "hiatus" | "unknown" {
  switch ((status || "").toLowerCase()) {
    case "releasing":
      return "ongoing";
    case "finished":
      return "completed";
    case "on_hiatus":
    case "hiatus":
      return "hiatus";
    default:
      return "unknown";
  }
}

export function resolveMangaFireHid(mangaId: string): string {
  let raw = mangaId.trim();
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep */
  }
  raw = raw
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/title\//, "")
    .replace(/\/.*$/, "")
    .replace(/\/$/, "");
  if (!raw) return mangaId;
  if (raw.includes(".")) return raw.split(".").pop() || raw;
  if (raw.includes("-")) return raw.split("-")[0] || raw;
  return raw;
}

function titleUrl(item: Pick<TitleItem, "hid" | "slug" | "url">): string {
  if (item.url) {
    return item.url.startsWith("http") ? item.url : `${BASE}${item.url}`;
  }
  const slug = item.slug ? `${item.hid}-${item.slug}` : item.hid;
  return `${BASE}/title/${slug}`;
}

function mangaSlugFromItem(item: Pick<TitleItem, "hid" | "slug" | "url">): string {
  if (item.url) {
    return item.url.replace(/^\/title\//, "").replace(/\/$/, "");
  }
  return item.slug ? `${item.hid}-${item.slug}` : item.hid;
}

function coverOf(poster?: Poster): string | null {
  return poster?.large || poster?.medium || poster?.small || null;
}

async function mfJson<T>(path: string): Promise<T> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = path.startsWith("http") ? path : `${BASE}${path}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "application/json",
          Referer: `${BASE}/`,
        },
        cache: "no-store",
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`MangaFire HTTP ${res.status}: ${path}`);
      if (text.trimStart().startsWith("<")) {
        throw new Error("MangaFire bloqueou a requisição (Cloudflare)");
      }
      return JSON.parse(text) as T;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error(`MangaFire falhou: ${path}`);
}

function toSearchResult(item: TitleItem): MangaSearchResult {
  return {
    sourceId: "mangafire",
    sourceName: "MangaFire",
    mangaId: item.hid,
    title: item.title,
    cover: coverOf(item.poster),
    url: titleUrl(item),
    chapterCount: item.latestChapter,
    lastChapter:
      item.latestChapter != null ? String(item.latestChapter) : undefined,
    status: mapStatus(item.status),
  };
}

export async function fetchMangaFireSearch(
  query: string
): Promise<MangaSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await mfJson<{ items?: TitleItem[] }>(
    `/api/titles?keyword=${encodeURIComponent(q)}&page=1&limit=40`
  );
  return (data.items || []).map(toSearchResult);
}

export async function fetchMangaFireTrending(
  limit = 10
): Promise<MangaSearchResult[]> {
  const data = await mfJson<{ items?: TitleItem[] }>(
    `/api/titles?order[views_30d]=desc&page=1&limit=${Math.min(limit, 50)}`
  );
  return (data.items || []).slice(0, limit).map(toSearchResult);
}

export async function fetchMangaFireAll(
  page = 1,
  limit = 50
): Promise<MangaSearchResult[]> {
  const data = await mfJson<{ items?: TitleItem[] }>(
    `/api/titles?order[chapter_updated_at]=desc&page=${page}&limit=${Math.min(limit, 50)}`
  );
  return (data.items || []).map(toSearchResult);
}

async function fetchAllChapters(
  hid: string,
  language: string,
  mangaSlug: string
): Promise<Chapter[]> {
  const chapters: Chapter[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const data = await mfJson<{
      items?: ChapterItem[];
      meta?: { lastPage?: number };
    }>(
      `/api/titles/${hid}/chapters?language=${encodeURIComponent(language)}&sort=number&order=desc&page=${page}&limit=200`
    );

    for (const ch of data.items || []) {
      const num = String(ch.number).replace(/\.0$/, "");
      const label = ch.name?.trim()
        ? `Ch. ${num} — ${ch.name.trim()}`
        : `Ch. ${num}`;
      chapters.push({
        id: String(ch.id),
        number: num,
        title: label,
        url: `${BASE}/title/${mangaSlug}/${ch.id}-chapter-${num}-${language}`,
        uploadedAt: ch.createdAt
          ? new Date(ch.createdAt * 1000).toISOString()
          : undefined,
      });
    }

    lastPage = data.meta?.lastPage ?? page;
    page++;
  } while (page <= lastPage);

  if (!chapters.length && language !== "en") {
    return fetchAllChapters(hid, "en", mangaSlug);
  }

  return chapters;
}

export async function fetchMangaFireDetail(
  mangaId: string
): Promise<MangaDetail> {
  const hid = resolveMangaFireHid(mangaId);
  const detail = await mfJson<{ data: TitleItem }>(`/api/titles/${hid}`);
  const item = detail.data;
  if (!item) throw new Error("MangaFire: título não encontrado");

  const langs = item.languages?.length ? item.languages : [...PREFERRED_LANGS];
  const lang =
    PREFERRED_LANGS.find((l) => langs.includes(l)) || langs[0] || "en";

  const chapters = await fetchAllChapters(hid, lang, mangaSlugFromItem(item));

  return {
    sourceId: "mangafire",
    mangaId: item.hid,
    title: item.title,
    cover: coverOf(item.poster),
    description: item.synopsisHtml ? stripHtml(item.synopsisHtml) : undefined,
    status: mapStatus(item.status),
    genres: [
      ...(item.genres?.map((g) => g.title) || []),
      ...(item.themes?.map((t) => t.title) || []),
    ],
    author: item.authors?.map((a) => a.title).join(", "),
    artist: item.artists?.map((a) => a.title).join(", "),
    chapters,
  };
}

export async function fetchMangaFireChaptersResponse(
  mangaId: string
): Promise<ChaptersApiResponse> {
  const manga = await fetchMangaFireDetail(mangaId);
  return { manga };
}

export async function fetchMangaFirePages(
  chapterId: string
): Promise<ChapterPage[]> {
  const id =
    chapterId.match(/(?:^|\/)(\d+)(?:-chapter-|$)/)?.[1] ||
    chapterId.replace(/.*\//, "").split("-")[0] ||
    chapterId;

  const data = await mfJson<{
    data?: { pages?: { url: string; width?: number; height?: number }[] };
  }>(`/api/chapters/${id}`);

  const pages = data.data?.pages || [];
  if (!pages.length) throw new Error("MangaFire: capítulo sem páginas");

  return pages.map((p, index) => ({
    index,
    imageUrl: p.url,
    width: p.width,
    height: p.height,
  }));
}

export const MANGAFIRE_IMAGE_HEADERS = {
  Referer: `${BASE}/`,
  "User-Agent": UA,
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

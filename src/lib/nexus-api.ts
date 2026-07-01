import type { ChapterPage, ChaptersApiResponse, MangaSearchResult } from "@/lib/types";
import { processOrionResponse } from "@/lib/nexus-crypto";

const BASE = "https://nexustoons.com";
const API = `${BASE}/api`;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  Accept: "application/json",
  Referer: `${BASE}/`,
};

interface NexusManga {
  title: string;
  slug: string;
  coverImage?: string;
  status?: string;
  chapterCount?: number;
  description?: string;
  author?: string;
  artist?: string;
  categories?: { category: { name: string } }[];
  chapters?: { id: number; number: string; title?: string; createdAt?: string }[];
}

interface NexusPage {
  pageNumber: number;
  imageUrl?: string;
  url?: string;
  path?: string;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapStatus(s?: string): MangaSearchResult["status"] {
  if (!s) return "unknown";
  const lower = s.toLowerCase();
  if (lower.includes("ongoing") || lower.includes("andamento")) return "ongoing";
  if (lower.includes("completed") || lower.includes("completo") || lower.includes("finalizado")) return "completed";
  if (lower.includes("hiatus") || lower.includes("hiato")) return "hiatus";
  return "unknown";
}

async function nexusFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { headers: HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`NexusToons API retornou ${res.status}`);
  const raw = await res.json();
  return processOrionResponse<T>(raw);
}

function toSearchResult(m: NexusManga): MangaSearchResult {
  return {
    sourceId: "nexustoons",
    sourceName: "Nexus Toons",
    mangaId: m.slug,
    title: m.title,
    cover: m.coverImage ?? null,
    url: `${BASE}/manga/${m.slug}`,
    chapterCount: m.chapterCount,
    status: mapStatus(m.status),
    genres: m.categories?.map((c) => c.category.name) ?? [],
  };
}

export async function fetchNexusSearch(query: string, limit = 20): Promise<MangaSearchResult[]> {
  const data = await nexusFetch<{ data?: NexusManga[] | null }>("/mangas", {
    search: query,
    limit: String(limit),
  });

  const direct = (data?.data ?? []).filter((m) => m.title && m.slug).map(toSearchResult);
  if (direct.length > 0) return direct;

  const normalized = normalizeText(query);
  if (!normalized) return [];

  const normalizedData = await nexusFetch<{ data?: NexusManga[] | null }>("/mangas", {
    search: normalized,
    limit: String(limit),
  });

  const byNormalizedSearch = (normalizedData?.data ?? [])
    .filter((m) => m.title && m.slug)
    .map(toSearchResult);
  if (byNormalizedSearch.length > 0) return byNormalizedSearch;

  const fallbackPool = await nexusFetch<{ data?: NexusManga[] | null }>("/mangas", {
    page: "1",
    limit: "80",
  });

  return (fallbackPool?.data ?? [])
    .filter((m) => m.title && m.slug)
    .filter((m) => normalizeText(m.title).includes(normalized))
    .slice(0, limit)
    .map(toSearchResult);
}

export async function fetchNexusTrending(limit = 10): Promise<MangaSearchResult[]> {
  try {
    const data = await nexusFetch<{ data?: NexusManga[] }>("/mangas/trending", {
      limit: String(limit),
    });
    return (data.data ?? []).slice(0, limit).map(toSearchResult);
  } catch {
    const data = await nexusFetch<{ data?: NexusManga[] }>("/mangas", {
      page: "1",
      limit: String(limit),
    });
    return (data.data ?? []).slice(0, limit).map(toSearchResult);
  }
}

export async function fetchNexusMangaDetail(mangaId: string): Promise<ChaptersApiResponse> {
  const raw = await nexusFetch<NexusManga | { data?: NexusManga }>(`/manga/${mangaId}`);
  // A API pode retornar NexusManga diretamente ou embrulhado em { data: NexusManga }
  const wrapped = raw as { data?: NexusManga };
  const manga: NexusManga = wrapped.data?.title ? wrapped.data : (raw as NexusManga);
  if (!manga?.title || !manga.slug) {
    throw new Error(`Mangá não encontrado no NexusToons: ${mangaId}`);
  }

  const chapters = (manga.chapters ?? [])
    .sort((a, b) => parseFloat(b.number) - parseFloat(a.number))
    .map((c) => ({
      id: String(c.id),
      number: c.number,
      title: c.title || undefined,
      url: `${BASE}/manga/${mangaId}/chapter/${c.number}`,
      uploadedAt: c.createdAt,
    }));

  return {
    manga: {
      sourceId: "nexustoons",
      mangaId,
      title: manga.title,
      cover: manga.coverImage ?? null,
      description: manga.description,
      status: mapStatus(manga.status),
      genres: manga.categories?.map((c) => c.category.name) ?? [],
      author: manga.author,
      artist: manga.artist,
      chapters,
    },
  };
}

export async function fetchNexusChapterPages(chapterId: string): Promise<ChapterPage[]> {
  const data = await nexusFetch<{ pages?: NexusPage[] }>(`/chapter/${chapterId}`);
  return (data?.pages ?? [])
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => ({
      index: p.pageNumber - 1,
      imageUrl: p.imageUrl ?? p.url ?? p.path ?? "",
    }))
    .filter((p) => !!p.imageUrl);
}

export function getAppOrigin(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

/** Chama rota Edge interna (contorna bloqueio de IP da Vercel no NexusToons). */
export async function fetchNexusViaEdge<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getAppOrigin()}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

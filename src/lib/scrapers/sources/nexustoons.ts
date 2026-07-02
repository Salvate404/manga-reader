import axios from "axios";
import { BaseScraper } from "../base";
import { processOrionResponse } from "@/lib/nexus-crypto";
import type { MangaDetail, MangaSearchResult, ChapterPage } from "@/lib/types";

// ─── Tipos da API do NexusToons ──────────────────────────────────────────────

interface NexusManga {
  id: number;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  status?: string;
  author?: string;
  artist?: string;
  chapterCount?: number;
  categories?: ({ category?: { name: string }; name?: string })[];
  chapters?: NexusChapter[];
}

interface NexusChapter {
  id: number;
  number: string;
  title?: string;
  createdAt?: string;
}

interface NexusPage {
  id: number;
  pageNumber: number;
  imageUrl?: string;
  url?: string;
  path?: string;
}

// ─── Scraper ─────────────────────────────────────────────────────────────────

const BASE = "https://nexustoons.com";
const API  = `${BASE}/api`;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  Referer: `${BASE}/`,
  Origin:  BASE,
};

export class NexusToonsScraper extends BaseScraper {
  readonly sourceId   = "nexustoons";
  readonly sourceName = "Nexus Toons";
  readonly baseUrl    = BASE;
  readonly language   = "pt-BR";

  private async apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
    const { data } = await axios.get<unknown>(`${API}${path}`, {
      params,
      headers: { ...HEADERS, Accept: "application/json" },
      timeout: 12_000,
      withCredentials: false,
    });
    return processOrionResponse<T>(data);
  }

  override getImageHeaders(): Record<string, string> {
    return {
      Referer: `${BASE}/`,
      "User-Agent": HEADERS["User-Agent"],
    };
  }

  async search(query: string): Promise<MangaSearchResult[]> {
    const data = await this.apiGet<{ data?: NexusManga[] | null }>("/mangas", {
      search: query,
      limit: "20",
    });

    const mangas = data?.data ?? [];

    return mangas
      .filter((m) => !!m.title && !!m.slug)
      .map((m) => this.toSearchResult(m));
  }

  async getTrending(limit = 10): Promise<MangaSearchResult[]> {
    const data = await this.apiGet<{ data?: NexusManga[] }>("/mangas", {
      page: "1",
      limit: String(limit),
    });
    return (data?.data ?? [])
      .filter((m) => !!m.title && !!m.slug)
      .slice(0, limit)
      .map((m) => this.toSearchResult(m));
  }

  async getAllManga(page = 1, limit = 50): Promise<MangaSearchResult[]> {
    const data = await this.apiGet<{ data?: NexusManga[] }>("/mangas", {
      page: String(page),
      limit: String(limit),
    });
    return (data?.data ?? [])
      .filter((m) => !!m.title && !!m.slug)
      .map((m) => this.toSearchResult(m));
  }

  async getMangaDetail(mangaId: string): Promise<MangaDetail> {
    const manga = await this.apiGet<NexusManga>(`/manga/${mangaId}`);
    if (!manga?.title || !manga.slug) {
      throw new Error(`Mangá não encontrado no NexusToons: ${mangaId}`);
    }

    const genres = manga.categories?.map((c) => c.category?.name ?? c.name ?? "").filter(Boolean) ?? [];

    const chapters = (manga.chapters ?? [])
      .sort((a, b) => parseFloat(b.number) - parseFloat(a.number))
      .map((c) => ({
        id:          String(c.id),
        number:      c.number,
        title:       c.title || undefined,
        url:         `${BASE}/manga/${mangaId}/chapter/${c.number}`,
        uploadedAt:  c.createdAt,
      }));

    return {
      sourceId:    this.sourceId,
      mangaId,
      title:       manga.title,
      cover:       manga.coverImage ?? null,
      description: manga.description,
      status:      mapStatus(manga.status),
      genres,
      author:      manga.author,
      artist:      manga.artist,
      chapters,
    };
  }

  async getChapterPages(chapterId: string): Promise<ChapterPage[]> {
    // /api/chapter/{id}/pages retorna 401 — usar /api/chapter/{id} que inclui pages
    const data = await this.apiGet<{ pages?: NexusPage[] }>(
      `/chapter/${chapterId}`
    );

    const pages = data?.pages ?? [];

    return pages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((p) => ({
        index:    p.pageNumber - 1,
        imageUrl: p.imageUrl ?? p.url ?? p.path ?? "",
      }))
      .filter((p) => !!p.imageUrl);
  }

  private toSearchResult(m: NexusManga): MangaSearchResult {
    return {
      sourceId:     this.sourceId,
      sourceName:   this.sourceName,
      mangaId:      m.slug,
      title:        m.title,
      cover:        m.coverImage ?? null,
      url:          `${BASE}/manga/${m.slug}`,
      chapterCount: m.chapterCount,
      status:       mapStatus(m.status),
      genres:       m.categories?.map((c) => c.category?.name ?? c.name ?? "").filter(Boolean) ?? [],
    };
  }
}

function mapStatus(s?: string): MangaDetail["status"] {
  if (!s) return "unknown";
  const lower = s.toLowerCase();
  if (lower.includes("ongoing") || lower.includes("andamento")) return "ongoing";
  if (lower.includes("completed") || lower.includes("completo") || lower.includes("finalizado")) return "completed";
  if (lower.includes("hiatus") || lower.includes("hiato")) return "hiatus";
  return "unknown";
}

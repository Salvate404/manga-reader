import { BaseScraper } from "../base";
import type { MangaDetail, MangaSearchResult, ChapterPage } from "@/lib/types";

const BASE = "https://mangadex.org";
const API = "https://api.mangadex.org";

const HEADERS = {
  "User-Agent": "MangaReader/1.0",
};

// ─── Tipos da API do MangaDex ───────────────────────────────────────────────

interface MangaDexManga {
  id: string;
  type: "manga";
  attributes: {
    title: Record<string, string>;
    altTitles?: Array<Record<string, string>>;
    description?: Record<string, string>;
    status?: "ongoing" | "completed" | "hiatus" | "cancelled";
    originalLanguage?: string;
    availableTranslatedLanguages?: string[];
    tags?: Array<{
      id: string;
      type: string;
      attributes: {
        name: Record<string, string>;
        group: string;
      };
    }>;
  };
  relationships: Array<{
    id: string;
    type: string;
    attributes?: {
      fileName?: string;
    };
  }>;
}

interface MangaDexChapter {
  id: string;
  type: "chapter";
  attributes: {
    chapter?: string;
    title?: string;
    translatedLanguage?: string;
    publishAt: string;
  };
}

interface MangaDexPage {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
  };
}

interface MangaDexResponse<T> {
  result: "ok" | "error";
  data: T;
  limit: number;
  offset: number;
  total: number;
}

// ─── Scraper ───────────────────────────────────────────────────────────────

export class MangaDexScraper extends BaseScraper {
  readonly sourceId = "mangadex";
  readonly sourceName = "MangaDex";
  readonly baseUrl = BASE;
  readonly language = "en";

  private async apiGet<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
    const url = new URL(`${API}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => url.searchParams.append(key, v));
        } else {
          url.searchParams.set(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: HEADERS,
    });

    if (!response.ok) {
      throw new Error(`MangaDex API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  override getImageHeaders(): Record<string, string> {
    return {
      Referer: `${BASE}/`,
      "User-Agent": HEADERS["User-Agent"],
    };
  }

  async search(query: string): Promise<MangaSearchResult[]> {
    try {
      const url = new URL(`${API}/manga`);
      url.searchParams.set("title", query);
      url.searchParams.set("limit", "20");
      url.searchParams.set("includes[]", "cover_art");

      const response = await fetch(url.toString(), {
        headers: HEADERS,
      });

      if (!response.ok) {
        throw new Error(`MangaDex API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as MangaDexResponse<MangaDexManga[]>;
      return (data.data ?? []).map((m) => this.toSearchResult(m));
    } catch (error) {
      console.error("MangaDex search error:", error);
      return [];
    }
  }

  async getTrending(limit = 10): Promise<MangaSearchResult[]> {
    const data = await this.apiGet<MangaDexResponse<MangaDexManga[]>>("/manga", {
      limit: String(limit),
      order: "followedCount",
      "contentRating[]": ["safe", "suggestive"],
    });

    return (data.data ?? []).slice(0, limit).map((m) => this.toSearchResult(m));
  }

  async getAllManga(page = 1, limit = 50): Promise<MangaSearchResult[]> {
    const offset = String((page - 1) * limit);
    const data = await this.apiGet<MangaDexResponse<MangaDexManga[]>>("/manga", {
      limit: String(limit),
      offset,
      "contentRating[]": ["safe", "suggestive"],
    });

    return (data.data ?? []).map((m) => this.toSearchResult(m));
  }

  async getMangaDetail(mangaId: string): Promise<MangaDetail> {
    const manga = await this.apiGet<MangaDexResponse<MangaDexManga>>(`/manga/${mangaId}`);
    if (!manga.data) {
      throw new Error(`Manga not found on MangaDex: ${mangaId}`);
    }

    const coverRel = manga.data.relationships.find((r) => r.type === "cover_art");
    const authorRel = manga.data.relationships.find((r) => r.type === "author");
    const artistRel = manga.data.relationships.find((r) => r.type === "artist");

    let cover = null;
    if (coverRel?.attributes?.fileName) {
      const fileName = coverRel.attributes.fileName;
      const baseName = fileName.replace(/\.[^.]+$/, '');
      cover = `${API}/covers/${mangaId}/${baseName}.256.jpg`;
    }

    const author = authorRel?.id;
    const artist = artistRel?.id;

    // Fetch chapters
    const chaptersData = await this.apiGet<MangaDexResponse<MangaDexChapter[]>>(
      `/manga/${mangaId}/feed`,
      {
        limit: "500",
        "translatedLanguage[]": ["en", "pt-br"],
        "order[chapter]": "desc",
        "contentRating[]": ["safe", "suggestive"],
      }
    );

    // Group chapters by number and language, prefer pt-br
    const chapterMap = new Map<string, MangaDexChapter>();
    for (const chapter of chaptersData.data ?? []) {
      const num = chapter.attributes.chapter ?? "0";
      const lang = chapter.attributes.translatedLanguage ?? "en";
      const existing = chapterMap.get(num);

      // Prefer pt-br over en, and newer chapters over older
      if (!existing || (lang === "pt-br" && existing.attributes.translatedLanguage !== "pt-br")) {
        chapterMap.set(num, chapter);
      } else if (lang === existing.attributes.translatedLanguage) {
        // Same language, keep the newer one
        const existingDate = new Date(existing.attributes.publishAt);
        const newDate = new Date(chapter.attributes.publishAt);
        if (newDate > existingDate) {
          chapterMap.set(num, chapter);
        }
      }
    }

    const chapters = Array.from(chapterMap.values())
      .sort((a, b) => {
        const aNum = parseFloat(a.attributes.chapter ?? "0");
        const bNum = parseFloat(b.attributes.chapter ?? "0");
        return bNum - aNum;
      })
      .map((c) => ({
        id: c.id,
        number: c.attributes.chapter ?? "0",
        title: c.attributes.title || `Chapter ${c.attributes.chapter}`,
        url: `${BASE}/chapter/${c.id}`,
        uploadedAt: c.attributes.publishAt,
      }));

    const genres = (manga.data.attributes.tags ?? [])
      .filter((t) => t.attributes.group === "genre")
      .map((t) => t.attributes.name.en || t.attributes.name["pt-br"] || "")
      .filter(Boolean);

    const title = this.getTitle(manga.data.attributes.title);
    const description = this.getDescription(manga.data.attributes.description);

    return {
      sourceId: this.sourceId,
      mangaId,
      title,
      cover,
      description,
      author: author || undefined,
      artist: artist || undefined,
      status: this.mapStatus(manga.data.attributes.status),
      genres,
      chapters,
    };
  }

  async getChapterPages(chapterId: string): Promise<ChapterPage[]> {
    // Get the at-home server for the chapter
    const data = await this.apiGet<{ baseUrl: string; chapter: { hash: string; data: string[] } }>(
      `/at-home/server/${chapterId}`
    );

    const pages = data.chapter.data.map((filename, i) => ({
      index: i,
      imageUrl: `${data.baseUrl}/data/${data.chapter.hash}/${filename}`,
    }));

    return pages;
  }

  private toSearchResult(m: MangaDexManga): MangaSearchResult {
    const coverRel = m.relationships.find((r) => r.type === "cover_art");
    let cover = null;
    if (coverRel?.attributes?.fileName) {
      const fileName = coverRel.attributes.fileName;
      // Remove existing extension and add .256.jpg for thumbnail
      const baseName = fileName.replace(/\.[^.]+$/, '');
      cover = `${API}/covers/${m.id}/${baseName}.256.jpg`;
    }

    const title = this.getTitle(m.attributes.title);
    const genres = (m.attributes.tags ?? [])
      .filter((t) => t.attributes.group === "genre")
      .map((t) => t.attributes.name.en || t.attributes.name["pt-br"] || "")
      .filter(Boolean);

    return {
      sourceId: this.sourceId,
      sourceName: this.sourceName,
      mangaId: m.id,
      title,
      cover,
      url: `${BASE}/title/${m.id}`,
      status: this.mapStatus(m.attributes.status),
      genres,
    };
  }

  private getTitle(titleObj: Record<string, string>): string {
    // Prefer English, then Portuguese, then first available
    return titleObj["en"] || titleObj["pt-br"] || Object.values(titleObj)[0] || "";
  }

  private getDescription(descObj?: Record<string, string>): string | undefined {
    if (!descObj) return undefined;
    return descObj["en"] || descObj["pt-br"] || Object.values(descObj)[0];
  }

  private mapStatus(status?: string): MangaDetail["status"] {
    if (!status) return "unknown";
    switch (status) {
      case "ongoing":
        return "ongoing";
      case "completed":
        return "completed";
      case "hiatus":
        return "hiatus";
      case "cancelled":
        return "completed";
      default:
        return "unknown";
    }
  }
}

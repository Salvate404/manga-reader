import crypto from "node:crypto";
import axios from "axios";
import { BaseScraper } from "../base";
import type { MangaDetail, MangaSearchResult, ChapterPage } from "@/lib/types";

// ─── OrionCrypto — algoritmo nativo do NexusToons ────────────────────────────

const ORION_SECRET = "OrionNexus2025CryptoKey!Secure";

interface OrionKey {
  key: Uint8Array;
  sbox: Uint8Array;
  rsbox: Uint8Array;
}

function initSBoxForKey(entry: OrionKey): void {
  const t = entry.key;
  for (let r = 0; r < 256; r++) entry.sbox[r] = r;
  let n = 0;
  for (let r = 0; r < 256; r++) {
    n = (n + entry.sbox[r] + t[r % t.length]) % 256;
    [entry.sbox[r], entry.sbox[n]] = [entry.sbox[n], entry.sbox[r]];
  }
  for (let r = 0; r < 256; r++) entry.rsbox[entry.sbox[r]] = r;
}

async function buildOrionKeys(): Promise<OrionKey[]> {
  const keys: OrionKey[] = [];
  for (let n = 0; n < 5; n++) {
    const keyStr = `_orion_key_${n}_v2_${ORION_SECRET}`;
    const hash = crypto.createHash("sha256").update(keyStr, "utf8").digest("hex");
    const keyBytes = new Uint8Array(
      (hash.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16))
    );
    const entry: OrionKey = {
      key:   keyBytes,
      sbox:  new Uint8Array(256),
      rsbox: new Uint8Array(256),
    };
    initSBoxForKey(entry);
    keys.push(entry);
  }
  return keys;
}

function rotateRight(e: number, t: number): number {
  const shift = t % 8;
  return 255 & ((e >>> shift) | (e << (8 - shift)));
}

function orionDecrypt(keyIndex: number, encrypted: string, keys: OrionKey[]): string {
  const entry = keys[keyIndex];
  const r = entry.key;
  const a = entry.rsbox;
  const l = r.length;
  const decoded = Buffer.from(encrypted, "base64");
  const o = new Uint8Array(decoded);
  const s = new Uint8Array(o.length);
  for (let c = o.length - 1; c >= 0; c--) {
    let e = o[c];
    e ^= c > 0 ? o[c - 1] : r[l - 1];
    e = a[e];
    const t = ((r[(c + 3) % l] + (255 & c)) & 255) % 7 + 1;
    e = rotateRight(e, t);
    e ^= r[c % l];
    s[c] = e;
  }
  return Buffer.from(s).toString("utf8");
}

function processOrionResponse<T>(data: unknown, keys: OrionKey[]): T {
  if (!data || typeof data !== "object") return data as T;
  const d = data as Record<string, unknown>;
  if (
    typeof d.d === "string" &&
    typeof d.k === "number" &&
    typeof d.v === "number" &&
    (d.v === 1 || d.v === 2)
  ) {
    const keyIndex = d.v === 1 ? 0 : (d.k as number) || 0;
    try {
      const decrypted = orionDecrypt(keyIndex, d.d as string, keys);
      return JSON.parse(decrypted) as T;
    } catch {
      return data as T;
    }
  }
  return data as T;
}

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
  categories?: { category: { name: string } }[];
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

  private keys: OrionKey[] | null = null;

  private async getKeys(): Promise<OrionKey[]> {
    if (!this.keys) this.keys = await buildOrionKeys();
    return this.keys;
  }

  private async apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
    const keys = await this.getKeys();
    const { data } = await axios.get<unknown>(`${API}${path}`, {
      params,
      headers: { ...HEADERS, Accept: "application/json" },
      timeout: 12_000,
      withCredentials: false,
    });
    return processOrionResponse<T>(data, keys);
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

  async getMangaDetail(mangaId: string): Promise<MangaDetail> {
    const manga = await this.apiGet<NexusManga>(`/manga/${mangaId}`);
    if (!manga?.title || !manga.slug) {
      throw new Error(`Mangá não encontrado no NexusToons: ${mangaId}`);
    }

    const genres = manga.categories?.map((c) => c.category.name) ?? [];

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
      genres:       m.categories?.map((c) => c.category.name) ?? [],
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

import axios from "axios";
import { BaseScraper } from "../base";
import type { MangaDetail, MangaSearchResult, ChapterPage } from "@/lib/types";

const BASE = "https://leituramanga.net";
const CDN  = "https://cdn.leituramanga.net";
const API  = "https://api.leituramanga.net";

/** status 1 = em andamento, 2 = completo */
const STATUS_MAP: Record<number, MangaDetail["status"]> = {
  1: "ongoing",
  2: "completed",
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  Referer:          BASE,
  Origin:           BASE,
  "Accept-Language": "pt-BR,pt;q=0.9",
};

export class LeituraMangaScraper extends BaseScraper {
  readonly sourceId   = "leituramanga";
  readonly sourceName = "Leitura Manga";
  readonly baseUrl    = BASE;
  readonly language   = "pt-BR";

  override getImageHeaders(): Record<string, string> {
    return {
      Referer: `${BASE}/`,
      "User-Agent": HEADERS["User-Agent"],
    };
  }

  async search(query: string): Promise<MangaSearchResult[]> {
    const { data } = await axios.get(`${API}/api/search/manga`, {
      params: { q: query, page: 1, limit: 30, includeAdult: "true" },
      headers: HEADERS,
      timeout: 12_000,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = data?.data?.data ?? [];
    return items.map((item) => ({
      sourceId:   this.sourceId,
      sourceName: this.sourceName,
      mangaId:    item.slug,
      title:      item.title,
      cover:      `${CDN}/${item.slug}/cover-sm.webp`,
      url:        `${BASE}/manga/${item.slug}`,
      status:     STATUS_MAP[item.status as number] ?? "unknown",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      genres:     (item.genres ?? []).map((g: any) => (typeof g === "string" ? g : (g.name ?? ""))).filter(Boolean) as string[],
    }));
  }

  async getMangaDetail(mangaId: string): Promise<MangaDetail> {
    // 1. Buscar _id MongoDB pelo slug via API de pesquisa
    const searchRes = await axios.get(`${API}/api/search/manga`, {
      params: { q: mangaId, page: 1, limit: 30, includeAdult: "true" },
      headers: HEADERS,
      timeout: 12_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = searchRes.data?.data?.data ?? [];
    // Preferir correspondência exata de slug; caso contrário, usar o primeiro
    const mangaData = items.find((m: any) => m.slug === mangaId) ?? items[0];
    if (!mangaData) throw new Error(`Mangá não encontrado: ${mangaId}`);

    const dbId: string = mangaData._id;

    // 2. Buscar lista completa de capítulos pelo _id
    const chapRes = await axios.get(`${API}/api/chapter/get-by-manga-id`, {
      params: { mangaId: dbId, all: "true" },
      headers: HEADERS,
      timeout: 12_000,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chaps: any[] = chapRes.data?.data?.data ?? [];

    // A API retorna do mais recente para o mais antigo — mantemos essa ordem (decrescente)
    const chapters = chaps.map((c: any) => ({
      id:          `${mangaId}__${c.chapterNumber}`,
      number:      String(c.chapterNumber),
      title:       c.title ?? `Capítulo ${c.chapterNumber}`,
      url:         `${BASE}/manga/${mangaId}/chapter/${c.chapterNumber}`,
      uploadedAt:  c.releaseDate ?? undefined,
    }));

    const genres: string[] = (mangaData.genres ?? []).map((g: any) => g.name as string);
    const author: string   = mangaData.authors?.[0]?.name ?? "";

    return {
      sourceId:      this.sourceId,
      mangaId,
      title:         mangaData.title,
      cover:         `${CDN}/${mangaId}/cover-md.webp`,
      description:   undefined,
      author:        author || undefined,
      status:        STATUS_MAP[mangaData.status as number] ?? "unknown",
      genres,
      chapters,
    };
  }

  async getChapterPages(chapterId: string): Promise<ChapterPage[]> {
    // chapterId = "mangaSlug__chapterNum"
    const sep = chapterId.indexOf("__");
    if (sep < 0) throw new Error(`chapterId inválido: ${chapterId}`);
    const mangaSlug = chapterId.slice(0, sep);
    const chapNum   = chapterId.slice(sep + 2);

    // A CDN usa dois padrões dependendo da época do upload:
    //  - Novo: https://cdn.leituramanga.net/{slug}/{num}/page-{n}.webp
    //  - Antigo: https://cdn.leituramanga.net/{slug}/capitulo-{num}/page-{n}.webp
    const cdnNew = `${CDN}/${mangaSlug}/${chapNum}`;
    const cdnOld = `${CDN}/${mangaSlug}/capitulo-${chapNum}`;

    // Detectar padrão ativo testando a página 1 em ambos
    let cdnBase = cdnNew;
    try {
      await axios.head(`${cdnNew}/page-1.webp`, {
        headers: { Referer: `${BASE}/` },
        timeout: 6_000,
      });
    } catch {
      // Novo falhou — tentar antigo
      try {
        await axios.head(`${cdnOld}/page-1.webp`, {
          headers: { Referer: `${BASE}/` },
          timeout: 6_000,
        });
        cdnBase = cdnOld;
      } catch {
        // Nenhum padrão respondeu — retornar erro
        throw new Error(`Páginas não encontradas no CDN para ${chapterId}`);
      }
    }

    // Probing paralelo das demais páginas
    const MAX = 60;
    const checks = Array.from({ length: MAX }, (_, i) => i + 2).map(
      async (p): Promise<ChapterPage | null> => {
        const url = `${cdnBase}/page-${p}.webp`;
        try {
          await axios.head(url, {
            headers: { Referer: `${BASE}/` },
            timeout: 5_000,
          });
          return { index: p - 1, imageUrl: url };
        } catch {
          return null;
        }
      }
    );

    const rest = await Promise.all(checks);
    return [
      { index: 0, imageUrl: `${cdnBase}/page-1.webp` },
      ...rest.filter((r): r is ChapterPage => r !== null),
    ];
  }
}

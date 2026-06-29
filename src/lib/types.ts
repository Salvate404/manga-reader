// ─── Fonte de mangá ───────────────────────────────────────────────────────────

export interface MangaSource {
  id: string;
  name: string;
  baseUrl: string;
  language: string;
  enabled: boolean;
}

// ─── Resultado de busca ────────────────────────────────────────────────────────

export interface MangaSearchResult {
  sourceId: string;
  sourceName: string;
  mangaId: string;        // slug ou id único dentro da fonte
  title: string;
  cover: string | null;
  url: string;            // URL original na fonte
  chapterCount?: number;
  lastChapter?: string;
  status?: "ongoing" | "completed" | "hiatus" | "unknown";
  genres?: string[];
}

// ─── Capítulo ─────────────────────────────────────────────────────────────────

export interface Chapter {
  id: string;             // slug ou id único dentro da fonte
  number: string;         // "1", "10.5", etc.
  title?: string;
  url: string;
  uploadedAt?: string;
  pages?: number;
}

// ─── Página do capítulo ────────────────────────────────────────────────────────

export interface ChapterPage {
  index: number;
  imageUrl: string;       // URL original (passada pelo proxy)
  width?: number;
  height?: number;
}

// ─── Detalhe completo do mangá ─────────────────────────────────────────────────

export interface MangaDetail {
  sourceId: string;
  mangaId: string;
  title: string;
  cover: string | null;
  description?: string;
  status?: "ongoing" | "completed" | "hiatus" | "unknown";
  genres?: string[];
  author?: string;
  artist?: string;
  chapters: Chapter[];
}

// ─── Histórico de leitura ─────────────────────────────────────────────────────

export interface ReadingHistoryEntry {
  sourceId: string;
  sourceName: string;
  mangaId: string;
  mangaTitle: string;
  cover: string | null;
  chapterId: string;
  chapterNumber: string;
  chapterTitle?: string;
  readAt: string;         // ISO date string
  page?: number;          // última página lida
}

// ─── Respostas da API ─────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface SearchApiResponse {
  results: MangaSearchResult[];
  sourceErrors: { sourceId: string; error: string }[];
}

export interface ChaptersApiResponse {
  manga: MangaDetail;
}

export interface PagesApiResponse {
  pages: ChapterPage[];
}

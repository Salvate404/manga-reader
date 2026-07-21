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

// ─── Tipo de mídia (filtro Mangá / Anime) ─────────────────────────────────────

export type MediaKind = "manga" | "anime";
export type AnimeAudioType = "dublado" | "legendado" | "unknown";

// ─── Anime ────────────────────────────────────────────────────────────────────

export interface AnimeSource {
  id: string;
  name: string;
  baseUrl: string;
  language: string;
  enabled: boolean;
}

export interface AnimeSearchResult {
  sourceId: string;
  sourceName: string;
  animeId: string;
  title: string;
  cover: string | null;
  url: string;
  episodeCount?: number;
  status?: "ongoing" | "completed" | "hiatus" | "unknown";
  genres?: string[];
  format?: string;
  score?: number;
  year?: number;
  /** Áudio/legenda em português */
  audioType?: AnimeAudioType;
}

export interface AnimeEpisode {
  id: string;
  number: number;
  title?: string;
  description?: string;
  thumbnail?: string | null;
  url?: string;
  duration?: number;
  airedAt?: string;
}

export interface AnimeStreamSource {
  url: string;
  quality: string;
  isM3U8?: boolean;
  isDASH?: boolean;
  /** iframe embed (ex.: Blogger) */
  isEmbed?: boolean;
  /** Áudio deste stream, quando a fonte oferece as duas opções */
  audioType?: "dublado" | "legendado";
}

export interface AnimeSubtitle {
  url: string;
  lang: string;
  label?: string;
}

export interface AnimeEpisodeStreams {
  sources: AnimeStreamSource[];
  subtitles?: AnimeSubtitle[];
  headers?: Record<string, string>;
}

export interface AnimeDetail {
  sourceId: string;
  animeId: string;
  title: string;
  cover: string | null;
  banner?: string | null;
  description?: string;
  status?: "ongoing" | "completed" | "hiatus" | "unknown";
  genres?: string[];
  studios?: string[];
  format?: string;
  score?: number;
  year?: number;
  season?: string;
  episodeCount?: number;
  episodes: AnimeEpisode[];
  audioType?: AnimeAudioType;
}

export interface AnimeWatchHistoryEntry {
  kind: "anime";
  sourceId: string;
  sourceName: string;
  animeId: string;
  animeTitle: string;
  cover: string | null;
  episodeId: string;
  episodeNumber: number;
  episodeTitle?: string;
  watchedAt: string;
  progressSeconds?: number;
}

export interface AnimeSearchApiResponse {
  results: AnimeSearchResult[];
  sourceErrors: { sourceId: string; error: string }[];
}

export interface AnimeDetailApiResponse {
  anime: AnimeDetail;
}

export interface AnimeStreamsApiResponse {
  streams: AnimeEpisodeStreams;
}

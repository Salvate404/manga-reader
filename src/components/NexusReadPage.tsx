"use client";

/**
 * Versão client-side da página de leitura para o NexusToons.
 * Carrega os dados do mangá via /api/nexus/manga/[slug] (rota Edge)
 * direto do browser. O Reader carrega as páginas via /api/nexus/chapter/[id].
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Reader } from "@/components/Reader";
import type { ChaptersApiResponse, MangaDetail } from "@/lib/types";

interface Props {
  sourceId: string;
  mangaSlug: string;
  chapterSlug: string;
}

export function NexusReadPage({ sourceId, mangaSlug, chapterSlug }: Props) {
  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/nexus/manga/${encodeURIComponent(mangaSlug)}`)
      .then((res) => (res.ok ? (res.json() as Promise<ChaptersApiResponse>) : null))
      .then((data) => {
        if (!data?.manga) {
          setNotFound(true);
        } else {
          setManga(data.manga);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [mangaSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !manga) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-zinc-400 text-sm text-center">Capítulo não encontrado.</p>
        <Link href="/" className="text-red-400 text-sm hover:underline">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const chapterIndex = manga.chapters.findIndex((c) => c.id === chapterSlug);
  const chapter = manga.chapters[chapterIndex];

  if (!chapter) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-zinc-400 text-sm text-center">Capítulo não encontrado.</p>
        <Link href={`/manga/${sourceId}/${mangaSlug}`} className="text-red-400 text-sm hover:underline">
          Ver lista de capítulos
        </Link>
      </div>
    );
  }

  const prevChapter = manga.chapters[chapterIndex + 1];
  const nextChapter = manga.chapters[chapterIndex - 1];

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex items-center gap-2 text-xs text-zinc-500 overflow-hidden">
        <Link href="/" className="hover:text-white transition-colors flex-shrink-0">
          Início
        </Link>
        <span>/</span>
        <Link
          href={`/manga/${sourceId}/${mangaSlug}`}
          className="hover:text-white transition-colors truncate max-w-[140px]"
        >
          {manga.title}
        </Link>
        <span className="flex-shrink-0">/</span>
        <span className="text-zinc-400 flex-shrink-0">Cap. {chapter.number}</span>
      </div>

      <Reader
        sourceId={sourceId}
        sourceName="Nexus Toons"
        mangaId={mangaSlug}
        mangaTitle={manga.title}
        cover={manga.cover}
        chapter={chapter}
        prevChapter={prevChapter}
        nextChapter={nextChapter}
      />
    </div>
  );
}

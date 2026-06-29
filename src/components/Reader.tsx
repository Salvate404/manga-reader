"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { ChapterPage, Chapter } from "@/lib/types";
import { updateHistoryPage } from "@/lib/history";

interface ReaderProps {
  sourceId: string;
  mangaId: string;
  chapter: Chapter;
  prevChapter?: Chapter;
  nextChapter?: Chapter;
}

/** Imagem individual de página — se falhar ao carregar, some do layout */
function PageImage({ page, sourceId }: { page: ChapterPage; sourceId: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <Image
      src={`/api/proxy?url=${encodeURIComponent(page.imageUrl)}&sourceId=${sourceId}`}
      alt={`Página ${page.index + 1}`}
      width={page.width ?? 800}
      height={page.height ?? 1200}
      className="w-full h-auto block"
      unoptimized
      loading={page.index < 3 ? "eager" : "lazy"}
      onError={() => setHidden(true)}
    />
  );
}

export function Reader({ sourceId, mangaId, chapter, prevChapter, nextChapter }: ReaderProps) {
  const [pages, setPages] = useState<ChapterPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Carrega as páginas do capítulo
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setPages([]);

    fetch(`/api/pages?sourceId=${sourceId}&chapterId=${encodeURIComponent(chapter.id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar páginas");
        return res.json();
      })
      .then((data) => setPages(data.pages ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [sourceId, chapter.id]);

  // Rastreia a página atual via IntersectionObserver
  useEffect(() => {
    if (!containerRef.current || pages.length === 0) return;
    const images = containerRef.current.querySelectorAll("[data-page-index]");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const idx = Number((visible[0].target as HTMLElement).dataset.pageIndex);
          setCurrentPage(idx);
          updateHistoryPage(sourceId, mangaId, chapter.id, idx);
        }
      },
      { threshold: 0.4 }
    );
    images.forEach((img) => observer.observe(img));
    return () => observer.disconnect();
  }, [pages, sourceId, mangaId, chapter.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">Carregando capítulo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
        <p className="text-red-400 text-sm text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <p className="text-zinc-500 text-sm text-center py-12">
        Nenhuma página encontrada para este capítulo.
      </p>
    );
  }

  return (
    <div>
      {/* Barra superior do leitor */}
      <div className="sticky top-0 z-20 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-sm">
        <span className="text-zinc-400 truncate max-w-[60%]">
          Cap. {chapter.number}
          {chapter.title ? ` — ${chapter.title}` : ""}
        </span>
        <span className="text-zinc-500 text-xs flex-shrink-0">
          {currentPage + 1} / {pages.length}
        </span>
      </div>

      {/* Páginas — scroll vertical contínuo */}
      <div ref={containerRef} className="flex flex-col items-center bg-black">
        {pages.map((page) => (
          <div
            key={page.index}
            data-page-index={page.index}
            className="w-full max-w-2xl"
          >
            <PageImage page={page} sourceId={sourceId} />
          </div>
        ))}
      </div>

      {/* Navegação entre capítulos */}
      <div className="flex gap-3 p-4 bg-zinc-900 border-t border-zinc-800">
        {prevChapter ? (
          <a
            href={`/read/${sourceId}/${mangaId}/${prevChapter.id}`}
            className="flex-1 text-center py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm text-zinc-300 transition-colors"
          >
            ← Cap. {prevChapter.number}
          </a>
        ) : (
          <div className="flex-1" />
        )}
        {nextChapter ? (
          <a
            href={`/read/${sourceId}/${mangaId}/${nextChapter.id}`}
            className="flex-1 text-center py-3 bg-red-600 hover:bg-red-500 rounded-xl text-sm text-white font-medium transition-colors"
          >
            Cap. {nextChapter.number} →
          </a>
        ) : (
          <div className="flex-1 text-center py-3 text-zinc-600 text-sm">
            Último capítulo
          </div>
        )}
      </div>
    </div>
  );
}

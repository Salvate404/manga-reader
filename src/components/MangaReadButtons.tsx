"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getLastReadForManga } from "@/lib/history";
import type { ReadingHistoryEntry } from "@/lib/types";

interface Props {
  sourceId: string;
  mangaId: string;
  firstChapterId?: string;
}

export function MangaReadButtons({ sourceId, mangaId, firstChapterId }: Props) {
  const [lastRead, setLastRead] = useState<ReadingHistoryEntry | undefined>();

  useEffect(() => {
    // Leitura do localStorage — setTimeout garante que não é síncrono no corpo do effect
    const id = setTimeout(() => {
      setLastRead(getLastReadForManga(sourceId, mangaId));
    }, 0);
    return () => clearTimeout(id);
  }, [sourceId, mangaId]);

  // Mostra "Continuar" sempre que há histórico (mesmo sendo o primeiro capítulo)
  const showContinue = !!lastRead;
  const pageLabel = lastRead?.page && lastRead.page > 0 ? ` · pág. ${lastRead.page + 1}` : "";

  return (
    <div className="flex flex-col gap-2 mt-3">
      {showContinue && (
        <Link
          href={`/read/${sourceId}/${mangaId}/${lastRead!.chapterId}`}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
          Cap. {lastRead!.chapterNumber}{pageLabel}
        </Link>
      )}
      {firstChapterId && (
        <Link
          href={`/read/${sourceId}/${mangaId}/${firstChapterId}`}
          className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
          {showContinue ? "Ler do início" : "Começar a ler"}
        </Link>
      )}
    </div>
  );
}

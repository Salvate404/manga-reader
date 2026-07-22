"use client";

import Link from "next/link";
import type { Chapter } from "@/lib/types";

interface ChapterListProps {
  sourceId: string;
  mangaId: string;
  chapters: Chapter[];
  lastReadChapterId?: string;
}

export function ChapterList({ sourceId, mangaId, chapters, lastReadChapterId }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <p className="text-zinc-500 text-sm text-center py-8">
        Nenhum capítulo encontrado.
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {chapters.map((chapter, idx) => {
        const href = `/read/${sourceId}/${encodeURIComponent(mangaId)}/${encodeURIComponent(chapter.id)}`;
        const isLastRead = chapter.id === lastReadChapterId;
        const isEven = idx % 2 === 0;

        return (
          <Link
            key={chapter.id}
            href={href}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors group ${
              isLastRead
                ? "bg-red-950/30 border border-red-900/40 hover:bg-red-950/50"
                : isEven
                  ? "hover:bg-zinc-800/60"
                  : "hover:bg-zinc-800/40"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isLastRead ? (
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-zinc-700 flex-shrink-0 group-hover:bg-zinc-600 transition-colors" />
              )}
              <div className="min-w-0">
                <span className={`text-sm font-medium ${isLastRead ? "text-red-400" : "text-zinc-200 group-hover:text-white"} transition-colors`}>
                  Capítulo {chapter.number}
                </span>
                {chapter.title && chapter.title !== `Capítulo ${chapter.number}` && (
                  <span className="text-zinc-500 text-xs ml-2 truncate">
                    {chapter.title}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
              {chapter.uploadedAt && (
                <span className="text-zinc-600 text-xs hidden sm:block">
                  {formatDate(chapter.uploadedAt)}
                </span>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700 group-hover:text-zinc-500 transition-colors">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
    if (diffDays === 0) return "hoje";
    if (diffDays === 1) return "ontem";
    if (diffDays < 7) return `${diffDays}d atrás`;
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
  } catch {
    return dateStr;
  }
}

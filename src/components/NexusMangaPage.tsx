"use client";

/**
 * Versão client-side da página de detalhes de mangá para o NexusToons.
 * Chama a rota Edge /api/nexus/manga/[slug] diretamente do browser,
 * contornando o salto serverless→edge que falha na Vercel.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChapterList } from "@/components/ChapterList";
import { ProxyImage } from "@/components/ProxyImage";
import { MangaReadButtons } from "@/components/MangaReadButtons";
import { resolveImageUrl } from "@/lib/image-url";
import type { ChaptersApiResponse, MangaDetail } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  ongoing: "Em andamento",
  completed: "Completo",
  hiatus: "Hiato",
  unknown: "Desconhecido",
};

interface Props {
  sourceId: string;
  mangaSlug: string;
}

export function NexusMangaPage({ sourceId, mangaSlug }: Props) {
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !manga) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <p className="text-zinc-400 text-sm text-center">Mangá não encontrado.</p>
        <Link href="/" className="text-red-400 text-sm hover:underline">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const firstChapter = manga.chapters.at(-1);
  const lastChapter = manga.chapters.at(0);

  return (
    <div className="max-w-3xl mx-auto page-enter">
      {/* Header */}
      <div className="relative">
        {manga.cover && (
          <div
            className="absolute inset-0 opacity-10 bg-cover bg-center blur-2xl scale-110"
            style={{ backgroundImage: `url('${resolveImageUrl(manga.cover, sourceId)}')` }}
          />
        )}
        <div className="relative px-4 pt-6 pb-4 flex gap-4">
          <div className="relative w-[110px] h-[160px] flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800 shadow-xl">
            {manga.cover ? (
              <ProxyImage src={manga.cover} sourceId={sourceId} alt={manga.title} fill priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M9 21V9" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h1 className="text-white font-bold text-lg leading-tight mb-1">{manga.title}</h1>
              {manga.author && <p className="text-zinc-400 text-sm">{manga.author}</p>}
              {manga.status && manga.status !== "unknown" && (
                <span className="inline-block mt-2 text-xs font-medium bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                  {STATUS_LABEL[manga.status]}
                </span>
              )}
            </div>
            {/* Botões Ler — inclui 'Continuar' se houver histórico */}
            <MangaReadButtons
              sourceId={sourceId}
              mangaId={mangaSlug}
              firstChapterId={firstChapter?.id}
            />
          </div>
        </div>
      </div>

      {manga.description && (
        <div className="px-4 py-3">
          <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">{manga.description}</p>
        </div>
      )}

      {manga.genres && manga.genres.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {manga.genres.map((genre) => (
            <span key={genre} className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
              {genre}
            </span>
          ))}
        </div>
      )}

      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg">{manga.chapters.length}</p>
          <p className="text-zinc-500 text-xs">Capítulos</p>
        </div>
        <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg truncate">{lastChapter?.number ?? "—"}</p>
          <p className="text-zinc-500 text-xs">Último cap.</p>
        </div>
      </div>

      <div className="px-4 pb-8">
        <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-3">Capítulos</h2>
        <ChapterList sourceId={sourceId} mangaId={mangaSlug} chapters={manga.chapters} />
      </div>
    </div>
  );
}

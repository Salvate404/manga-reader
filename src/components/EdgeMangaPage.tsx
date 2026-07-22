"use client";

/**
 * Página de detalhes client-side para fontes que precisam de rota Edge
 * (NexusToons / MangaFire) — evita 403 do IP serverless na Vercel.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChapterList } from "@/components/ChapterList";
import { ProxyImage } from "@/components/ProxyImage";
import { MangaReadButtons } from "@/components/MangaReadButtons";
import { fetchMangaFireChaptersResponse } from "@/lib/mangafire-api";
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
  detailApiPath: string;
}

export function EdgeMangaPage({ sourceId, mangaSlug, detailApiPath }: Props) {
  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setFailed(false);

    const load =
      sourceId === "mangafire"
        ? // Browser → mangafire.to (CORS). Rotas Vercel tomam 403.
          fetchMangaFireChaptersResponse(mangaSlug)
        : fetch(detailApiPath).then((res) =>
            res.ok ? (res.json() as Promise<ChaptersApiResponse>) : null
          );

    load
      .then((data) => {
        if (!data?.manga) setFailed(true);
        else setManga(data.manga);
      })
      .catch(() => setFailed(true))
      .finally(() => setIsLoading(false));
  }, [detailApiPath, sourceId, mangaSlug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (failed || !manga) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <p className="text-zinc-400 text-sm text-center">
          Não foi possível carregar este mangá.
        </p>
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
      <div className="relative">
        {manga.cover && (
          <div
            className="absolute inset-0 opacity-10 bg-cover bg-center blur-2xl scale-110"
            style={{
              backgroundImage: `url('${resolveImageUrl(manga.cover, sourceId)}')`,
            }}
          />
        )}
        <div className="relative px-4 pt-6 pb-4 flex gap-4">
          <div className="relative w-[110px] h-[160px] flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800 shadow-xl">
            {manga.cover ? (
              <ProxyImage
                src={manga.cover}
                sourceId={sourceId}
                alt={manga.title}
                fill
                priority
              />
            ) : null}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h1 className="text-white font-bold text-lg leading-tight mb-1">
                {manga.title}
              </h1>
              {manga.author && (
                <p className="text-zinc-400 text-sm">{manga.author}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {manga.status && manga.status !== "unknown" && (
                  <span className="text-xs font-medium bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                    {STATUS_LABEL[manga.status]}
                  </span>
                )}
              </div>
            </div>
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
          <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Sinopse
          </h2>
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
            {manga.description}
          </p>
        </div>
      )}

      {manga.genres && manga.genres.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {manga.genres.map((genre) => (
            <span
              key={genre}
              className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full"
            >
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
          <p className="text-white font-bold text-lg truncate">
            {lastChapter?.number ?? "—"}
          </p>
          <p className="text-zinc-500 text-xs">Último cap.</p>
        </div>
      </div>

      <div className="px-4 pb-8">
        <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-3">
          Capítulos
        </h2>
        <ChapterList
          sourceId={sourceId}
          mangaId={manga.mangaId || mangaSlug}
          chapters={manga.chapters}
        />
      </div>
    </div>
  );
}

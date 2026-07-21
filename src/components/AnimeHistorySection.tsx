"use client";

import Link from "next/link";
import { ProxyImage } from "@/components/ProxyImage";
import type { AnimeWatchHistoryEntry } from "@/lib/types";

interface AnimeHistorySectionProps {
  history: AnimeWatchHistoryEntry[];
  onClear: () => void;
}

export function AnimeHistorySection({ history, onClear }: AnimeHistorySectionProps) {
  if (history.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-5">
          Assistidos recentemente
        </h2>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm">Nenhum anime assistido ainda.</p>
          <p className="text-zinc-700 text-xs">Busque acima e escolha um episódio!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
          Assistidos recentemente
        </h2>
        <button
          onClick={onClear}
          className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
        >
          Limpar
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {history.map((entry) => (
          <HistoryCard
            key={`${entry.sourceId}-${entry.animeId}-${entry.episodeId}`}
            entry={entry}
          />
        ))}
      </div>
    </section>
  );
}

function HistoryCard({ entry }: { entry: AnimeWatchHistoryEntry }) {
  const animeHref = `/anime/${entry.sourceId}/${encodeURIComponent(entry.animeId)}`;
  const watchHref = `/watch/${entry.sourceId}/${encodeURIComponent(entry.animeId)}/${encodeURIComponent(entry.episodeId)}`;

  return (
    <div className="group flex flex-col gap-1.5">
      <Link href={animeHref} className="block relative">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
          {entry.cover ? (
            <ProxyImage
              src={entry.cover}
              sourceId={entry.sourceId}
              alt={entry.animeTitle}
              fill
              className="group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6 pb-1.5 px-2">
            <Link
              href={watchHref}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-red-400 font-semibold hover:text-red-300 transition-colors block truncate"
            >
              Ep. {entry.episodeNumber}
            </Link>
          </div>
        </div>
      </Link>
      <p className="text-zinc-300 text-[11px] leading-tight line-clamp-2 font-medium">
        {entry.animeTitle}
      </p>
      <p className="text-zinc-600 text-[10px]">{entry.sourceName}</p>
    </div>
  );
}

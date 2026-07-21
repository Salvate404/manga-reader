"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProxyImage } from "@/components/ProxyImage";
import type { AnimeEpisode } from "@/lib/types";

interface EpisodeListProps {
  sourceId: string;
  animeId: string;
  episodes: AnimeEpisode[];
}

export function EpisodeList({ sourceId, animeId, episodes }: EpisodeListProps) {
  const [order, setOrder] = useState<"desc" | "asc">("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const list = [...episodes];
    list.sort((a, b) =>
      order === "asc" ? a.number - b.number : b.number - a.number
    );
    return list;
  }, [episodes, order]);

  if (episodes.length === 0) {
    return (
      <p className="text-zinc-500 text-sm text-center py-8">
        Nenhum episódio listado ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-zinc-500 text-xs">{episodes.length} episódios</p>
        <button
          type="button"
          onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
          className="text-xs text-zinc-400 hover:text-white transition-colors"
        >
          {order === "asc" ? "Mais antigos ↑" : "Mais recentes ↓"}
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((ep) => {
          const href = `/watch/${sourceId}/${encodeURIComponent(animeId)}/${encodeURIComponent(ep.id)}`;
          const expanded = expandedId === ep.id;

          return (
            <div
              key={ep.id}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
            >
              <div className="flex gap-3 p-3">
                {ep.thumbnail && (
                  <Link
                    href={href}
                    className="relative w-[96px] h-[54px] shrink-0 rounded-lg overflow-hidden bg-zinc-800"
                  >
                    <ProxyImage
                      src={ep.thumbnail}
                      sourceId={sourceId}
                      alt={ep.title || `Ep ${ep.number}`}
                      fill
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="w-7 h-7 rounded-full bg-red-600/90 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white">
                          <polygon points="6 3 20 12 6 21 6 3" />
                        </svg>
                      </span>
                    </span>
                  </Link>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-red-400 text-[11px] font-semibold">
                        Episódio {ep.number}
                      </p>
                      <Link
                        href={href}
                        className="text-white text-sm font-medium leading-snug line-clamp-2 hover:text-red-300 transition-colors"
                      >
                        {ep.title || `Episódio ${ep.number}`}
                      </Link>
                    </div>
                    <Link
                      href={href}
                      className="shrink-0 text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      Assistir
                    </Link>
                  </div>

                  {ep.description && (
                    <>
                      <p
                        className={`text-zinc-500 text-xs mt-1.5 leading-relaxed ${
                          expanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {ep.description}
                      </p>
                      {ep.description.length > 120 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? null : ep.id)
                          }
                          className="text-[11px] text-zinc-400 hover:text-white mt-1"
                        >
                          {expanded ? "Ver menos" : "Ver sinopse"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

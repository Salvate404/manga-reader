"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLastWatchedForAnime } from "@/lib/anime/history";

interface AnimeWatchButtonsProps {
  sourceId: string;
  animeId: string;
  firstEpisodeId?: string;
}

export function AnimeWatchButtons({
  sourceId,
  animeId,
  firstEpisodeId,
}: AnimeWatchButtonsProps) {
  const [continueId, setContinueId] = useState<string | null>(null);
  const [continueNumber, setContinueNumber] = useState<number | null>(null);

  useEffect(() => {
    const last = getLastWatchedForAnime(sourceId, animeId);
    if (last) {
      setContinueId(last.episodeId);
      setContinueNumber(last.episodeNumber);
    }
  }, [sourceId, animeId]);

  const startHref = firstEpisodeId
    ? `/watch/${sourceId}/${encodeURIComponent(animeId)}/${encodeURIComponent(firstEpisodeId)}`
    : null;
  const continueHref = continueId
    ? `/watch/${sourceId}/${encodeURIComponent(animeId)}/${encodeURIComponent(continueId)}`
    : null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {continueHref && (
        <Link
          href={continueHref}
          className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          Continuar ep. {continueNumber}
        </Link>
      )}
      {startHref && (
        <Link
          href={startHref}
          className={`${
            continueHref
              ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              : "bg-red-600 hover:bg-red-500 text-white"
          } text-sm font-semibold px-4 py-2 rounded-xl transition-colors`}
        >
          {continueHref ? "Começar do início" : "Assistir"}
        </Link>
      )}
    </div>
  );
}

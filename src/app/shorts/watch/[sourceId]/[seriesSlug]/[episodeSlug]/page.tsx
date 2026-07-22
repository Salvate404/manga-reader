"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { VideoPlayer } from "@/components/VideoPlayer";
import type {
  AnimeEpisodeStreams,
  ShortDetail,
  ShortDetailApiResponse,
  ShortStreamsApiResponse,
} from "@/lib/types";

function resolveEpisode(series: ShortDetail, episodeId: string) {
  return (
    series.episodes.find((e) => e.id === episodeId) ||
    series.episodes.find((e) => decodeURIComponent(e.id) === episodeId) ||
    series.episodes.find((e) => e.id === decodeURIComponent(episodeId)) ||
    series.episodes.find((e) => {
      const m = episodeId.match(/(?:^|[:\-_/])(\d+)$/);
      return m ? e.number === Number(m[1]) : false;
    })
  );
}

export default function ShortsWatchPage() {
  const params = useParams<{
    sourceId: string;
    seriesSlug: string;
    episodeSlug: string;
  }>();
  const sourceId = params.sourceId;
  const seriesId = decodeURIComponent(params.seriesSlug);
  const episodeId = decodeURIComponent(params.episodeSlug);

  const [series, setSeries] = useState<ShortDetail | null>(null);
  const [streams, setStreams] = useState<AnimeEpisodeStreams | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStreams(null);

    async function load() {
      try {
        const detailRes = await fetch(
          `/api/shorts/detail?sourceId=${encodeURIComponent(sourceId)}&seriesId=${encodeURIComponent(seriesId)}`
        );
        if (!detailRes.ok) throw new Error("Não foi possível carregar a série");
        const detailJson = (await detailRes.json()) as ShortDetailApiResponse;
        if (cancelled) return;
        setSeries(detailJson.series);

        const ep = resolveEpisode(detailJson.series, episodeId);
        const streamEpisodeId = ep?.id || episodeId;

        const streamRes = await fetch(
          `/api/shorts/streams?sourceId=${encodeURIComponent(sourceId)}&episodeId=${encodeURIComponent(streamEpisodeId)}`
        );
        if (!streamRes.ok) {
          const errJson = (await streamRes.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(errJson?.error || "Vídeo indisponível");
        }
        const streamJson = (await streamRes.json()) as ShortStreamsApiResponse;
        if (!cancelled) setStreams(streamJson.streams);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sourceId, seriesId, episodeId]);

  const episode = useMemo(() => {
    if (!series) return undefined;
    return resolveEpisode(series, episodeId);
  }, [series, episodeId]);

  const sortedEps = useMemo(() => {
    if (!series) return [];
    return [...series.episodes].sort((a, b) => a.number - b.number);
  }, [series]);

  const currentIndex = sortedEps.findIndex((e) => e.id === episode?.id);
  const prev = currentIndex > 0 ? sortedEps[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < sortedEps.length - 1
      ? sortedEps[currentIndex + 1]
      : null;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 page-enter">
        <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="aspect-video bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 page-enter">
      <div className="mb-3">
        <BackLink label="Voltar" />
      </div>

      <div className="mb-3">
        <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-0.5">
          Short Drama ·{" "}
          {sourceId === "flextv" || sourceId === "dramashorts" ? "PT-BR" : "EN"}
        </p>
        <h1 className="text-white font-semibold text-base leading-snug">
          {series?.title ?? "…"}
          {episode ? (
            <span className="text-zinc-400 font-normal">
              {" "}
              · Ep. {episode.number}
            </span>
          ) : null}
        </h1>
      </div>

      {error ? (
        <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 text-red-300 text-sm mb-4">
          {error}
        </div>
      ) : null}

      {streams ? <VideoPlayer streams={streams} layout="portrait" /> : null}

      <div className="flex gap-2 mt-4">
        {prev ? (
          <Link
            href={`/shorts/watch/${sourceId}/${encodeURIComponent(seriesId)}/${encodeURIComponent(prev.id)}`}
            className="flex-1 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            ← Ep. {prev.number}
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/shorts/watch/${sourceId}/${encodeURIComponent(seriesId)}/${encodeURIComponent(next.id)}`}
            className="flex-1 text-center bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Ep. {next.number} →
          </Link>
        ) : null}
      </div>

      {series ? (
        <div className="mt-4">
          <Link
            href={`/shorts/${sourceId}/${encodeURIComponent(seriesId)}`}
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Ver todos os episódios
          </Link>
        </div>
      ) : null}
    </div>
  );
}

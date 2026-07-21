"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { VideoPlayer } from "@/components/VideoPlayer";
import { addToAnimeHistory } from "@/lib/anime/history";
import { titleMatchScore } from "@/lib/anime/title-match";
import type {
  AnimeDetail,
  AnimeDetailApiResponse,
  AnimeEpisodeStreams,
  AnimeSearchResult,
  AnimeStreamsApiResponse,
} from "@/lib/types";

type AudioOpt = "dublado" | "legendado";

function resolveEpisode(anime: AnimeDetail, episodeId: string) {
  return (
    anime.episodes.find((e) => e.id === episodeId) ||
    anime.episodes.find((e) => decodeURIComponent(e.id) === episodeId) ||
    anime.episodes.find((e) => e.id === decodeURIComponent(episodeId)) ||
    anime.episodes.find((e) => {
      const m = episodeId.match(/(?:^|[:\-_/])(\d+)$/);
      return m ? e.number === Number(m[1]) : false;
    })
  );
}

function searchQueryFromTitle(title: string): string {
  return title
    .replace(/\(dublado\)|\(legendado\)/gi, "")
    .replace(/\bdublado\b|\blegendado\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchStreamsForEpisode(
  sourceId: string,
  anime: AnimeDetail,
  episodeId: string,
  episodeNumber?: number
): Promise<AnimeEpisodeStreams> {
  const streamUrl = new URL("/api/anime/streams", location.origin);
  streamUrl.searchParams.set("sourceId", sourceId);
  streamUrl.searchParams.set("episodeId", episodeId);
  streamUrl.searchParams.set("title", anime.title);
  if (episodeNumber != null) {
    streamUrl.searchParams.set("episodeNumber", String(episodeNumber));
  }
  if (anime.audioType) {
    streamUrl.searchParams.set("audioType", anime.audioType);
  }
  const streamRes = await fetch(streamUrl.toString());
  if (!streamRes.ok) {
    const errJson = (await streamRes.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(errJson?.error || "Vídeo indisponível nesta fonte");
  }
  const streamJson = (await streamRes.json()) as AnimeStreamsApiResponse;
  return streamJson.streams;
}

export default function WatchPage() {
  const params = useParams<{
    sourceId: string;
    animeSlug: string;
    episodeSlug: string;
  }>();

  const sourceId = params.sourceId;
  const animeId = decodeURIComponent(params.animeSlug);
  const episodeId = decodeURIComponent(params.episodeSlug);

  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [streams, setStreams] = useState<AnimeEpisodeStreams | null>(null);
  const [alternatives, setAlternatives] = useState<AnimeSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [externalAudioMap, setExternalAudioMap] = useState<
    Partial<Record<AudioOpt, { animeId: string; anime: AnimeDetail }>>
  >({});
  const [activeExternalAudio, setActiveExternalAudio] = useState<AudioOpt | null>(
    null
  );
  const [switchingAudio, setSwitchingAudio] = useState(false);
  const [resumeAt, setResumeAt] = useState(0);
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null);
  const playbackTimeRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAlternatives([]);
    setStreams(null);
    setExternalAudioMap({});
    setActiveExternalAudio(null);
    setResumeAt(0);
    setEpisodeNumber(null);
    playbackTimeRef.current = 0;

    async function load() {
      try {
        const detailRes = await fetch(
          `/api/anime/detail?sourceId=${encodeURIComponent(sourceId)}&animeId=${encodeURIComponent(animeId)}`
        );

        if (!detailRes.ok) throw new Error("Não foi possível carregar o anime");
        const detailJson = (await detailRes.json()) as AnimeDetailApiResponse;
        if (cancelled) return;
        setAnime(detailJson.anime);

        const ep = resolveEpisode(detailJson.anime, episodeId);
        const streamEpisodeId = ep?.id || episodeId;
        if (!cancelled && ep?.number != null) setEpisodeNumber(ep.number);

        try {
          const streamData = await fetchStreamsForEpisode(
            sourceId,
            detailJson.anime,
            streamEpisodeId,
            ep?.number
          );
          if (!cancelled) setStreams(streamData);
        } catch (streamErr) {
          if (!cancelled) {
            setStreams(null);
            setError(
              streamErr instanceof Error
                ? streamErr.message
                : "Vídeo indisponível nesta fonte. Não buscamos automaticamente em outro site."
            );
          }
          // alternatives via streams API error path — refetch with same params for alternatives
          const streamUrl = new URL("/api/anime/streams", location.origin);
          streamUrl.searchParams.set("sourceId", sourceId);
          streamUrl.searchParams.set("episodeId", streamEpisodeId);
          streamUrl.searchParams.set("title", detailJson.anime.title);
          if (ep?.number != null) {
            streamUrl.searchParams.set("episodeNumber", String(ep.number));
          }
          const streamRes = await fetch(streamUrl.toString());
          if (!streamRes.ok) {
            const errJson = (await streamRes.json().catch(() => null)) as {
              alternatives?: AnimeSearchResult[];
            } | null;
            if (!cancelled) setAlternatives(errJson?.alternatives ?? []);
          }
        }

        const currentAudio =
          detailJson.anime.audioType === "dublado" ||
          detailJson.anime.audioType === "legendado"
            ? detailJson.anime.audioType
            : null;
        if (!cancelled) setActiveExternalAudio(currentAudio);

        addToAnimeHistory({
          sourceId,
          sourceName:
            sourceId === "animefire"
              ? "AnimeFire"
              : sourceId === "goyabu"
                ? "Goyabu"
                : sourceId === "animesonline"
                  ? "AnimesOnline"
                  : sourceId === "anilist"
                    ? "AniList"
                    : sourceId,
          animeId,
          animeTitle: detailJson.anime.title,
          cover: detailJson.anime.cover,
          episodeId: streamEpisodeId,
          episodeNumber: ep?.number ?? 0,
          episodeTitle: ep?.title,
        });

        // Busca versão com áudio oposto na mesma fonte (AnimeFire / Goyabu)
        const q = searchQueryFromTitle(detailJson.anime.title);
        if (q && currentAudio) {
          try {
            const searchRes = await fetch(
              `/api/anime/search?q=${encodeURIComponent(q)}&sources=${encodeURIComponent(sourceId)}`
            );
            if (searchRes.ok) {
              const searchJson = (await searchRes.json()) as {
                results?: AnimeSearchResult[];
              };
              const opposite: AudioOpt =
                currentAudio === "dublado" ? "legendado" : "dublado";
              const hit = (searchJson.results || [])
                .filter(
                  (r) =>
                    r.sourceId === sourceId &&
                    r.animeId !== animeId &&
                    r.audioType === opposite &&
                    titleMatchScore(r.title, detailJson.anime.title) >= 90
                )
                .sort(
                  (a, b) =>
                    titleMatchScore(b.title, detailJson.anime.title) -
                    titleMatchScore(a.title, detailJson.anime.title)
                )[0];

              if (hit && !cancelled) {
                const altDetailRes = await fetch(
                  `/api/anime/detail?sourceId=${encodeURIComponent(sourceId)}&animeId=${encodeURIComponent(hit.animeId)}`
                );
                if (altDetailRes.ok) {
                  const altJson =
                    (await altDetailRes.json()) as AnimeDetailApiResponse;
                  if (!cancelled) {
                    setExternalAudioMap({
                      [currentAudio]: {
                        animeId,
                        anime: detailJson.anime,
                      },
                      [opposite]: {
                        animeId: hit.animeId,
                        anime: altJson.anime,
                      },
                    });
                  }
                }
              }
            }
          } catch {
            // sem versão alternativa — ok
          }
        }
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
  }, [sourceId, animeId, episodeId]);

  const episode = useMemo(() => {
    if (!anime) return undefined;
    const byId = resolveEpisode(anime, episodeId);
    if (byId) return byId;
    if (episodeNumber != null) {
      return anime.episodes.find((e) => e.number === episodeNumber);
    }
    return undefined;
  }, [anime, episodeId, episodeNumber]);

  const sortedEps = useMemo(() => {
    if (!anime) return [];
    return [...anime.episodes].sort((a, b) => a.number - b.number);
  }, [anime]);

  const currentIndex = sortedEps.findIndex(
    (e) =>
      e.id === episode?.id ||
      (episodeNumber != null && e.number === episodeNumber) ||
      e.id === episodeId
  );
  const prev = currentIndex > 0 ? sortedEps[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < sortedEps.length - 1
      ? sortedEps[currentIndex + 1]
      : null;

  const navAnimeId =
    (activeExternalAudio &&
      externalAudioMap[activeExternalAudio]?.animeId) ||
    animeId;

  const externalAudioOptions = useMemo(() => {
    return (Object.keys(externalAudioMap) as AudioOpt[]).filter(
      (k) => externalAudioMap[k]
    );
  }, [externalAudioMap]);

  const hasInternalDual = useMemo(() => {
    if (!streams) return false;
    const set = new Set(
      streams.sources
        .map((s) => s.audioType)
        .filter((a): a is AudioOpt => a === "dublado" || a === "legendado")
    );
    return set.size > 1;
  }, [streams]);

  const handleExternalAudioChange = useCallback(
    async (next: AudioOpt) => {
      if (hasInternalDual) return;
      const entry = externalAudioMap[next];
      if (!entry || next === activeExternalAudio) return;

      const epNum = episode?.number;
      const targetEp =
        epNum != null
          ? entry.anime.episodes.find((e) => e.number === epNum)
          : undefined;
      if (!targetEp) {
        setError(`Episódio ${epNum ?? "?"} não encontrado na versão ${next}`);
        return;
      }

      setSwitchingAudio(true);
      setResumeAt(playbackTimeRef.current);
      try {
        const nextStreams = await fetchStreamsForEpisode(
          sourceId,
          entry.anime,
          targetEp.id,
          targetEp.number
        );
        setAnime(entry.anime);
        setStreams(nextStreams);
        setActiveExternalAudio(next);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar a outra versão de áudio"
        );
      } finally {
        setSwitchingAudio(false);
      }
    },
    [
      hasInternalDual,
      externalAudioMap,
      activeExternalAudio,
      episode?.number,
      sourceId,
    ]
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 page-enter space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <BackLink className="text-xs" label="Voltar" />
          <p className="text-zinc-500 text-sm mt-2 truncate">
            {anime?.title || "…"}
          </p>
          <p className="text-zinc-600 text-[11px] mt-0.5 uppercase tracking-wider">
            Fonte: {sourceId}
            {activeExternalAudio
              ? ` · ${activeExternalAudio === "dublado" ? "Dublado" : "Legendado"}`
              : ""}
          </p>
          <h1 className="text-white font-bold text-lg mt-1">
            {episode
              ? `Ep. ${episode.number}${episode.title ? ` — ${episode.title}` : ""}`
              : "Carregando episódio…"}
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="aspect-video bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
      ) : streams ? (
        <VideoPlayer
          streams={streams}
          resumeAt={resumeAt}
          onTimeUpdate={(t) => {
            playbackTimeRef.current = t;
          }}
          externalAudioOptions={
            hasInternalDual ? [] : externalAudioOptions
          }
          activeExternalAudio={
            hasInternalDual ? null : activeExternalAudio
          }
          onExternalAudioChange={
            hasInternalDual ? undefined : handleExternalAudioChange
          }
          switchingAudio={switchingAudio}
        />
      ) : (
        <div className="space-y-3">
          <div className="aspect-video bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 text-sm px-6 text-center">
            {error || "Sem stream disponível"}
          </div>
          {alternatives.length > 0 && (
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-2">
              <p className="text-zinc-300 text-sm font-medium">
                Mesma obra em outra fonte — abra lá e escolha o episódio:
              </p>
              <div className="flex flex-col gap-2">
                {alternatives.map((alt) => (
                  <Link
                    key={`${alt.sourceId}-${alt.animeId}`}
                    href={`/anime/${alt.sourceId}/${encodeURIComponent(alt.animeId)}`}
                    className="text-sm text-red-300 hover:text-red-200 underline-offset-2 hover:underline"
                  >
                    {alt.sourceName}: {alt.title}
                    {alt.audioType && alt.audioType !== "unknown"
                      ? ` (${alt.audioType === "dublado" ? "Dublado" : "Legendado"})`
                      : ""}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {episode?.description && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Sinopse do episódio
          </h2>
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
            {episode.description}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {prev ? (
          <Link
            href={`/watch/${sourceId}/${encodeURIComponent(navAnimeId)}/${encodeURIComponent(prev.id)}`}
            className="flex-1 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            ← Ep. {prev.number}
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/watch/${sourceId}/${encodeURIComponent(navAnimeId)}/${encodeURIComponent(next.id)}`}
            className="flex-1 text-center bg-red-600 hover:bg-red-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            Ep. {next.number} →
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimeEpisodeStreams, AnimeStreamSource } from "@/lib/types";

type AudioOpt = "dublado" | "legendado";

interface VideoPlayerProps {
  streams: AnimeEpisodeStreams;
  /** Restaura posição ao trocar de conjunto de streams (ex.: outra página dublado/legendado) */
  resumeAt?: number;
  onTimeUpdate?: (seconds: number) => void;
  /** Áudios extras (outra página da mesma obra) que o player pode pedir */
  externalAudioOptions?: AudioOpt[];
  activeExternalAudio?: AudioOpt | null;
  onExternalAudioChange?: (audio: AudioOpt) => void;
  switchingAudio?: boolean;
  /** Short drama vertical (9:16); padrão landscape 16:9 */
  layout?: "landscape" | "portrait";
}

function pickPreferred(sources: AnimeStreamSource[]): AnimeStreamSource | undefined {
  return (
    sources.find((s) => !s.isEmbed && /720/.test(s.quality)) ||
    sources.find((s) => !s.isEmbed) ||
    sources[0]
  );
}

function sourceKey(s: AnimeStreamSource): string {
  return `${s.audioType || ""}|${s.quality}|${s.url}`;
}

export function VideoPlayer({
  streams,
  resumeAt = 0,
  onTimeUpdate,
  externalAudioOptions = [],
  activeExternalAudio = null,
  onExternalAudioChange,
  switchingAudio = false,
  layout = "landscape",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resumeRef = useRef<{ time: number; play: boolean } | null>(null);
  const lastStreamsId = useRef<string>("");
  const [error, setError] = useState<string | null>(null);

  const audioFromStreams = useMemo(() => {
    const set = new Set<AudioOpt>();
    for (const s of streams.sources) {
      if (s.audioType === "dublado" || s.audioType === "legendado") {
        set.add(s.audioType);
      }
    }
    return set;
  }, [streams.sources]);

  const hasInternalDual = audioFromStreams.size > 1;
  const audioOptions = useMemo(() => {
    const opts = new Set<AudioOpt>(audioFromStreams);
    for (const a of externalAudioOptions) opts.add(a);
    return Array.from(opts);
  }, [audioFromStreams, externalAudioOptions]);

  const [audio, setAudio] = useState<AudioOpt | "all">(() => {
    if (audioFromStreams.size > 1) {
      return audioFromStreams.has("legendado") ? "legendado" : "dublado";
    }
    if (activeExternalAudio) return activeExternalAudio;
    const first = streams.sources.find((s) => s.audioType)?.audioType;
    return first || "all";
  });

  const filtered = useMemo(() => {
    if (audio === "all" || !hasInternalDual) return streams.sources;
    const match = streams.sources.filter((s) => s.audioType === audio);
    return match.length ? match : streams.sources;
  }, [streams.sources, audio, hasInternalDual]);

  const [sourceUrl, setSourceUrl] = useState(
    () => pickPreferred(filtered)?.url || filtered[0]?.url || ""
  );

  // Quando o conjunto de streams muda (ex.: trocou áudio externo), reaplica preferência + resume
  useEffect(() => {
    const id = streams.sources.map((s) => s.url).join("|");
    if (id === lastStreamsId.current) return;
    lastStreamsId.current = id;

    const preferred = pickPreferred(filtered) || filtered[0];
    if (preferred) setSourceUrl(preferred.url);

    if (resumeAt > 0) {
      resumeRef.current = { time: resumeAt, play: true };
    }
  }, [streams.sources, filtered, resumeAt]);

  useEffect(() => {
    if (activeExternalAudio && !hasInternalDual) {
      setAudio(activeExternalAudio);
    }
  }, [activeExternalAudio, hasInternalDual]);

  const current =
    filtered.find((s) => s.url === sourceUrl) ||
    pickPreferred(filtered) ||
    filtered[0];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current || current.isEmbed) return;

    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    setError(null);

    const saved = resumeRef.current;
    resumeRef.current = null;

    async function attach() {
      if (!video || !current) return;

      const restore = () => {
        if (!saved || saved.time <= 0) return;
        const t = Math.max(0, saved.time - 0.25);
        const apply = () => {
          try {
            video.currentTime = t;
          } catch {
            /* ignore */
          }
          if (saved.play) {
            void video.play().catch(() => undefined);
          }
        };
        if (video.readyState >= 1) apply();
        else video.addEventListener("loadedmetadata", apply, { once: true });
      };

      if (current.isM3U8 || current.url.includes(".m3u8")) {
        const Hls = (await import("hls.js")).default;
        if (cancelled) return;

        if (Hls.isSupported()) {
          const instance = new Hls({
            enableWorker: true,
            xhrSetup: streams.headers
              ? (xhr) => {
                  for (const [k, v] of Object.entries(streams.headers!)) {
                    xhr.setRequestHeader(k, v);
                  }
                }
              : undefined,
          });
          instance.loadSource(current.url);
          instance.attachMedia(video);
          instance.on(Hls.Events.MANIFEST_PARSED, () => restore());
          instance.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) setError("Falha ao carregar o stream HLS");
          });
          hls = instance;
          return;
        }

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = current.url;
          restore();
          return;
        }

        setError("Seu navegador não suporta HLS");
        return;
      }

      video.src = current.url;
      restore();
    }

    attach();

    return () => {
      cancelled = true;
      hls?.destroy();
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [current?.url, current?.isEmbed, current?.isM3U8, streams.headers]);

  function switchSource(next: AnimeStreamSource) {
    if (next.url === current?.url) return;
    const video = videoRef.current;
    if (video && !current?.isEmbed) {
      resumeRef.current = {
        time: video.currentTime || 0,
        play: !video.paused,
      };
    }
    setSourceUrl(next.url);
  }

  function switchInternalAudio(next: AudioOpt) {
    if (next === audio) return;
    const video = videoRef.current;
    if (video && !current?.isEmbed) {
      resumeRef.current = {
        time: video.currentTime || 0,
        play: !video.paused,
      };
    }
    setAudio(next);
    const pool = streams.sources.filter((s) => s.audioType === next);
    const preferred = pickPreferred(pool) || pool[0];
    if (preferred) setSourceUrl(preferred.url);
  }

  function handleAudioClick(next: AudioOpt) {
    if (hasInternalDual && audioFromStreams.has(next)) {
      switchInternalAudio(next);
      return;
    }
    if (onExternalAudioChange) {
      const video = videoRef.current;
      if (video && !current?.isEmbed) {
        onTimeUpdate?.(video.currentTime || 0);
      }
      onExternalAudioChange(next);
    }
  }

  if (!current) {
    return (
      <div
        className={`${
          layout === "portrait"
            ? "mx-auto w-full max-w-[420px] aspect-[9/16]"
            : "aspect-video"
        } bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 text-sm`}
      >
        Nenhum stream disponível
      </div>
    );
  }

  const qualities = filtered.filter(
    (s, i, arr) => arr.findIndex((x) => x.url === s.url) === i
  );

  const frameClass =
    layout === "portrait"
      ? "relative mx-auto w-full max-w-[420px] aspect-[9/16] max-h-[min(80vh,720px)] bg-black rounded-xl overflow-hidden border border-zinc-800"
      : "relative aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800";

  return (
    <div className="space-y-2">
      <div className={frameClass}>
        {current.isEmbed ? (
          <iframe
            key={current.url}
            src={current.url}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            controls
            playsInline
            autoPlay
            onTimeUpdate={() => {
              const t = videoRef.current?.currentTime;
              if (t != null) onTimeUpdate?.(t);
            }}
          />
        )}
        {(error || switchingAudio) && !current.isEmbed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm px-4 text-center">
            {switchingAudio ? (
              <span className="text-zinc-300">Trocando áudio…</span>
            ) : (
              <span className="text-red-300">{error}</span>
            )}
          </div>
        )}
      </div>

      {audioOptions.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 text-xs">Áudio:</span>
          {audioOptions.map((a) => {
            const selected =
              (hasInternalDual && audio === a) ||
              (!hasInternalDual && activeExternalAudio === a) ||
              (!hasInternalDual && !activeExternalAudio && audio === a);
            return (
              <button
                key={a}
                type="button"
                disabled={switchingAudio}
                onClick={() => handleAudioClick(a)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                  selected
                    ? "bg-red-600/20 border-red-500/60 text-red-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white"
                }`}
              >
                {a === "dublado" ? "Dublado" : "Legendado"}
              </button>
            );
          })}
        </div>
      )}

      {qualities.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 text-xs">Qualidade:</span>
          {qualities.map((s) => (
            <button
              key={sourceKey(s)}
              type="button"
              onClick={() => switchSource(s)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                s.url === current.url
                  ? "bg-red-600/20 border-red-500/60 text-red-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white"
              }`}
            >
              {s.quality}
              {s.isEmbed ? " (embed)" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

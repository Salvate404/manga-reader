import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { EpisodeList } from "@/components/EpisodeList";
import { ProxyImage } from "@/components/ProxyImage";
import { getShortDetail, getShortsSource } from "@/lib/shorts/service";
import { resolveImageUrl } from "@/lib/image-url";

interface ShortsPageProps {
  params: Promise<{ sourceId: string; seriesSlug: string }>;
}

export const maxDuration = 30;

export default async function ShortsSeriesPage({ params }: ShortsPageProps) {
  const { sourceId, seriesSlug } = await params;
  if (!getShortsSource(sourceId)) notFound();

  const seriesId = decodeURIComponent(seriesSlug);
  const series = await getShortDetail(sourceId, seriesId);
  if (!series) notFound();

  const firstEpisode = [...series.episodes].sort((a, b) => a.number - b.number)[0];
  const lastEpisode = [...series.episodes].sort((a, b) => b.number - a.number)[0];
  const startHref = firstEpisode
    ? `/shorts/watch/${sourceId}/${encodeURIComponent(seriesId)}/${encodeURIComponent(firstEpisode.id)}`
    : null;

  const langLabel =
    sourceId === "flextv" || sourceId === "dramashorts" ? "PT-BR" : "EN";

  return (
    <div className="max-w-3xl mx-auto page-enter">
      <div className="px-4 pt-4 pb-1">
        <BackLink label="Voltar" />
      </div>

      <div className="relative">
        {series.cover ? (
          <div
            className="absolute inset-0 opacity-15 bg-cover bg-center blur-2xl scale-110"
            style={{
              backgroundImage: `url('${resolveImageUrl(series.cover, sourceId)}')`,
            }}
          />
        ) : null}

        <div className="relative px-4 pt-3 pb-4 flex gap-4">
          <div className="relative w-[110px] h-[160px] flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800 shadow-xl">
            {series.cover ? (
              <ProxyImage
                src={series.cover}
                sourceId={sourceId}
                alt={series.title}
                fill
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <p className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider mb-1">
                Short Drama · {langLabel}
              </p>
              <h1 className="text-white font-bold text-lg leading-tight mb-1">
                {series.title}
              </h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {series.format && (
                  <span className="text-xs font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                    {series.format}
                  </span>
                )}
              </div>
            </div>

            {startHref && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Link
                  href={startHref}
                  className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  Assistir
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {series.description && (
        <div className="px-4 py-3">
          <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Sinopse
          </h2>
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
            {series.description}
          </p>
        </div>
      )}

      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg">
            {series.episodeCount ?? series.episodes.length}
          </p>
          <p className="text-zinc-500 text-xs">Episódios</p>
        </div>
        <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg truncate">
            {lastEpisode?.number ?? "—"}
          </p>
          <p className="text-zinc-500 text-xs">Último ep.</p>
        </div>
      </div>

      <div className="px-4 pb-8">
        <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-3">
          Episódios
        </h2>
        <EpisodeList
          sourceId={sourceId}
          animeId={seriesId}
          episodes={series.episodes}
          watchBase={`/shorts/watch/${sourceId}`}
        />
      </div>
    </div>
  );
}

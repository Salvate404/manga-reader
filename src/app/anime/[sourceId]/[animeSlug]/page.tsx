import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { EpisodeList } from "@/components/EpisodeList";
import { ProxyImage } from "@/components/ProxyImage";
import { AnimeWatchButtons } from "@/components/AnimeWatchButtons";
import { getAnimeDetail } from "@/lib/anime/anime-service";
import { resolveImageUrl } from "@/lib/image-url";

interface AnimePageProps {
  params: Promise<{ sourceId: string; animeSlug: string }>;
}

export const maxDuration = 30;

export default async function AnimePage({ params }: AnimePageProps) {
  const { sourceId, animeSlug } = await params;
  const animeId = decodeURIComponent(animeSlug);
  const anime = await getAnimeDetail(sourceId, animeId);

  if (!anime) notFound();

  const firstEpisode = [...anime.episodes].sort((a, b) => a.number - b.number)[0];
  const lastEpisode = [...anime.episodes].sort((a, b) => b.number - a.number)[0];

  const STATUS_LABEL: Record<string, string> = {
    ongoing: "Em andamento",
    completed: "Completo",
    hiatus: "Hiato",
    unknown: "Desconhecido",
  };

  return (
    <div className="max-w-3xl mx-auto page-enter">
      <div className="px-4 pt-4 pb-1">
        <BackLink label="Voltar" />
      </div>

      <div className="relative">
        {anime.banner || anime.cover ? (
          <div
            className="absolute inset-0 opacity-15 bg-cover bg-center blur-2xl scale-110"
            style={{
              backgroundImage: `url('${resolveImageUrl(anime.banner || anime.cover, sourceId)}')`,
            }}
          />
        ) : null}

        <div className="relative px-4 pt-3 pb-4 flex gap-4">
          <div className="relative w-[110px] h-[160px] flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800 shadow-xl">
            {anime.cover ? (
              <ProxyImage
                src={anime.cover}
                sourceId={sourceId}
                alt={anime.title}
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
                Anime · PT-BR
              </p>
              <h1 className="text-white font-bold text-lg leading-tight mb-1">
                {anime.title}
              </h1>
              {anime.studios && anime.studios.length > 0 && (
                <p className="text-zinc-400 text-sm">{anime.studios.join(", ")}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {anime.audioType && anime.audioType !== "unknown" && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    anime.audioType === "dublado"
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-sky-500/15 text-sky-300"
                  }`}>
                    {anime.audioType === "dublado" ? "Dublado" : "Legendado"}
                  </span>
                )}
                {anime.status && anime.status !== "unknown" && (
                  <span className="text-xs font-medium bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                    {STATUS_LABEL[anime.status]}
                  </span>
                )}
                {anime.format && (
                  <span className="text-xs font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                    {anime.format}
                  </span>
                )}
                {anime.year && (
                  <span className="text-xs font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                    {anime.year}
                  </span>
                )}
                {anime.score != null && (
                  <span className="text-xs font-medium bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                    ★ {anime.score.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            <AnimeWatchButtons
              sourceId={sourceId}
              animeId={animeId}
              firstEpisodeId={firstEpisode?.id}
            />
          </div>
        </div>
      </div>

      {anime.description && (
        <div className="px-4 py-3">
          <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Sinopse
          </h2>
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
            {anime.description}
          </p>
        </div>
      )}

      {anime.genres && anime.genres.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {anime.genres.map((genre) => (
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
          <p className="text-white font-bold text-lg">
            {anime.episodeCount ?? anime.episodes.length}
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
          animeId={animeId}
          episodes={anime.episodes}
        />
      </div>
    </div>
  );
}

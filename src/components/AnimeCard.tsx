import Link from "next/link";
import { ProxyImage } from "@/components/ProxyImage";
import type { AnimeSearchResult } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  ongoing: "Em andamento",
  completed: "Completo",
  hiatus: "Hiato",
  unknown: "",
};

const STATUS_COLOR: Record<string, string> = {
  ongoing: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  completed: "text-sky-400 bg-sky-400/10 border-sky-400/30",
  hiatus: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  unknown: "",
};

const SOURCE_COLOR: Record<string, string> = {
  animefire: "text-emerald-400 bg-emerald-400/10",
  goyabu: "text-orange-400 bg-orange-400/10",
  animesonline: "text-cyan-400 bg-cyan-400/10",
  anilist: "text-blue-400 bg-blue-400/10",
  animeunity: "text-rose-400 bg-rose-400/10",
};

const AUDIO_LABEL: Record<string, string> = {
  dublado: "Dublado",
  legendado: "Legendado",
};

const AUDIO_COLOR: Record<string, string> = {
  dublado: "text-amber-300 bg-amber-400/10 border-amber-400/30",
  legendado: "text-sky-300 bg-sky-400/10 border-sky-400/30",
};

interface AnimeCardProps {
  anime: AnimeSearchResult;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  const href = `/anime/${anime.sourceId}/${encodeURIComponent(anime.animeId)}`;
  const status = anime.status ?? "unknown";
  const sourceColor = SOURCE_COLOR[anime.sourceId] ?? "text-zinc-400 bg-zinc-400/10";

  return (
    <Link href={href} className="group block">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-200 hover:shadow-xl hover:shadow-black/40">
        <div className="flex gap-3 p-3">
          <div className="relative w-[72px] h-[104px] flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800">
            {anime.cover ? (
              <ProxyImage
                src={anime.cover}
                sourceId={anime.sourceId}
                alt={anime.title}
                fill
                className="group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div className="space-y-1">
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${sourceColor}`}>
                {anime.sourceName}
              </span>
              <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-red-300 transition-colors">
                {anime.title}
              </h3>
            </div>

            <div className="space-y-1.5 mt-1">
              <div className="flex items-center gap-2 flex-wrap">
                {anime.audioType && anime.audioType !== "unknown" && AUDIO_LABEL[anime.audioType] && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${AUDIO_COLOR[anime.audioType]}`}>
                    {AUDIO_LABEL[anime.audioType]}
                  </span>
                )}
                {status !== "unknown" && STATUS_LABEL[status] && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${STATUS_COLOR[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                )}
                {anime.episodeCount != null && (
                  <span className="text-zinc-500 text-[11px]">
                    {anime.episodeCount} eps.
                  </span>
                )}
                {anime.score != null && (
                  <span className="text-amber-400/80 text-[11px]">★ {anime.score.toFixed(1)}</span>
                )}
                {anime.year && (
                  <span className="text-zinc-600 text-[11px]">{anime.year}</span>
                )}
              </div>
              {anime.genres && anime.genres.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {anime.genres.slice(0, 4).map((g) => (
                    <span key={g} className="text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700/50 px-1.5 py-0.5 rounded-md">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

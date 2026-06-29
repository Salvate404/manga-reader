import Link from "next/link";
import Image from "next/image";
import type { MangaSearchResult } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  ongoing:   "Em andamento",
  completed: "Completo",
  hiatus:    "Hiato",
  unknown:   "",
};

const STATUS_COLOR: Record<string, string> = {
  ongoing:   "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  completed: "text-sky-400 bg-sky-400/10 border-sky-400/30",
  hiatus:    "text-amber-400 bg-amber-400/10 border-amber-400/30",
  unknown:   "",
};

const SOURCE_COLOR: Record<string, string> = {
  leituramanga: "text-red-400 bg-red-400/10",
  nexustoons:   "text-violet-400 bg-violet-400/10",
  mangalix:     "text-cyan-400 bg-cyan-400/10",
};

interface MangaCardProps {
  manga: MangaSearchResult;
}

export function MangaCard({ manga }: MangaCardProps) {
  const href = `/manga/${manga.sourceId}/${manga.mangaId}`;
  const status = manga.status ?? "unknown";
  const sourceColor = SOURCE_COLOR[manga.sourceId] ?? "text-zinc-400 bg-zinc-400/10";

  return (
    <Link href={href} className="group block">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-200 hover:shadow-xl hover:shadow-black/40">
        <div className="flex gap-3 p-3">
          {/* Capa */}
          <div className="relative w-[72px] h-[104px] flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800">
            {manga.cover ? (
              <Image
                src={`/api/proxy?url=${encodeURIComponent(manga.cover)}`}
                alt={manga.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="72px"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                </svg>
              </div>
            )}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div className="space-y-1">
              {/* Badge da fonte */}
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${sourceColor}`}>
                {manga.sourceName}
              </span>
              {/* Título */}
              <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-red-300 transition-colors">
                {manga.title}
              </h3>
            </div>

            {/* Badges inferiores */}
            <div className="space-y-1.5 mt-1">
              {/* Status + capítulos */}
              <div className="flex items-center gap-2 flex-wrap">
                {status !== "unknown" && STATUS_LABEL[status] && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${STATUS_COLOR[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                )}
                {manga.chapterCount != null && (
                  <span className="text-zinc-500 text-[11px]">
                    {manga.chapterCount} cap.
                  </span>
                )}
                {manga.lastChapter && (
                  <span className="text-zinc-600 text-[11px]">
                    Últ: {manga.lastChapter}
                  </span>
                )}
              </div>
              {/* Gêneros */}
              {manga.genres && manga.genres.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {manga.genres.slice(0, 4).map((g) => (
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

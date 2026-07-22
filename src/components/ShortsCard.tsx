import Link from "next/link";
import { ProxyImage } from "@/components/ProxyImage";
import type { ShortSearchResult } from "@/lib/types";

interface ShortsCardProps {
  series: ShortSearchResult;
}

export function ShortsCard({ series }: ShortsCardProps) {
  const href = `/shorts/${series.sourceId}/${encodeURIComponent(series.seriesId)}`;
  const sourceColor =
    series.sourceId === "flextv"
      ? "text-emerald-400 bg-emerald-400/10"
      : series.sourceId === "dramashorts"
        ? "text-sky-400 bg-sky-400/10"
        : "text-fuchsia-400 bg-fuchsia-400/10";
  const hoverTitle =
    series.sourceId === "flextv"
      ? "group-hover:text-emerald-300"
      : series.sourceId === "dramashorts"
        ? "group-hover:text-sky-300"
        : "group-hover:text-fuchsia-300";

  return (
    <Link href={href} className="group block">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-200 hover:shadow-xl hover:shadow-black/40">
        <div className="flex gap-3 p-3">
          <div className="relative w-[72px] h-[104px] flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800">
            {series.cover ? (
              <ProxyImage
                src={series.cover}
                sourceId={series.sourceId}
                alt={series.title}
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
                {series.sourceName}
              </span>
              <h3 className={`text-white font-semibold text-sm leading-snug line-clamp-2 ${hoverTitle} transition-colors`}>
                {series.title}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-1">
              {series.format && (
                <span className="text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700/50 px-1.5 py-0.5 rounded-md">
                  {series.format}
                </span>
              )}
              {series.episodeCount != null && (
                <span className="text-zinc-500 text-[11px]">
                  {series.episodeCount} eps.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

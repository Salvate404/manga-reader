"use client";

import { useState, type FormEvent } from "react";
import { ALL_SOURCES, type SourceOption } from "@/hooks/useSourceFilter";
import {
  ALL_ANIME_SOURCES,
  type AnimeSourceOption,
  type AudioFilter,
} from "@/hooks/useAnimeSourceFilter";
import type { MediaKind } from "@/lib/types";

interface SearchBarProps {
  mediaKind?: MediaKind;
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialValue?: string;
  selectedSources: Set<string>;
  onToggleSource: (id: string) => void;
  audioFilter?: AudioFilter;
  onAudioFilterChange?: (filter: AudioFilter) => void;
  browseGenres?: string[];
  availableGenres?: string[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
  onBrowseGenre?: (genre: string) => void;
}

export function SearchBar({
  mediaKind = "manga",
  onSearch,
  isLoading = false,
  initialValue = "",
  selectedSources,
  onToggleSource,
  audioFilter = "all",
  onAudioFilterChange,
  browseGenres = [],
  availableGenres = [],
  selectedGenre,
  onSelectGenre,
  onBrowseGenre,
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const sources: Array<SourceOption | AnimeSourceOption> =
    mediaKind === "anime" ? ALL_ANIME_SOURCES : ALL_SOURCES;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="search"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mediaKind === "anime" ? "Buscar anime..." : "Buscar mangá..."}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/60 transition-all text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            className="bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap text-sm flex items-center gap-2"
          >
            {isLoading && <Spinner />}
            {isLoading ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-zinc-500 text-xs font-medium shrink-0">Fontes:</span>
        {sources.map((source) => {
          const active = selectedSources.has(source.id);
          return (
            <button
              key={source.id}
              onClick={() => onToggleSource(source.id)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                active
                  ? "bg-red-600/20 border-red-500/60 text-red-300"
                  : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-red-400" : "bg-zinc-600"}`} />
              {source.name}
              <span className={`text-[10px] ${active ? "text-red-400/70" : "text-zinc-600"}`}>
                {source.language}
              </span>
            </button>
          );
        })}
      </div>

      {mediaKind === "anime" && onAudioFilterChange && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 text-xs font-medium shrink-0">Áudio:</span>
          {(
            [
              ["all", "Todos"],
              ["dublado", "Dublado"],
              ["legendado", "Legendado"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onAudioFilterChange(value)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                audioFilter === value
                  ? "bg-emerald-600/20 border-emerald-500/60 text-emerald-300"
                  : "bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {(browseGenres.length > 0 || availableGenres.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 text-xs font-medium shrink-0">Gênero:</span>
          <button
            onClick={() => onSelectGenre(null)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
              selectedGenre === null
                ? "bg-zinc-700 border-zinc-500 text-white shadow-sm"
                : "bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
          >
            Todos
          </button>
          {(availableGenres.length > 0 ? availableGenres : browseGenres).map((genre) => (
            <button
              key={genre}
              onClick={() => {
                if (availableGenres.length > 0) {
                  onSelectGenre(selectedGenre === genre ? null : genre);
                } else {
                  onBrowseGenre?.(genre);
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                selectedGenre === genre
                  ? "bg-gradient-to-r from-violet-600/20 to-purple-600/20 border-violet-500/60 text-violet-300 shadow-sm"
                  : "bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

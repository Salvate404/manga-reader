"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { MangaCard } from "@/components/MangaCard";
import { AnimeCard } from "@/components/AnimeCard";
import { HistorySection } from "@/components/HistorySection";
import { AnimeHistorySection } from "@/components/AnimeHistorySection";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { AnimeTrendingCarousel } from "@/components/AnimeTrendingCarousel";
import { useSearch } from "@/hooks/useSearch";
import { useAnimeSearch } from "@/hooks/useAnimeSearch";
import { useHistory } from "@/hooks/useHistory";
import { useAnimeHistory } from "@/hooks/useAnimeHistory";
import { useSourceFilter } from "@/hooks/useSourceFilter";
import { useAnimeSourceFilter } from "@/hooks/useAnimeSourceFilter";
import { useTrending } from "@/hooks/useTrending";
import { useAnimeTrending } from "@/hooks/useAnimeTrending";
import { useMediaKind } from "@/hooks/useMediaKind";
import { BROWSE_GENRES, ANIME_BROWSE_GENRES } from "@/lib/genres";
import {
  loadHomeHubState,
  saveHomeHubState,
} from "@/lib/navigation-return";

export default function HomePage() {
  const { kind, setKind, hydrated: kindHydrated } = useMediaKind();
  const mangaSearch = useSearch();
  const animeSearch = useAnimeSearch();
  const { history, clearHistory } = useHistory();
  const { history: animeHistory, clearHistory: clearAnimeHistory } = useAnimeHistory();
  const mangaSources = useSourceFilter();
  const animeSources = useAnimeSourceFilter();
  const mangaTrending = useTrending();
  const animeTrending = useAnimeTrending();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const skipKindClearRef = useRef(false);
  const restoredRef = useRef(false);

  const isAnime = kind === "anime";
  const query = isAnime ? animeSearch.query : mangaSearch.query;
  const setQuery = isAnime ? animeSearch.setQuery : mangaSearch.setQuery;
  const results = isAnime ? animeSearch.results : mangaSearch.results;
  const isLoading = isAnime ? animeSearch.isLoading : mangaSearch.isLoading;
  const error = isAnime ? animeSearch.error : mangaSearch.error;
  const hasSearched = isAnime ? animeSearch.hasSearched : mangaSearch.hasSearched;
  const selectedSources = isAnime
    ? animeSources.selectedSources
    : mangaSources.selectedSources;
  const toggleSource = isAnime ? animeSources.toggle : mangaSources.toggle;
  const sourcesParam = isAnime
    ? animeSources.sourcesParam
    : mangaSources.sourcesParam;
  const { audioFilter, setAudioFilter } = animeSources;

  // Limpa resultados ao trocar Mangá ↔ Anime (exceto restauração do hub)
  useEffect(() => {
    if (skipKindClearRef.current) {
      skipKindClearRef.current = false;
      return;
    }
    setSelectedGenre(null);
    mangaSearch.clear();
    animeSearch.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Restaura busca/scroll do início (até 10 min) ao voltar da capa/episódio
  useEffect(() => {
    if (
      !kindHydrated ||
      !mangaSources.hydrated ||
      !animeSources.hydrated ||
      restoredRef.current
    ) {
      return;
    }
    restoredRef.current = true;
    const snap = loadHomeHubState();
    if (!snap) return;

    if (snap.kind !== kind) {
      skipKindClearRef.current = true;
      setKind(snap.kind);
    }
    setSelectedGenre(snap.selectedGenre);

    const runSearch = () => {
      if (!snap.hasSearched || !snap.query) return;
      if (snap.kind === "anime") {
        animeSearch.search(snap.query, animeSources.sourcesParam);
      } else {
        mangaSearch.search(snap.query, mangaSources.sourcesParam);
      }
    };
    runSearch();

    if (snap.scrollY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, snap.scrollY);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindHydrated, mangaSources.hydrated, animeSources.hydrated]);

  // Persiste estado do hub para o botão Voltar
  useEffect(() => {
    if (!kindHydrated || !restoredRef.current) return;
    saveHomeHubState({
      kind,
      query,
      selectedGenre,
      hasSearched,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
    });
  }, [kind, query, selectedGenre, hasSearched, kindHydrated]);

  useEffect(() => {
    if (!kindHydrated) return;
    const onScroll = () => {
      saveHomeHubState({
        kind,
        query,
        selectedGenre,
        hasSearched,
        scrollY: window.scrollY || 0,
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [kind, query, selectedGenre, hasSearched, kindHydrated]);

  function handleSearch(q: string) {
    setQuery(q);
    setSelectedGenre(null);
    if (isAnime) animeSearch.search(q, sourcesParam);
    else mangaSearch.search(q, sourcesParam);
  }

  function handleBrowseGenre(genre: string) {
    setSelectedGenre(genre);
    setQuery(genre);
    if (isAnime) animeSearch.search(genre, sourcesParam);
    else mangaSearch.search(genre, sourcesParam);
  }

  const availableGenres = useMemo(() => {
    const freq = new Map<string, number>();
    for (const r of results) {
      for (const g of r.genres ?? []) {
        freq.set(g, (freq.get(g) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([g]) => g);
  }, [results]);

  const filteredResults = useMemo(() => {
    if (isAnime) {
      let list = animeSearch.results;
      if (audioFilter !== "all") {
        list = list.filter((r) =>
          audioFilter === "dublado"
            ? r.audioType === "dublado"
            : r.audioType === "legendado" || r.audioType === "unknown"
        );
      }
      if (selectedGenre) {
        list = list.filter((r) => r.genres?.includes(selectedGenre));
      }
      return list;
    }
    let list = mangaSearch.results;
    if (selectedGenre) {
      list = list.filter((r) => r.genres?.includes(selectedGenre));
    }
    return list;
  }, [
    isAnime,
    animeSearch.results,
    mangaSearch.results,
    selectedGenre,
    audioFilter,
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 page-enter">
      {!hasSearched && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-white">
              {isAnime ? "Sua biblioteca de animes" : "Sua biblioteca de mangás"}
            </h1>
            {!isAnime && (
              <Link
                href="/explore"
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm text-zinc-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Explorar
              </Link>
            )}
          </div>
          <p className="text-zinc-500 text-sm">
            {isAnime
              ? "Busque animes em português — dublado ou legendado."
              : "Busque qualquer mangá e leia direto na fonte, sem anúncios."}
          </p>
        </div>
      )}

      {/* Filtro Mangá / Anime */}
      <div className="mb-4 inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
        <button
          type="button"
          onClick={() => setKind("manga")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !isAnime
              ? "bg-red-600 text-white shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Mangá
        </button>
        <button
          type="button"
          onClick={() => setKind("anime")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isAnime
              ? "bg-red-600 text-white shadow"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Anime
        </button>
      </div>

      <SearchBar
        key={kind}
        mediaKind={kind}
        onSearch={handleSearch}
        isLoading={isLoading}
        initialValue={query}
        selectedSources={selectedSources}
        onToggleSource={toggleSource}
        audioFilter={audioFilter}
        onAudioFilterChange={setAudioFilter}
        browseGenres={
          hasSearched
            ? []
            : [...(isAnime ? ANIME_BROWSE_GENRES : BROWSE_GENRES)]
        }
        availableGenres={hasSearched && !isLoading ? availableGenres : []}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
        onBrowseGenre={handleBrowseGenre}
      />

      {!hasSearched &&
        (isAnime ? (
          <AnimeTrendingCarousel
            sections={animeTrending.sections.map((section) => ({
              ...section,
              items:
                audioFilter === "all"
                  ? section.items
                  : section.items.filter((item) =>
                      audioFilter === "dublado"
                        ? item.audioType === "dublado"
                        : item.audioType === "legendado" || item.audioType === "unknown"
                    ),
            }))}
            isLoading={animeTrending.isLoading}
          />
        ) : (
          <TrendingCarousel
            sections={mangaTrending.sections}
            isLoading={mangaTrending.isLoading}
          />
        ))}

      {hasSearched && (
        <section className="mt-5">
          {error ? (
            <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 text-red-300 text-sm">
              {error}
            </div>
          ) : isLoading ? (
            <div className="space-y-2.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-[116px] bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400 text-sm">
                Nenhum resultado{selectedGenre ? ` em "${selectedGenre}"` : ""} para{" "}
                <span className="text-white font-medium">&quot;{query}&quot;</span>
              </p>
              {selectedGenre && (
                <button
                  onClick={() => setSelectedGenre(null)}
                  className="mt-2 text-red-400 text-xs hover:underline"
                >
                  Remover filtro de gênero
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-zinc-600 text-xs mb-3">
                {filteredResults.length} resultado
                {filteredResults.length !== 1 ? "s" : ""}
                {selectedGenre && (
                  <span className="text-violet-400"> · {selectedGenre}</span>
                )}
              </p>
              <div className="space-y-2">
                {isAnime
                  ? (filteredResults as typeof animeSearch.results).map((anime) => (
                      <AnimeCard
                        key={`${anime.sourceId}-${anime.animeId}`}
                        anime={anime}
                      />
                    ))
                  : (filteredResults as typeof mangaSearch.results).map((manga) => (
                      <MangaCard
                        key={`${manga.sourceId}-${manga.mangaId}`}
                        manga={manga}
                      />
                    ))}
              </div>
            </>
          )}
        </section>
      )}

      {!hasSearched &&
        (isAnime ? (
          <AnimeHistorySection
            history={animeHistory}
            onClear={clearAnimeHistory}
          />
        ) : (
          <HistorySection history={history} onClear={clearHistory} />
        ))}
    </div>
  );
}

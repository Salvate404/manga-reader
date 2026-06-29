"use client";

import { useState, useMemo } from "react";
import { SearchBar } from "@/components/SearchBar";
import { MangaCard } from "@/components/MangaCard";
import { HistorySection } from "@/components/HistorySection";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { useSearch } from "@/hooks/useSearch";
import { useHistory } from "@/hooks/useHistory";
import { useSourceFilter } from "@/hooks/useSourceFilter";
import { useTrending } from "@/hooks/useTrending";
import { BROWSE_GENRES } from "@/lib/genres";

export default function HomePage() {
  const { query, setQuery, results, isLoading, error, hasSearched, search } = useSearch();
  const { history, clearHistory } = useHistory();
  const { selectedSources, toggle, sourcesParam } = useSourceFilter();
  const { sections, isLoading: trendingLoading } = useTrending();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  function handleSearch(q: string) {
    setQuery(q);
    setSelectedGenre(null);
    search(q, sourcesParam);
  }

  function handleBrowseGenre(genre: string) {
    setSelectedGenre(genre);
    setQuery(genre);
    search(genre, sourcesParam);
  }

  // Gêneros únicos dos resultados (ordenados por frequência)
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

  // Filtrar resultados pelo gênero selecionado
  const filteredResults = useMemo(() => {
    if (!selectedGenre) return results;
    return results.filter((r) => r.genres?.includes(selectedGenre));
  }, [results, selectedGenre]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 page-enter">
      {/* Hero */}
      {!hasSearched && (
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white mb-1">
            Sua biblioteca de mangás
          </h1>
          <p className="text-zinc-500 text-sm">
            Busque qualquer mangá e leia direto na fonte, sem anúncios.
          </p>
        </div>
      )}

      {/* Busca + filtros */}
      <SearchBar
        onSearch={handleSearch}
        isLoading={isLoading}
        initialValue={query}
        selectedSources={selectedSources}
        onToggleSource={toggle}
        browseGenres={hasSearched ? [] : [...BROWSE_GENRES]}
        availableGenres={hasSearched && !isLoading ? availableGenres : []}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
        onBrowseGenre={handleBrowseGenre}
      />

      {/* Destaques por fonte */}
      {!hasSearched && (
        <TrendingCarousel sections={sections} isLoading={trendingLoading} />
      )}

      {/* Resultados */}
      {hasSearched && (
        <section className="mt-5">
          {error ? (
            <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 text-red-300 text-sm">
              {error}
            </div>
          ) : isLoading ? (
            <div className="space-y-2.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[116px] bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/>
                </svg>
              </div>
              <p className="text-zinc-400 text-sm">
                Nenhum resultado{selectedGenre ? ` em "${selectedGenre}"` : ""} para{" "}
                <span className="text-white font-medium">&quot;{query}&quot;</span>
              </p>
              {selectedGenre && (
                <button onClick={() => setSelectedGenre(null)} className="mt-2 text-red-400 text-xs hover:underline">
                  Remover filtro de gênero
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-zinc-600 text-xs mb-3">
                {filteredResults.length} resultado{filteredResults.length !== 1 ? "s" : ""}
                {selectedGenre && <span className="text-violet-400"> · {selectedGenre}</span>}
                {results.length !== filteredResults.length && (
                  <span className="text-zinc-700"> de {results.length}</span>
                )}
              </p>
              <div className="space-y-2">
                {filteredResults.map((manga) => (
                  <MangaCard key={`${manga.sourceId}-${manga.mangaId}`} manga={manga} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Histórico */}
      {!hasSearched && (
        <HistorySection history={history} onClear={clearHistory} />
      )}
    </div>
  );
}

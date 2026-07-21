"use client";

import { useState, useEffect, useRef } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ExploreCard } from "@/components/ExploreCard";
import { useSearch } from "@/hooks/useSearch";
import { useSourceFilter } from "@/hooks/useSourceFilter";
import { BROWSE_GENRES } from "@/lib/genres";
import {
  loadExploreHubState,
  saveExploreHubState,
} from "@/lib/navigation-return";
import Link from "next/link";

const BLOCK_SIZE = 36; // 12 rows x 3 columns
const EXPLORE_CACHE_KEY = "manga_explore_cache";
const EXPLORE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function getExploreCacheKey(sources: string, page: number): string {
  return `${EXPLORE_CACHE_KEY}__${sources}__page${page}`;
}

function readExploreCache(key: string): { results: any[]; total: number; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const now = Date.now();
    if (now - cached.timestamp > EXPLORE_CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function writeExploreCache(key: string, results: any[], total: number): void {
  try {
    localStorage.setItem(key, JSON.stringify({ results, total, timestamp: Date.now() }));
  } catch {}
}

export default function ExplorePage() {
  const { query, setQuery, results, isLoading, error, hasSearched, search } = useSearch();
  const { selectedSources, toggle, sourcesParam, hydrated } = useSourceFilter();
  const [exploreResults, setExploreResults] = useState<any[]>([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [explorePage, setExplorePage] = useState(1);
  const [exploreTotal, setExploreTotal] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isExploreMode, setIsExploreMode] = useState(true);
  const restoredRef = useRef(false);
  const skipDefaultLoadRef = useRef(false);

  function handleSearch(q: string) {
    setQuery(q);
    setSelectedGenre(null);
    setIsExploreMode(false);
    search(q, sourcesParam);
  }

  function handleBrowseGenre(genre: string) {
    setSelectedGenre(genre);
    setQuery(genre);
    setIsExploreMode(false);
    search(genre, sourcesParam);
  }

  function loadExplorePage(page: number) {
    setExploreLoading(true);
    const cacheKey = getExploreCacheKey(sourcesParam || "all", page);

    // Check cache first
    const cached = readExploreCache(cacheKey);
    if (cached) {
      setExploreResults(cached.results);
      setExploreTotal(cached.total);
      setExplorePage(page);
      setExploreLoading(false);
      return;
    }

    const url = `/api/explore?page=${page}${sourcesParam ? `&sources=${sourcesParam}` : ""}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setExploreResults(data.results);
        setExploreTotal(data.total);
        setExplorePage(page);
        writeExploreCache(cacheKey, data.results, data.total);
      })
      .catch((err) => console.error("Error loading explore:", err))
      .finally(() => setExploreLoading(false));
  }

  useEffect(() => {
    if (!hydrated || restoredRef.current) return;
    restoredRef.current = true;
    const snap = loadExploreHubState();
    if (!snap) return;

    skipDefaultLoadRef.current = true;
    setSelectedGenre(snap.selectedGenre);
    setIsExploreMode(snap.isExploreMode);
    setExplorePage(snap.explorePage);
    if (!snap.isExploreMode && snap.hasSearched && snap.query) {
      setQuery(snap.query);
      search(snap.query, sourcesParam);
    } else {
      loadExplorePage(snap.explorePage || 1);
    }
    if (snap.scrollY > 0) {
      requestAnimationFrame(() => window.scrollTo(0, snap.scrollY));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !restoredRef.current) return;
    if (skipDefaultLoadRef.current) {
      skipDefaultLoadRef.current = false;
      return;
    }
    loadExplorePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesParam]);

  useEffect(() => {
    if (!hydrated || !restoredRef.current) return;
    saveExploreHubState({
      explorePage,
      isExploreMode,
      query,
      selectedGenre,
      hasSearched,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
    });
  }, [
    explorePage,
    isExploreMode,
    query,
    selectedGenre,
    hasSearched,
    hydrated,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    const onScroll = () => {
      saveExploreHubState({
        explorePage,
        isExploreMode,
        query,
        selectedGenre,
        hasSearched,
        scrollY: window.scrollY || 0,
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [
    explorePage,
    isExploreMode,
    query,
    selectedGenre,
    hasSearched,
    hydrated,
  ]);

  function handlePageChange(page: number) {
    setExplorePage(page);
    loadExplorePage(page);
  }

  function resetToExplore() {
    setIsExploreMode(true);
    setQuery("");
    setSelectedGenre(null);
    setExploreResults([]);
    setExplorePage(1);
    loadExplorePage(1);
  }

  // Filter explore results by genre if selected
  const filteredExploreResults = selectedGenre
    ? exploreResults.filter((r) => r.genres?.includes(selectedGenre))
    : exploreResults;

  // Get unique genres from explore results
  const exploreGenres = Array.from(
    new Set(exploreResults.flatMap((r) => r.genres ?? []))
  ).slice(0, 12);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 page-enter">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Explorar
          </h1>
        </div>
        <p className="text-zinc-500 text-sm">
          Descubra novos mangás aleatórios de todas as fontes
        </p>
      </div>

      {/* Search + filters */}
      <SearchBar
        onSearch={handleSearch}
        isLoading={isLoading}
        initialValue={query}
        selectedSources={selectedSources}
        onToggleSource={toggle}
        browseGenres={isExploreMode ? exploreGenres : (hasSearched ? [] : [...BROWSE_GENRES])}
        availableGenres={isExploreMode ? exploreGenres : (hasSearched && !isLoading ? [] : [])}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
        onBrowseGenre={handleBrowseGenre}
      />

      {/* Explore mode - grid layout */}
      {isExploreMode && (
        <section className="mt-6">
          {exploreLoading && exploreResults.length === 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(BLOCK_SIZE)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredExploreResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400 text-sm">
                Nenhum mangá encontrado{selectedGenre ? ` em "${selectedGenre}"` : ""}
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
              <div className="grid grid-cols-3 gap-2">
                {filteredExploreResults.map((manga) => (
                  <ExploreCard key={`${manga.sourceId}-${manga.mangaId}`} manga={manga} />
                ))}
              </div>

              {!selectedGenre && exploreTotal > BLOCK_SIZE && (
                <div className="mt-6 flex justify-center items-center gap-2 flex-wrap">
                  {(() => {
                    const totalPages = Math.ceil(exploreTotal / BLOCK_SIZE);
                    const pages = [];
                    // Show first page
                    pages.push(1);
                    // Show pages around current page
                    if (explorePage > 2) pages.push('...');
                    for (let i = Math.max(2, explorePage - 1); i <= Math.min(totalPages - 1, explorePage + 1); i++) {
                      pages.push(i);
                    }
                    if (explorePage < totalPages - 1) pages.push('...');
                    // Show last page
                    if (totalPages > 1) pages.push(totalPages);

                    return pages.map((p, idx) => (
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="text-zinc-500 px-2">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p as number)}
                          disabled={exploreLoading}
                          className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            p === explorePage
                              ? 'bg-red-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {p}
                        </button>
                      )
                    ));
                  })()}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Search results mode */}
      {!isExploreMode && hasSearched && (
        <section className="mt-5">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={resetToExplore}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              ← Voltar para explorar
            </button>
          </div>

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
          ) : results.length === 0 ? (
            <div className="text-center py-12">
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
            <div className="space-y-2">
              {results.map((manga) => (
                <ExploreCard key={`${manga.sourceId}-${manga.mangaId}`} manga={manga} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

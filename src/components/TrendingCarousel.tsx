"use client";

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { ProxyImage } from "@/components/ProxyImage";
import type { TrendingSection } from "@/lib/trending-service";
import type { MangaSearchResult } from "@/lib/types";

interface TrendingCarouselProps {
  sections: TrendingSection[];
  isLoading?: boolean;
}

export function TrendingCarousel({ sections, isLoading = false }: TrendingCarouselProps) {
  if (isLoading) {
    return (
      <div className="mt-8 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="flex gap-3 overflow-hidden">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="w-[110px] h-[160px] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sections.length === 0) return null;

  return (
    <div className="mt-8 space-y-7">
      <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
        Em alta agora
      </h2>
      {sections.map((section) => (
        <SourceCarousel key={section.sourceId} section={section} />
      ))}
    </div>
  );
}

function SourceCarousel({ section }: { section: TrendingSection }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // Enable scroll buttons if there's content to scroll (with looping, always enabled when content exists)
    setCanScroll(el.scrollWidth > el.clientWidth + 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [section.items, updateScrollState]);

  function scrollBy(direction: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;

    const scrollAmount = 280;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (direction === 1 && el.scrollLeft >= maxScroll - 10) {
      // At the end, loop to beginning
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (direction === -1 && el.scrollLeft <= 10) {
      // At the beginning, loop to end
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
    } else {
      el.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-semibold">{section.sourceName}</h3>
        <div className="flex gap-1">
          <CarouselButton disabled={!canScroll} onClick={() => scrollBy(-1)} aria-label="Anterior">
            ‹
          </CarouselButton>
          <CarouselButton disabled={!canScroll} onClick={() => scrollBy(1)} aria-label="Próximo">
            ›
          </CarouselButton>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={updateScrollState}
        className="flex gap-3 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {section.items.map((manga) => (
          <TrendingCard key={`${section.sourceId}-${manga.mangaId}`} manga={manga} />
        ))}
      </div>
    </section>
  );
}

function TrendingCard({ manga }: { manga: MangaSearchResult }) {
  const href = `/manga/${manga.sourceId}/${encodeURIComponent(manga.mangaId)}`;

  return (
    <Link
      href={href}
      className="group shrink-0 w-[110px] snap-start"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-zinc-600 transition-colors shadow-lg">
        {manga.cover ? (
          <ProxyImage
            src={manga.cover}
            sourceId={manga.sourceId}
            alt={manga.title}
            fill
            className="group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
            Sem capa
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-8">
          <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">
            {manga.title}
          </p>
          {manga.lastChapter && (
            <p className="text-zinc-400 text-[10px] mt-0.5">Cap. {manga.lastChapter}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function CarouselButton({
  children,
  disabled,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="w-7 h-7 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none"
    >
      {children}
    </button>
  );
}

"use client";

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { ProxyImage } from "@/components/ProxyImage";
import type { ShortsTrendingSection } from "@/lib/shorts/service";
import type { ShortSearchResult } from "@/lib/types";

interface ShortsTrendingCarouselProps {
  sections: ShortsTrendingSection[];
  isLoading?: boolean;
}

export function ShortsTrendingCarousel({
  sections,
  isLoading = false,
}: ShortsTrendingCarouselProps) {
  if (isLoading) {
    return (
      <div className="mt-8 space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
            <div className="flex gap-3 overflow-hidden">
              {[...Array(4)].map((_, j) => (
                <div
                  key={j}
                  className="w-[110px] h-[160px] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse shrink-0"
                />
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
        Short dramas em alta
      </h2>
      {sections.map((section) => (
        <SourceCarousel key={section.sourceId} section={section} />
      ))}
    </div>
  );
}

function SourceCarousel({ section }: { section: ShortsTrendingSection }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
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
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (direction === -1 && el.scrollLeft <= 10) {
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
        className="flex gap-3 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {section.items.map((item) => (
          <TrendingCard key={`${item.sourceId}-${item.seriesId}`} series={item} />
        ))}
      </div>
    </section>
  );
}

function TrendingCard({ series }: { series: ShortSearchResult }) {
  const href = `/shorts/${series.sourceId}/${encodeURIComponent(series.seriesId)}`;

  return (
    <Link href={href} className="group shrink-0 w-[110px] snap-start">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-zinc-600 transition-colors shadow-lg">
        {series.cover ? (
          <ProxyImage
            src={series.cover}
            sourceId={series.sourceId}
            alt={series.title}
            fill
            className="group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
            ?
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-300 line-clamp-2 leading-snug group-hover:text-white">
        {series.title}
      </p>
    </Link>
  );
}

function CarouselButton({
  children,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm disabled:opacity-30 hover:bg-zinc-700 transition-colors"
    >
      {children}
    </button>
  );
}

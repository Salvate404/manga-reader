"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { Chapter } from "@/lib/types";

interface ReaderNavBarProps {
  sourceId: string;
  mangaId: string;
  chapter: Chapter;
  prevChapter?: Chapter;
  nextChapter?: Chapter;
  allChapters: Chapter[];
  onScrollTop: () => void;
}

export function ReaderNavBar({
  sourceId,
  mangaId,
  chapter,
  prevChapter,
  nextChapter,
  allChapters,
  onScrollTop,
}: ReaderNavBarProps) {
  const [visible, setVisible] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const chapterListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    let lockVisible = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const scrollingUp = y < lastY - 8;
        const scrollingDown = y > lastY + 8;
        const nearTop = y < 80;

        // Lock visible when scrolling up significantly, unlock when scrolling down
        if (scrollingUp && !nearTop) {
          lockVisible = true;
        } else if (scrollingDown) {
          lockVisible = false;
        }

        setVisible(lockVisible && !nearTop);
        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeList = useCallback(() => setListOpen(false), []);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    }
  }, []);

  const goForward = useCallback(() => {
    if (window.history.length > 1) {
      window.history.forward();
    }
  }, []);

  // Scroll to current chapter when list opens
  useEffect(() => {
    if (listOpen && chapterListRef.current) {
      const currentChapterIndex = allChapters.findIndex(ch => ch.id === chapter.id);
      if (currentChapterIndex >= 0) {
        const chapterElements = chapterListRef.current.querySelectorAll('a[href]');
        const targetElement = chapterElements[currentChapterIndex];
        if (targetElement) {
          setTimeout(() => {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    }
  }, [listOpen, allChapters, chapter.id]);

  return (
    <>
      {/* Barra inferior — aparece ao rolar para cima */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 transition-transform duration-300 ${
          visible || listOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-2xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="bg-zinc-900/95 backdrop-blur border border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/50 flex items-stretch overflow-hidden">
            <button
              type="button"
              onClick={goBack}
              aria-label="Voltar"
              className="flex flex-col items-center justify-center py-2.5 px-3 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors border-r border-zinc-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span className="text-[10px] mt-0.5">Voltar</span>
            </button>

            {prevChapter ? (
              <NavLink href={`/read/${sourceId}/${mangaId}/${prevChapter.id}`} label={`‹ Cap. ${prevChapter.number}`} />
            ) : (
              <NavDisabled label="‹ Anterior" />
            )}

            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors border-x border-zinc-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              <span className="text-[10px] mt-0.5 font-medium">Capítulos</span>
            </button>

            {nextChapter ? (
              <NavLink href={`/read/${sourceId}/${mangaId}/${nextChapter.id}`} label={`Cap. ${nextChapter.number} ›`} accent />
            ) : (
              <NavDisabled label="Próximo ›" />
            )}

            <button
              type="button"
              onClick={goForward}
              aria-label="Avançar"
              className="flex flex-col items-center justify-center py-2.5 px-3 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors border-l border-zinc-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
              <span className="text-[10px] mt-0.5">Avançar</span>
            </button>

            <button
              type="button"
              onClick={onScrollTop}
              aria-label="Voltar ao topo"
              className="flex flex-col items-center justify-center py-2.5 px-3 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors border-l border-zinc-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m18 15-6-6-6 6" />
              </svg>
              <span className="text-[10px] mt-0.5">Topo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de capítulos (sheet) */}
      {listOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Fechar lista"
            onClick={closeList}
          />
          <div className="relative bg-zinc-900 border-t border-zinc-700 rounded-t-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
              <div>
                <p className="text-white text-sm font-semibold">Capítulos</p>
                <p className="text-zinc-500 text-xs">Cap. {chapter.number} selecionado</p>
              </div>
              <button
                type="button"
                onClick={closeList}
                className="text-zinc-500 hover:text-white p-1"
                aria-label="Fechar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div ref={chapterListRef} className="overflow-y-auto overscroll-contain px-2 py-2">
              {allChapters.map((ch) => {
                const isCurrent = ch.id === chapter.id;
                return (
                  <Link
                    key={ch.id}
                    href={`/read/${sourceId}/${mangaId}/${ch.id}`}
                    onClick={closeList}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl mb-0.5 transition-colors ${
                      isCurrent
                        ? "bg-red-600/20 text-red-300 border border-red-500/40"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span className="text-sm font-medium">Capítulo {ch.number}</span>
                    {isCurrent && (
                      <span className="text-[10px] text-red-400 font-semibold uppercase">Lendo</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ href, label, accent = false }: { href: string; label: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex-1 flex items-center justify-center py-2.5 px-2 text-xs font-semibold transition-colors ${
        accent
          ? "text-red-400 hover:bg-red-950/40"
          : "text-zinc-300 hover:text-white hover:bg-zinc-800/60"
      }`}
    >
      {label}
    </Link>
  );
}

function NavDisabled({ label }: { label: string }) {
  return (
    <span className="flex-1 flex items-center justify-center py-2.5 px-2 text-xs text-zinc-700 cursor-not-allowed">
      {label}
    </span>
  );
}

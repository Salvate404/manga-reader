"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  contentLayer,
  getContentNavState,
  isHubPath,
  rememberHubLocation,
  setContentNavState,
  updateHubScroll,
} from "@/lib/navigation-return";

/**
 * Grava o último hub (início / explorar / fontes) e a profundidade
 * capa→episódio para o botão Voltar pular essas telas.
 */
export function ReturnPointTracker() {
  const pathname = usePathname() || "/";
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    const href = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const layer = contentLayer(pathname);
    const prevLayer = prev ? contentLayer(prev) : 0;

    if (isHubPath(pathname)) {
      rememberHubLocation(href, window.scrollY || 0);
      setContentNavState(0, false);
    } else if (layer > 0) {
      const enteredFromHub = prev != null && isHubPath(prev);
      const keepFromHub = prevLayer > 0 && getContentNavState().fromHub;
      setContentNavState(layer, enteredFromHub || keepFromHub);
    }

    prevPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isHubPath(pathname)) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateHubScroll(window.scrollY || 0);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}

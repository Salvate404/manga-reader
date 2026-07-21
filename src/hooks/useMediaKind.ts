"use client";

import { useState, useEffect, useCallback } from "react";
import type { MediaKind } from "@/lib/types";

const STORAGE_KEY = "media_kind";

export function useMediaKind() {
  const [kind, setKindState] = useState<MediaKind>("manga");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "manga" || stored === "anime") setKindState(stored);
    } catch {}
    setHydrated(true);
  }, []);

  const setKind = useCallback((next: MediaKind) => {
    setKindState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  return { kind, setKind, hydrated };
}

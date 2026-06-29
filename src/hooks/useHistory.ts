"use client";

import { useState, useEffect, useCallback } from "react";
import { getHistory, clearHistory } from "@/lib/history";
import type { ReadingHistoryEntry } from "@/lib/types";

export function useHistory() {
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);

  const refresh = useCallback(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    refresh();
    // Atualiza quando a tab volta ao foco (ex: volta da leitura)
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const handleClear = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  return { history, refresh, clearHistory: handleClear };
}

"use client";

/**
 * Barra de progresso global de navegação.
 * Aparece no topo da tela quando o usuário clica em qualquer link interno,
 * e desaparece quando a navegação termina (pathname muda).
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quando o pathname muda, a navegação terminou → completa e esconde
  useEffect(() => {
    if (!visible) return;
    // Dois timeouts rastreados para limpeza correta (evita update em componente desmontado)
    const id1 = setTimeout(() => {
      setWidth(100);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 300);
    }, 0);
    timerRef.current = id1;
    return () => {
      clearTimeout(timerRef.current ?? undefined);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Intercepta cliques em links internos para iniciar o progresso
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("#")) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      setVisible(true);
      setWidth(30);

      // Avança progressivamente enquanto a página carrega
      const id = setTimeout(() => setWidth(70), 200);
      timerRef.current = id;
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[100] h-[3px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] transition-all duration-300 ease-out pointer-events-none"
      style={{ width: `${width}%` }}
    />
  );
}

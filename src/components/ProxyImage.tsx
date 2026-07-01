"use client";

import { useState } from "react";
import { resolveImageUrl } from "@/lib/image-url";

interface ProxyImageProps {
  src: string | null | undefined;
  sourceId: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  onError?: () => void;
}

/** Imagem via proxy ou URL direta — usa <img> nativo (evita bug do next/image na Vercel).
 *  Se a URL proxiada falhar, tenta a URL original diretamente como fallback. */
export function ProxyImage({
  src,
  sourceId,
  alt,
  className = "",
  priority = false,
  fill = false,
  width,
  height,
  onError,
}: ProxyImageProps) {
  // Guarda o src anterior para detectar mudança e resetar o fallback
  const [tracked, setTracked] = useState<{ src: typeof src; useDirect: boolean }>({
    src,
    useDirect: false,
  });

  // Resetar fallback quando a prop `src` mudar (durante render, padrão React recomendado)
  if (tracked.src !== src) {
    setTracked({ src, useDirect: false });
  }

  const resolved = resolveImageUrl(src, sourceId);
  if (!resolved) return null;

  const isProxied = resolved !== src;
  const actualSrc = tracked.useDirect ? (src ?? "") : resolved;

  function handleError() {
    if (isProxied && !tracked.useDirect && src) {
      // Proxy falhou — tenta a URL original
      setTracked({ src, useDirect: true });
    } else {
      onError?.();
    }
  }

  const baseClass = fill
    ? `absolute inset-0 w-full h-full object-cover ${className}`
    : className;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={actualSrc}
      alt={alt}
      className={baseClass}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={handleError}
    />
  );
}

"use client";

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

/** Imagem via proxy ou URL direta — usa <img> nativo (evita bug do next/image na Vercel). */
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
  const resolved = resolveImageUrl(src, sourceId);
  if (!resolved) return null;

  const baseClass = fill
    ? `absolute inset-0 w-full h-full object-cover ${className}`
    : className;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      className={baseClass}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={onError}
    />
  );
}

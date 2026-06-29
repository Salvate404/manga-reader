/** Monta a URL de exibição para capas e imagens. */
export function resolveImageUrl(
  imageUrl: string | null | undefined,
  sourceId: string
): string | null {
  if (!imageUrl) return null;

  // MangaLix: capas estáticas públicas
  if (sourceId === "mangalix" && imageUrl.includes("mangalix.com/covers/")) {
    return imageUrl;
  }

  // Nexus CDN bloqueia IP da Vercel — browser carrega direto
  if (
    sourceId === "nexustoons" &&
    (imageUrl.includes("nx-toons.xyz") || imageUrl.includes("nexustoons.com"))
  ) {
    return imageUrl;
  }

  return `/api/proxy?url=${encodeURIComponent(imageUrl)}&sourceId=${sourceId}`;
}

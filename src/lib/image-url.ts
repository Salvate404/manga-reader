/** Monta a URL de exibição para capas e imagens. */
export function resolveImageUrl(
  imageUrl: string | null | undefined,
  sourceId: string
): string | null {
  if (!imageUrl) return null;

  // Capas públicas de anime
  if (
    sourceId === "anilist" ||
    sourceId === "animefire" ||
    sourceId === "goyabu" ||
    sourceId === "animesonline" ||
    sourceId === "animeunity" ||
    imageUrl.includes("anilist.co") ||
    imageUrl.includes("anizip") ||
    imageUrl.includes("myanimelist.net") ||
    imageUrl.includes("animefire.") ||
    imageUrl.includes("goyabu.") ||
    imageUrl.includes("animesonline.") ||
    imageUrl.includes("mangas.cloud")
  ) {
    return imageUrl;
  }

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

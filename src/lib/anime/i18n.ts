/** Traduz gêneros AniList (EN) para português. */
const GENRE_PT: Record<string, string> = {
  Action: "Ação",
  Adventure: "Aventura",
  Comedy: "Comédia",
  Drama: "Drama",
  Ecchi: "Ecchi",
  Fantasy: "Fantasia",
  Horror: "Terror",
  Mahou: "Magia",
  Mecha: "Mecha",
  Music: "Musical",
  Mystery: "Mistério",
  Psychological: "Psicológico",
  Romance: "Romance",
  "Sci-Fi": "Ficção Científica",
  "Slice of Life": "Slice of Life",
  Sports: "Esportes",
  Supernatural: "Sobrenatural",
  Thriller: "Suspense",
  Gourmet: "Gourmet",
};

export function translateGenre(genre: string): string {
  return GENRE_PT[genre] || genre;
}

export function translateGenres(genres?: string[] | null): string[] | undefined {
  if (!genres?.length) return undefined;
  return genres.map(translateGenre);
}

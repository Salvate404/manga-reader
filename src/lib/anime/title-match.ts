/** Normalização / score de títulos de anime (sem dependências de fontes). */

export function normalizeAnimeTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(dublado\)|\(legendado\)/gi, "")
    .replace(/todos os episodios/gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Score 0–100. Exige sobreposição forte — evita pegar “Naruto SD” no lugar de “Naruto”. */
export function titleMatchScore(candidate: string, target: string): number {
  const a = normalizeAnimeTitle(candidate);
  const b = normalizeAnimeTitle(target);
  if (!a || !b) return 0;
  if (a === b) return 100;

  if (a.includes(b) || b.includes(a)) {
    const longer = Math.max(a.length, b.length);
    const shorter = Math.min(a.length, b.length);
    const ratio = shorter / longer;
    if (ratio >= 0.85) return 92;
    if (ratio >= 0.7) return 75;
    return 40;
  }

  const wa = a.split(" ").filter((w) => w.length > 1);
  const wb = b.split(" ").filter((w) => w.length > 1);
  if (!wa.length || !wb.length) return 0;
  const setA = new Set(wa);
  const hit = wb.filter((w) => setA.has(w)).length;
  const coverage = hit / Math.max(wb.length, wa.length);
  return Math.round(coverage * 70);
}

import { NextRequest, NextResponse } from "next/server";
import { fetchMangaFireSearch } from "@/lib/mangafire-api";

/** Edge: IP diferente do Node serverless — contorna 403 do MangaFire na Vercel. */
export const runtime = "edge";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Parâmetro 'q' é obrigatório." }, { status: 400 });
  }

  try {
    const results = await fetchMangaFireSearch(query);
    return NextResponse.json({ results });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao buscar no MangaFire.";
    return NextResponse.json({ error: message, results: [] }, { status: 502 });
  }
}

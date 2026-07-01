import { NextRequest, NextResponse } from "next/server";
import { getScraperById } from "@/lib/scrapers/registry";
import { getMangaChapters } from "@/lib/manga-service";
import type { ChaptersApiResponse } from "@/lib/types";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");
  const mangaId = searchParams.get("mangaId");

  if (!sourceId || !mangaId) {
    return NextResponse.json(
      { error: "Parâmetros 'sourceId' e 'mangaId' são obrigatórios." },
      { status: 400 }
    );
  }

  if (!getScraperById(sourceId)) {
    return NextResponse.json(
      { error: `Fonte '${sourceId}' não encontrada.` },
      { status: 404 }
    );
  }

  try {
    const data = await getMangaChapters(sourceId, mangaId);
    if (!data) {
      return NextResponse.json({ error: "Mangá não encontrado." }, { status: 404 });
    }
    const response: ChaptersApiResponse = data;
    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno ao buscar capítulos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

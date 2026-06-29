import { NextRequest, NextResponse } from "next/server";
import { getScraperById } from "@/lib/scrapers/registry";
import type { ChaptersApiResponse } from "@/lib/types";

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

  const scraper = getScraperById(sourceId);
  if (!scraper) {
    return NextResponse.json(
      { error: `Fonte '${sourceId}' não encontrada.` },
      { status: 404 }
    );
  }

  try {
    const manga = await scraper.getMangaDetail(mangaId);
    const response: ChaptersApiResponse = { manga };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno ao buscar capítulos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getScraperById } from "@/lib/scrapers/registry";
import type { PagesApiResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");
  const chapterId = searchParams.get("chapterId");

  if (!sourceId || !chapterId) {
    return NextResponse.json(
      { error: "Parâmetros 'sourceId' e 'chapterId' são obrigatórios." },
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
    const pages = await scraper.getChapterPages(chapterId);
    const response: PagesApiResponse = { pages };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno ao buscar páginas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

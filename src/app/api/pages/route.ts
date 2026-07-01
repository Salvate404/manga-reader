import { NextRequest, NextResponse } from "next/server";
import { getScraperById } from "@/lib/scrapers/registry";
import { fetchNexusViaEdge } from "@/lib/nexus-api";
import type { PagesApiResponse } from "@/lib/types";

export const maxDuration = 30;

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

  if (sourceId === "nexustoons") {
    try {
      const data = await fetchNexusViaEdge<PagesApiResponse>(
        `/api/nexus/chapter/${encodeURIComponent(chapterId)}`
      );
      if (!data?.pages) {
        return NextResponse.json({ error: "Capítulo não encontrado." }, { status: 404 });
      }
      return NextResponse.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro interno ao buscar páginas.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
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
    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno ao buscar páginas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

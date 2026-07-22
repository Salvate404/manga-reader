import { NextResponse } from "next/server";
import { fetchMangaFireTrending } from "@/lib/mangafire-api";

export const runtime = "edge";

export async function GET() {
  try {
    const items = await fetchMangaFireTrending(12);
    return NextResponse.json({
      sourceId: "mangafire",
      sourceName: "MangaFire",
      items,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao carregar trending MangaFire.";
    return NextResponse.json(
      { sourceId: "mangafire", sourceName: "MangaFire", items: [], error: message },
      { status: 502 }
    );
  }
}

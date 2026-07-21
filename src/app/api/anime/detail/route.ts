import { NextRequest, NextResponse } from "next/server";
import { getAnimeDetail } from "@/lib/anime/anime-service";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const sourceId = req.nextUrl.searchParams.get("sourceId")?.trim();
  const animeId = req.nextUrl.searchParams.get("animeId")?.trim();

  if (!sourceId || !animeId) {
    return NextResponse.json(
      { error: "sourceId e animeId são obrigatórios" },
      { status: 400 }
    );
  }

  const anime = await getAnimeDetail(sourceId, animeId);
  if (!anime) {
    return NextResponse.json({ error: "Anime não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ anime });
}

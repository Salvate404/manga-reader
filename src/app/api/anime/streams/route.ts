import { NextRequest, NextResponse } from "next/server";
import {
  findSameAnimeElsewhere,
  getAnimeStreams,
} from "@/lib/anime/anime-service";
import type { AnimeAudioType } from "@/lib/types";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const sourceId = req.nextUrl.searchParams.get("sourceId")?.trim();
  const episodeId = req.nextUrl.searchParams.get("episodeId")?.trim();
  const title = req.nextUrl.searchParams.get("title")?.trim() || undefined;
  const episodeNumberRaw = req.nextUrl.searchParams.get("episodeNumber");
  const audioType = req.nextUrl.searchParams.get("audioType") as
    | AnimeAudioType
    | "all"
    | "unknown"
    | null;

  if (!sourceId || !episodeId) {
    return NextResponse.json(
      { error: "sourceId e episodeId são obrigatórios" },
      { status: 400 }
    );
  }

  const episodeNumber = episodeNumberRaw ? Number(episodeNumberRaw) : undefined;

  const streams = await getAnimeStreams(sourceId, episodeId, {
    title,
    episodeNumber: Number.isFinite(episodeNumber) ? episodeNumber : undefined,
    audioType: audioType || undefined,
  });

  if (streams) {
    return NextResponse.json({ streams });
  }

  // Sugestões da MESMA obra em outras fontes (não tenta tocar nelas automaticamente)
  let alternatives: Awaited<ReturnType<typeof findSameAnimeElsewhere>> = [];
  if (title) {
    alternatives = await findSameAnimeElsewhere(
      title,
      sourceId,
      audioType === "all" ? undefined : audioType || undefined
    );
  }

  return NextResponse.json(
    {
      error: `O vídeo não está disponível em ${sourceId}. O episódio não é buscado em outro site automaticamente (evita misturar fontes).`,
      alternatives,
    },
    { status: 404 }
  );
}

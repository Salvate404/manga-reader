import { NextRequest, NextResponse } from "next/server";
import { getShortStreams } from "@/lib/shorts/service";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const sourceId = req.nextUrl.searchParams.get("sourceId")?.trim() || "flextv";
  const episodeId = req.nextUrl.searchParams.get("episodeId")?.trim();
  if (!episodeId) {
    return NextResponse.json(
      { error: "episodeId é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const streams = await getShortStreams(sourceId, episodeId);
    if (!streams?.sources.length) {
      return NextResponse.json(
        { error: "Vídeo indisponível" },
        { status: 404 }
      );
    }
    return NextResponse.json({ streams });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Vídeo indisponível" },
      { status: 404 }
    );
  }
}

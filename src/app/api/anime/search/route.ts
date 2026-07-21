import { NextRequest, NextResponse } from "next/server";
import { searchAnime } from "@/lib/anime/anime-service";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Parâmetro q é obrigatório" }, { status: 400 });
  }

  const sourcesParam = req.nextUrl.searchParams.get("sources");
  const sourceIds = sourcesParam
    ? sourcesParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  try {
    const data = await searchAnime(q, sourceIds);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro na busca" },
      { status: 500 }
    );
  }
}

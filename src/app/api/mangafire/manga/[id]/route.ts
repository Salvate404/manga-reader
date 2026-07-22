import { NextRequest, NextResponse } from "next/server";
import { fetchMangaFireChaptersResponse } from "@/lib/mangafire-api";

export const runtime = "edge";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  try {
    const data = await fetchMangaFireChaptersResponse(decodeURIComponent(id));
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao carregar mangá MangaFire.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

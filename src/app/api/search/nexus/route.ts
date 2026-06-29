import { NextRequest, NextResponse } from "next/server";
import { fetchNexusSearch } from "@/lib/nexus-api";

/** Edge Runtime usa IP diferente — contorna bloqueio da Vercel no NexusToons. */
export const runtime = "edge";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Parâmetro 'q' é obrigatório." }, { status: 400 });
  }

  try {
    const results = await fetchNexusSearch(query);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar no NexusToons.";
    return NextResponse.json({ error: message, results: [] }, { status: 502 });
  }
}

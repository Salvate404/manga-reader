import { NextRequest, NextResponse } from "next/server";
import { fetchNexusMangaDetail } from "@/lib/nexus-api";

export const runtime = "edge";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const data = await fetchNexusMangaDetail(slug);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar mangá.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

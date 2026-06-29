import { NextRequest, NextResponse } from "next/server";
import { fetchNexusChapterPages } from "@/lib/nexus-api";

export const runtime = "edge";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const pages = await fetchNexusChapterPages(id);
    return NextResponse.json({ pages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar páginas.";
    return NextResponse.json({ error: message, pages: [] }, { status: 502 });
  }
}

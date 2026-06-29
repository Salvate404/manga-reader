import { NextResponse } from "next/server";
import { fetchNexusTrending } from "@/lib/nexus-api";

export const runtime = "edge";

export async function GET() {
  try {
    const items = await fetchNexusTrending(10);
    return NextResponse.json({
      sourceId: "nexustoons",
      sourceName: "Nexus Toons",
      items,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar destaques.";
    return NextResponse.json({ error: message, items: [] }, { status: 502 });
  }
}

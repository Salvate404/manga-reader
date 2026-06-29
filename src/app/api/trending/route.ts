import { NextResponse } from "next/server";
import { getTrendingBySource } from "@/lib/trending-service";

export const maxDuration = 30;

export async function GET() {
  try {
    const sections = await getTrendingBySource(10);
    return NextResponse.json({ sections });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar destaques.";
    return NextResponse.json({ error: message, sections: [] }, { status: 500 });
  }
}

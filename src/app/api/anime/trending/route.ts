import { NextResponse } from "next/server";
import { getAnimeTrending } from "@/lib/anime/anime-service";

export const maxDuration = 30;

export async function GET() {
  try {
    const sections = await getAnimeTrending();
    return NextResponse.json({ sections });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao carregar trending" },
      { status: 500 }
    );
  }
}

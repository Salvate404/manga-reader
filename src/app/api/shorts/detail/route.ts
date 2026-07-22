import { NextRequest, NextResponse } from "next/server";
import { getShortDetail } from "@/lib/shorts/service";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const sourceId = req.nextUrl.searchParams.get("sourceId")?.trim() || "flextv";
  const seriesId = req.nextUrl.searchParams.get("seriesId")?.trim();
  if (!seriesId) {
    return NextResponse.json({ error: "seriesId é obrigatório" }, { status: 400 });
  }

  const series = await getShortDetail(sourceId, seriesId);
  if (!series) {
    return NextResponse.json({ error: "Série não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ series });
}

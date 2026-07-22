import { NextResponse } from "next/server";
import { getShortsTrending } from "@/lib/shorts/service";

export const maxDuration = 30;

export async function GET() {
  try {
    const sections = await getShortsTrending(16);
    return NextResponse.json({ sections });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erro no trending",
        sections: [],
      },
      { status: 500 }
    );
  }
}

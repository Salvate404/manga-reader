import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const size = Math.min(Math.max(Number(searchParams.get("size") ?? 512), 16), 512);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          borderRadius: size * 0.22,
        }}
      >
        {/* Fundo vermelho do ícone do livro */}
        <div
          style={{
            width: size * 0.58,
            height: size * 0.58,
            background: "#dc2626",
            borderRadius: size * 0.12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 ${size * 0.15}px rgba(220,38,38,0.5)`,
          }}
        >
          {/* Ícone livro simplificado */}
          <svg
            width={size * 0.36}
            height={size * 0.36}
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
          </svg>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}

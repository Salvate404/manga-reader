import { NextRequest, NextResponse } from "next/server";
import { getScraperById } from "@/lib/scrapers/registry";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function hasLikelyImageExtension(url: URL): boolean {
  return /\.(?:jpe?g|png|webp|gif|avif)$/i.test(url.pathname);
}

/**
 * Proxy de imagens — evita CORS e oculta a origem dos recursos.
 *
 * Uso: /api/proxy?url=<encodedUrl>&sourceId=<id>
 *
 * O parâmetro sourceId é opcional: quando fornecido, os headers
 * específicos da fonte (Referer, User-Agent) são aplicados.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");
  const sourceId = searchParams.get("sourceId") ?? undefined;

  if (!imageUrl) {
    return new NextResponse("Parâmetro 'url' ausente.", { status: 400 });
  }

  // Valida que é uma URL HTTP(S) válida — evita SSRF para localhost/intranet
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return new NextResponse("URL inválida.", { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new NextResponse("Protocolo não permitido.", { status: 400 });
  }

  // Bloqueia requisições para endereços privados (SSRF)
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  ) {
    return new NextResponse("Endereço não permitido.", { status: 403 });
  }

  // Monta os headers de requisição (Referer, User-Agent)
  const scraper = sourceId ? getScraperById(sourceId) : undefined;
  const fetchHeaders = scraper
    ? scraper.getImageHeaders(imageUrl)
    : {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      };

  try {
    let upstream = await fetch(imageUrl, {
      headers: fetchHeaders,
      // Timeout via AbortController
      signal: AbortSignal.timeout(15_000),
    });

    // Algumas CDNs recusam Referer/Origin forjados; tenta novamente sem headers da fonte.
    if (!upstream.ok && (upstream.status === 401 || upstream.status === 403) && sourceId) {
      upstream = await fetch(imageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        },
        signal: AbortSignal.timeout(15_000),
      });
    }

    if (!upstream.ok) {
      return new NextResponse(`Upstream retornou ${upstream.status}`, {
        status: upstream.status,
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    const baseType = contentType.split(";")[0].trim().toLowerCase();

    // Aceita tipos de imagem e fallback para octet-stream quando URL indica arquivo de imagem.
    const contentTypeAllowed =
      ALLOWED_CONTENT_TYPES.has(baseType) ||
      baseType.startsWith("image/") ||
      (baseType === "application/octet-stream" && hasLikelyImageExtension(parsed));

    if (!contentTypeAllowed) {
      return new NextResponse("Tipo de conteúdo não permitido.", { status: 415 });
    }

    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return new NextResponse("Timeout ao buscar imagem.", { status: 504 });
    }
    return new NextResponse("Erro ao buscar imagem.", { status: 502 });
  }
}

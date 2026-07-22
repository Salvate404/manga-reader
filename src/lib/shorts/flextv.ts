import { createDecipheriv, createHash, createHmac, randomUUID } from "crypto";
import type {
  AnimeEpisode,
  AnimeEpisodeStreams,
  ShortDetail,
  ShortSearchResult,
} from "@/lib/types";

const API = "https://api-quick.flextv.cc";
const SITE = "https://www.flextv.cc";
const APP_ID = "859mw3lnt40rxbca"; // PC
const SIGN_SECRET = "FifZlSY4nb0eg6k8oDG2xC3UIMOwdBru";
const AES_KEY = Buffer.from("qJZCGsxOPrUFuiz2", "utf8");
const AES_IV = Buffer.from("3zxNedKJCoLV4Fi7", "utf8");

function md5(s: string): string {
  return createHash("md5").update(s).digest("hex");
}

function hmacSha256Hex(s: string, key: string): string {
  return createHmac("sha256", key).update(s).digest("hex");
}

function aesDecryptBase64(b64: string): string {
  const data = Buffer.from(b64, "base64");
  const decipher = createDecipheriv("aes-128-cbc", AES_KEY, AES_IV);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8"
  );
}

function parseEpisodeId(
  episodeId: string
): { seriesId: string; ep: number } | null {
  const m = episodeId.match(/^(.+):(\d+)$/);
  if (!m) return null;
  const ep = Number(m[2]);
  if (!Number.isFinite(ep) || ep < 1) return null;
  return { seriesId: m[1], ep };
}

type FlexJson = {
  code: number;
  msg?: string;
  data?: unknown;
  is_encrypt?: number | boolean;
};

async function apiGet(
  path: string,
  query: Record<string, string | number> = {},
  lang = "pt"
): Promise<FlexJson> {
  const deviceNumber = randomUUID();
  const timestamp = Math.round(Date.now() / 1000).toString();
  const apiUrl = md5(`${API}${path}`.toLowerCase());
  const queryStr = Object.fromEntries(
    Object.entries(query).map(([k, v]) => [k, String(v)])
  );

  const signPayload: Record<string, string> = {
    apiUrl,
    appId: APP_ID,
    lang,
    timestamp,
    deviceNumber,
    ...queryStr,
  };
  for (const k of Object.keys(signPayload)) {
    if (signPayload[k] === "" || signPayload[k] === undefined) {
      delete signPayload[k];
    }
  }

  const flat = Object.keys(signPayload)
    .sort()
    .reduce((acc, k) => acc + k + signPayload[k], "");
  const signature = hmacSha256Hex(flat, SIGN_SECRET);

  const headers: Record<string, string> = {
    appId: APP_ID,
    lang,
    timestamp,
    token: "",
    apiUrl,
    gmtTd: String(-new Date().getTimezoneOffset() / 60),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    deviceNumber,
    signature,
    Accept: "application/json",
    Origin: SITE,
    Referer: `${SITE}/pt/`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  };

  const qs = new URLSearchParams(queryStr).toString();
  const res = await fetch(`${API}${path}${qs ? `?${qs}` : ""}`, {
    headers,
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`FlexTV HTTP ${res.status}`);

  const json = (await res.json()) as FlexJson;
  if (json.is_encrypt && typeof json.data === "string") {
    json.data = JSON.parse(aesDecryptBase64(json.data));
  }
  return json;
}

type FlexSearchItem = {
  series_id?: string;
  series_name?: string;
  cover?: string;
  description?: string;
  watch_num_str?: string;
  collect_num_str?: string;
  tags?: string[];
};

type FlexDetail = {
  series_id?: string;
  series_name?: string;
  cover?: string;
  description?: string;
  last_series_no?: number;
  lang?: string;
};

type FlexPlay = {
  video_url?: string;
  is_trial?: number;
  cover?: string;
  duration?: number;
};

type FlexHotWord = {
  series_id?: string;
  series_name?: string;
  word?: string;
  is_hot?: number;
};

function toSearchResult(item: FlexSearchItem): ShortSearchResult | null {
  if (!item.series_id || !item.series_name) return null;
  return {
    sourceId: "flextv",
    sourceName: "FlexTV",
    seriesId: item.series_id,
    title: item.series_name,
    cover: item.cover || null,
    url: `${SITE}/pt/`,
    format: "Short Drama",
  };
}

/** FlexTV — short dramas em português (dublado/legendado). */
export const flexTv = {
  sourceId: "flextv" as const,
  sourceName: "FlexTV" as const,
  baseUrl: SITE,
  language: "PT-BR" as const,

  async search(query: string): Promise<ShortSearchResult[]> {
    const json = await apiGet("/webSearch", {
      keyword: query.trim(),
      page_no: 1,
      page_size: 24,
    });
    if (json.code !== 0) {
      throw new Error(json.msg || `FlexTV busca code ${json.code}`);
    }
    const list = ((json.data as { list?: FlexSearchItem[] })?.list || [])
      .map(toSearchResult)
      .filter((x): x is ShortSearchResult => !!x);
    return list;
  },

  async getTrending(limit = 16): Promise<ShortSearchResult[]> {
    const json = await apiGet("/webHotWords", {});
    if (json.code !== 0) {
      throw new Error(json.msg || `FlexTV trending code ${json.code}`);
    }
    const words = (json.data as FlexHotWord[]) || [];
    const seen = new Set<string>();
    const out: ShortSearchResult[] = [];
    for (const w of words) {
      if (!w.series_id || seen.has(w.series_id)) continue;
      seen.add(w.series_id);
      out.push({
        sourceId: "flextv",
        sourceName: "FlexTV",
        seriesId: w.series_id,
        title: w.series_name || w.word || w.series_id,
        cover: null,
        url: `${SITE}/pt/`,
        format: "Short Drama",
      });
      if (out.length >= limit) break;
    }
    return out;
  },

  async getDetail(seriesId: string): Promise<ShortDetail> {
    const id = decodeURIComponent(seriesId);
    const json = await apiGet("/webGetSeriesDetailContent", { series_id: id });
    if (json.code !== 0) {
      throw new Error(json.msg || `FlexTV detalhe code ${json.code}`);
    }
    const payload = json.data as { detail?: FlexDetail } | FlexDetail;
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? (payload.detail as FlexDetail)
        : (payload as FlexDetail);

    const total = Math.max(1, Number(detail.last_series_no) || 1);
    const episodes: AnimeEpisode[] = [];
    for (let n = 1; n <= total; n++) {
      episodes.push({
        id: `${id}:${n}`,
        number: n,
        title: `Episódio ${n}`,
      });
    }

    return {
      sourceId: "flextv",
      seriesId: detail.series_id || id,
      title: detail.series_name || id,
      cover: detail.cover || null,
      description: detail.description,
      episodeCount: total,
      episodes,
      format: "Short Drama · FlexTV",
    };
  },

  async getEpisodeStreams(episodeId: string): Promise<AnimeEpisodeStreams> {
    const parsed = parseEpisodeId(decodeURIComponent(episodeId));
    if (!parsed) throw new Error(`FlexTV episódio inválido: ${episodeId}`);

    const json = await apiGet("/webGetPlayInfo", {
      series_id: parsed.seriesId,
      series_no: parsed.ep,
    });
    if (json.code !== 0) {
      throw new Error(
        json.msg ||
          (json.code === 30002
            ? "Episódio bloqueado na fonte (login/moedas)"
            : `FlexTV stream code ${json.code}`)
      );
    }
    const play = json.data as FlexPlay;
    if (!play?.video_url) {
      throw new Error("FlexTV: URL de vídeo não encontrada");
    }

    const isM3U8 = /\.m3u8(\?|$)/i.test(play.video_url);
    return {
      sources: [
        {
          url: play.video_url,
          quality: play.is_trial ? "HLS (trial)" : "HLS",
          isM3U8,
        },
      ],
      headers: {
        Referer: `${SITE}/`,
      },
    };
  },
};

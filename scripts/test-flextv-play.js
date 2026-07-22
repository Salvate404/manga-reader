const crypto = require("crypto");
const fs = require("fs");

function md5(s) {
  return crypto.createHash("md5").update(s).digest("hex");
}
function hmacSha256Hex(s, key) {
  return crypto.createHmac("sha256", key).update(s).digest("hex");
}
function aesDecryptBase64(b64) {
  const key = Buffer.from("qJZCGsxOPrUFuiz2", "utf8");
  const iv = Buffer.from("3zxNedKJCoLV4Fi7", "utf8");
  const data = Buffer.from(b64, "base64");
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

const API = "https://api-quick.flextv.cc";
const APP_ID = "859mw3lnt40rxbca";
const SECRET = "FifZlSY4nb0eg6k8oDG2xC3UIMOwdBru";

async function apiGet(path, query = {}, lang = "pt") {
  const deviceNumber = crypto.randomUUID();
  const timestamp = Math.round(Date.now() / 1000).toString();
  const apiUrl = md5(`${API}${path}`.toLowerCase());
  const signPayload = { apiUrl, appId: APP_ID, lang, timestamp, deviceNumber, ...query };
  for (const k of Object.keys(signPayload)) {
    if (signPayload[k] === "" || signPayload[k] === undefined) delete signPayload[k];
  }
  const m = Object.keys(signPayload)
    .sort()
    .reduce((acc, k) => acc + k + String(signPayload[k]), "");
  const signature = hmacSha256Hex(m, SECRET);
  const headers = {
    appId: APP_ID,
    lang,
    timestamp,
    token: "",
    apiUrl,
    gmtTd: "-3",
    timeZone: "America/Sao_Paulo",
    deviceNumber,
    signature,
    Accept: "application/json",
    Origin: "https://www.flextv.cc",
    Referer: "https://www.flextv.cc/pt/",
    "User-Agent": "Mozilla/5.0",
  };
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)]))
  ).toString();
  const r = await fetch(`${API}${path}?${qs}`, { headers });
  const json = await r.json();
  if (json.is_encrypt && typeof json.data === "string") {
    json.data = JSON.parse(aesDecryptBase64(json.data));
  }
  return json;
}

(async () => {
  // Inspect Dw4UPhha for play info params
  const js = fs.readFileSync("scripts/_flextv_Dw4UPhha.js", "utf8");
  for (const n of [
    "webGetPlayInfo",
    "webGetSeriesDetailContent",
    "webRankingRecommend",
  ]) {
    const i = js.indexOf(n);
    console.log("\n===", n, "===\n", js.slice(Math.max(0, i - 80), i + 500));
  }

  const seriesId = "qLZmA8AZvr"; // O Juramento do Fuzileiro dublada from hot words

  const detail = await apiGet("/webGetSeriesDetailContent", {
    series_id: seriesId,
  });
  console.log("\nDETAIL", JSON.stringify(detail, null, 2).slice(0, 2500));

  // try play with series_id + series_no
  for (const q of [
    { series_id: seriesId, series_no: "1" },
    { series_id: seriesId, episode_no: "1" },
    { series_id: seriesId, series_id_origin: "0", series_no: "1" },
  ]) {
    const play = await apiGet("/webGetPlayInfo", q);
    console.log("\nPLAY", q, JSON.stringify(play, null, 2).slice(0, 1500));
  }

  const rank = await apiGet("/webRankingRecommend", {});
  console.log("\nRANK", JSON.stringify(rank, null, 2).slice(0, 1000));
})();

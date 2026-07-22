const crypto = require("crypto");

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
  // full section with range
  for (const q of [
    { series_id: "qLZmA8AZvr", range_id: "1" },
    { series_id: "qLZmA8AZvr", range_id: "1", page_no: "1", page_size: "50" },
  ]) {
    const s = await apiGet("/webGetSeriesSectionContentList", q);
    const list = s.data?.list || [];
    console.log(q, "len", list.length, "first", list[0]?.series_no, "last", list.at(-1)?.series_no);
  }

  // high episode paywall?
  const p50 = await apiGet("/webGetPlayInfo", { series_id: "qLZmA8AZvr", series_no: "50" });
  console.log("ep50", p50.code, p50.data?.is_trial, p50.data?.video_url?.slice(0, 80));
})();

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
  const queryStr = Object.fromEntries(
    Object.entries(query).map(([k, v]) => [k, String(v)])
  );
  const signPayload = { apiUrl, appId: APP_ID, lang, timestamp, deviceNumber, ...queryStr };
  for (const k of Object.keys(signPayload)) {
    if (signPayload[k] === "" || signPayload[k] === undefined) delete signPayload[k];
  }
  const flat = Object.keys(signPayload)
    .sort()
    .reduce((acc, k) => acc + k + signPayload[k], "");
  const signature = hmacSha256Hex(flat, SECRET);
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
  const qs = new URLSearchParams(queryStr).toString();
  const r = await fetch(`${API}${path}?${qs}`, { headers });
  const json = await r.json();
  if (json.is_encrypt && typeof json.data === "string") {
    json.data = JSON.parse(aesDecryptBase64(json.data));
  }
  return json;
}

(async () => {
  const play = await apiGet("/webGetPlayInfo", {
    series_id: "WKzLeb0nr0",
    series_no: "1",
  });
  console.log("full play", JSON.stringify(play.data, null, 2));

  const url = play.data.video_url;
  const pl = await fetch(url, {
    headers: { Referer: "https://www.flextv.cc/", "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.text());
  console.log("\nmaster/abr playlist:\n", pl.slice(0, 800));

  // if master, fetch first variant
  const variant = pl.match(/https?:[^\s]+|\S+\.m3u8[^\s]*/);
  if (variant) {
    const vu = variant[0].startsWith("http")
      ? variant[0]
      : url.replace(/[^/]+$/, variant[0].split("?")[0]) +
        (variant[0].includes("?") ? "" : "") ;
    // resolve relative
    let full = variant[0];
    if (!full.startsWith("http")) {
      const base = url.substring(0, url.lastIndexOf("/") + 1);
      full = base + full.split("?")[0];
      const auth = url.includes("?") ? "?" + url.split("?")[1] : "";
      // keep auth on relative? often on each line
      if (!full.includes("auth_key") && variant[0].includes("?")) full = base + variant[0];
      else if (!full.includes("auth_key") && auth) {
        // segments often have own auth
      }
    }
    console.log("\nvariant url try", full.slice(0, 150));
    try {
      const v = await fetch(full.startsWith("http") ? full : new URL(variant[0], url).toString(), {
        headers: { Referer: "https://www.flextv.cc/", "User-Agent": "Mozilla/5.0" },
      }).then((r) => r.text());
      console.log("variant:\n", v.slice(0, 500));
    } catch (e) {
      console.log("variant fail", e.message);
    }
  }

  // try quality params
  for (const q of [
    { series_id: "WKzLeb0nr0", series_no: "1", clarity: "1080" },
    { series_id: "WKzLeb0nr0", series_no: "1", definition: "hd" },
    { series_id: "WKzLeb0nr0", series_no: "1", quality: "high" },
  ]) {
    const p = await apiGet("/webGetPlayInfo", q);
    console.log("\ntry", q, p.code, p.data?.video_url?.includes("abr") ? "abr" : p.data?.video_url?.slice(-40));
  }
})();

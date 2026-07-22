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

async function apiGet(path, query = {}) {
  const deviceNumber = crypto.randomUUID();
  const timestamp = Math.round(Date.now() / 1000).toString();
  const apiUrl = md5(`${API}${path}`.toLowerCase());
  const queryStr = Object.fromEntries(
    Object.entries(query).map(([k, v]) => [k, String(v)])
  );
  const signPayload = {
    apiUrl,
    appId: APP_ID,
    lang: "pt",
    timestamp,
    deviceNumber,
    ...queryStr,
  };
  for (const k of Object.keys(signPayload)) {
    if (!signPayload[k]) delete signPayload[k];
  }
  const flat = Object.keys(signPayload)
    .sort()
    .reduce((acc, k) => acc + k + signPayload[k], "");
  const signature = hmacSha256Hex(flat, SECRET);
  const r = await fetch(`${API}${path}?${new URLSearchParams(queryStr)}`, {
    headers: {
      appId: APP_ID,
      lang: "pt",
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
    },
  });
  const json = await r.json();
  if (json.is_encrypt && typeof json.data === "string") {
    json.data = JSON.parse(aesDecryptBase64(json.data));
  }
  return json;
}

async function probeUrl(label, url) {
  const r = await fetch(url, {
    headers: { Referer: "https://www.flextv.cc/", "User-Agent": "Mozilla/5.0" },
  });
  const t = await r.text();
  if (r.status !== 200 || !t.includes("#EXTM3U")) {
    console.log(label, r.status, t.slice(0, 80).replace(/\s+/g, " "));
    return;
  }
  const seg = t.split("\n").find((l) => l.includes(".ts"));
  const segUrl = new URL(seg, url).toString();
  const buf = Buffer.from(
    await fetch(segUrl, {
      headers: { Referer: "https://www.flextv.cc/" },
    }).then((r) => r.arrayBuffer())
  );
  const dur = Number(t.match(/#EXTINF:([\d.]+)/)?.[1] || 5);
  console.log(
    label,
    "ok ~",
    Math.round((buf.length * 8) / (dur * 1000)),
    "kbps",
    "bytes",
    buf.length
  );
}

(async () => {
  const play = await apiGet("/webGetPlayInfo", {
    series_id: "WKzLeb0nr0",
    series_no: "1",
  });
  const url = play.data.video_url;
  console.log("base", url);
  await probeUrl("abr", url);

  // mutate filename
  for (const name of [
    "1080.m3u8",
    "720.m3u8",
    "540.m3u8",
    "hd.m3u8",
    "origin.m3u8",
    "origin1.m3u8",
    "high.m3u8",
    "index.m3u8",
    "playlist.m3u8",
    "master.m3u8",
  ]) {
    const u = url.replace(/abr\.m3u8/, name);
    await probeUrl(name, u);
  }

  // Try mobile appId for play
  // (reuse same play - probably same)
})();

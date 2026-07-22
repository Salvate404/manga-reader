const crypto = require("crypto");
const fs = require("fs");
const cheerio = require("cheerio");

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
  const r = await fetch(
    `${API}${path}?${new URLSearchParams(queryStr)}`,
    {
      headers: {
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
      },
    }
  );
  const json = await r.json();
  if (json.is_encrypt && typeof json.data === "string") {
    json.data = JSON.parse(aesDecryptBase64(json.data));
  }
  return json;
}

(async () => {
  // Measure FlexTV segment size
  const play = await apiGet("/webGetPlayInfo", {
    series_id: "WKzLeb0nr0",
    series_no: "1",
  });
  const plUrl = play.data.video_url;
  const pl = await fetch(plUrl, {
    headers: { Referer: "https://www.flextv.cc/" },
  }).then((r) => r.text());
  const seg = pl.split("\n").find((l) => l.includes(".ts"));
  const segUrl = new URL(seg, plUrl).toString();
  const segBuf = Buffer.from(
    await fetch(segUrl, { headers: { Referer: "https://www.flextv.cc/" } }).then(
      (r) => r.arrayBuffer()
    )
  );
  console.log("flextv segment bytes", segBuf.length, "5s => ~", Math.round((segBuf.length * 8) / 5000), "kbps");

  // ShortDrama compare
  const html = await fetch("https://shortdrama.st/series/the-ceo/1", {
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.text());
  const $ = cheerio.load(html);
  const src = $("#player").attr("data-src");
  const m3u8 = "https://shortdrama.st" + src;
  const sdPl = await fetch(m3u8).then((r) => r.text());
  console.log("shortdrama head", sdPl.split("\n").slice(0, 15).join("\n"));
  const sdSeg = sdPl.split("\n").find((l) => l.includes(".ts"));
  const sdSegUrl = new URL(sdSeg, m3u8).toString();
  const sdBuf = Buffer.from(await fetch(sdSegUrl).then((r) => r.arrayBuffer()));
  const dur = Number(sdPl.match(/#EXTINF:([\d.]+)/)?.[1] || 10);
  console.log(
    "shortdrama segment bytes",
    sdBuf.length,
    "dur",
    dur,
    "=> ~",
    Math.round((sdBuf.length * 8) / (dur * 1000)),
    "kbps"
  );

  // Look for non-abr play urls in flextv js
  const js = fs.readFileSync("scripts/_flextv_Dw4UPhha.js", "utf8");
  for (const n of ["abr", "video_url", "progressive", "1080", "720", "540", "clarity", "definition"]) {
    let i = 0,
      c = 0;
    while ((i = js.indexOf(n, i)) >= 0 && c < 2) {
      console.log(n, js.slice(i - 40, i + 80).replace(/\n/g, " "));
      i += n.length;
      c++;
    }
  }

  // GoodShort probe
  const gs = await fetch(
    "https://www.goodshort.com/drama/dublado-voltei-mas-o-amor-nunca-foi-embora-31001192618",
    { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "pt-BR" } }
  ).then((r) => r.text());
  console.log(
    "goodshort",
    gs.length,
    "m3u8",
    gs.includes("m3u8"),
    "video",
    /<video/i.test(gs),
    "next",
    gs.includes("__NEXT_DATA__")
  );
  const g$ = cheerio.load(gs);
  console.log("gs title", g$("title").text().slice(0, 80));
  console.log(
    "gs scripts",
    g$("script[src]")
      .map((_, el) => g$(el).attr("src"))
      .get()
      .filter((s) => /chunk|app|main/i.test(s || ""))
      .slice(0, 8)
  );
})();

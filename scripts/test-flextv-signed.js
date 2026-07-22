const cheerio = require("cheerio");
const crypto = require("crypto");

function md5(s) {
  return crypto.createHash("md5").update(s).digest("hex");
}
function hmacSha256(s, key) {
  return crypto.createHmac("sha256", key).update(s).digest("hex");
}
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const API = "https://api-quick.flextv.cc";
const APP_ID = "859mw3lnt40rxbca"; // PC
const SECRET = "FifZlSY4nb0eg6k8oDG2xC3UIMOwdBru";

async function apiGet(path, query = {}, lang = "pt") {
  const deviceNumber = uuid();
  const timestamp = Math.round(Date.now() / 1000).toString();
  const apiUrl = md5(`${API}${path}`.toLowerCase());
  const signPayload = {
    apiUrl,
    appId: APP_ID,
    lang,
    timestamp,
    deviceNumber,
    ...query,
  };
  // remove empty
  for (const k of Object.keys(signPayload)) {
    if (signPayload[k] === "" || signPayload[k] === undefined) delete signPayload[k];
  }
  const m = Object.keys(signPayload)
    .sort()
    .reduce((acc, k) => acc + k + signPayload[k], "");
  const signature = hmacSha256(m, SECRET);

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
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  };

  const qs = new URLSearchParams(query).toString();
  const url = `${API}${path}${qs ? `?${qs}` : ""}`;
  const r = await fetch(url, { headers });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  console.log("\n", path, r.status, "code", json.code, "msg", json.msg);
  console.log(JSON.stringify(json).slice(0, 800));
  return json;
}

(async () => {
  await apiGet("/webSearch", { keyword: "ceo", page_no: "1", page_size: "10" });
  await apiGet("/webHotWords", {});
  await apiGet("/webResource/positions", {});

  // check episode page for app-only markers
  const html = await fetch(
    "https://www.flextv.cc/pt/episodes/episode-1-dublada-acorda-querido-k5O3rGdZLg",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  ).then((r) => r.text());
  const $ = cheerio.load(html);
  console.log("\nbuttons", $("button, a.btn, .play-btn, [class*='play']").slice(0, 10).map((_,el)=>$(el).text().trim().slice(0,40)).get());
  console.log("open app?", /abrir o app|open app|download|baixar/i.test(html));
})();

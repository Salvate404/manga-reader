const crypto = require("crypto");

function md5(s) {
  return crypto.createHash("md5").update(s).digest("hex");
}
function hmacSha256Hex(s, key) {
  return crypto.createHmac("sha256", key).update(s).digest("hex");
}
function uuid() {
  return crypto.randomUUID();
}

function aesDecryptBase64(b64) {
  const key = Buffer.from("qJZCGsxOPrUFuiz2", "utf8");
  const iv = Buffer.from("3zxNedKJCoLV4Fi7", "utf8");
  const data = Buffer.from(b64, "base64");
  // CryptoJS default is AES-128-CBC with PKCS7
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  const out = Buffer.concat([decipher.update(data), decipher.final()]);
  return out.toString("utf8");
}

const API = "https://api-quick.flextv.cc";
const APP_ID = "859mw3lnt40rxbca";
const SECRET = "FifZlSY4nb0eg6k8oDG2xC3UIMOwdBru";

async function apiGet(path, query = {}, lang = "pt") {
  const deviceNumber = uuid();
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
    try {
      json.data = JSON.parse(aesDecryptBase64(json.data));
    } catch (e) {
      console.log("decrypt fail", e.message, json.data.slice(0, 40));
    }
  }
  return json;
}

(async () => {
  const search = await apiGet("/webSearch", {
    keyword: "ceo",
    page_no: "1",
    page_size: "5",
  });
  console.log("search code", search.code, search.is_encrypt);
  console.log(JSON.stringify(search.data, null, 2).slice(0, 2000));

  const hot = await apiGet("/webHotWords", {});
  console.log("\nhot", JSON.stringify(hot.data, null, 2).slice(0, 800));
})();

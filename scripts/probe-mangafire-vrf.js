/** Probe MangaFire ajax with VRF (ported algorithm). */

const CONST = {
  rc4Keys: [
    "FgxyJUQDPUGSzwbAq/ToWn4/e8jYzvabE+dLMb1XU1o=",
    "CQx3CLwswJAnM1VxOqX+y+f3eUns03ulxv8Z+0gUyik=",
    "fAS+otFLkKsKAJzu3yU+rGOlbbFVq+u+LaS6+s1eCJs=",
    "Oy45fQVK9kq9019+VysXVlz1F9S1YwYKgXyzGlZrijo=",
    "aoDIdXezm2l3HrcnQdkPJTDT8+W6mcl2/02ewBHfPzg=",
  ],
  seeds32: [
    "yH6MXnMEcDVWO/9a6P9W92BAh1eRLVFxFlWTHUqQ474=",
    "RK7y4dZ0azs9Uqz+bbFB46Bx2K9EHg74ndxknY9uknA=",
    "rqr9HeTQOg8TlFiIGZpJaxcvAaKHwMwrkqojJCpcvoc=",
    "/4GPpmZXYpn5RpkP7FC/dt8SXz7W30nUZTe8wb+3xmU=",
    "wsSGSBXKWA9q1oDJpjtJddVxH+evCfL5SO9HZnUDFU8=",
  ],
  prefixKeys: ["l9PavRg=", "Ml2v7ag1Jg==", "i/Va0UxrbMo=", "WFjKAHGEkQM=", "5Rr27rWd"],
};

const toBytes = (str) => Array.from(str, (c) => c.charCodeAt(0) & 0xff);
const fromBytes = (bytes) => bytes.map((b) => String.fromCharCode(b & 0xff)).join("");
const b64encode = (data) => Buffer.from(data, "base64").toString("binary");
const b64decode = (s) => Buffer.from(s, "binary").toString("base64");

function rc4Bytes(key, input) {
  const s = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const out = new Array(input.length);
  let i = 0;
  j = 0;
  for (let y = 0; y < input.length; y++) {
    i = (i + 1) & 0xff;
    j = (j + s[i]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
    const k = s[(s[i] + s[j]) & 0xff];
    out[y] = ((input[y] || 0) ^ k) & 0xff;
  }
  return out;
}

function transform(input, initSeedBytes, prefixKeyBytes, prefixLen, schedule) {
  const out = [];
  for (let i = 0; i < input.length; i++) {
    if (i < prefixLen) out.push(prefixKeyBytes[i] || 0);
    const op = schedule[i % 10];
    if (op) out.push(op(((input[i] || 0) ^ (initSeedBytes[i % 32] || 0)) & 0xff) & 0xff);
  }
  return out;
}

const add8 = (n) => (c) => (c + n) & 0xff;
const sub8 = (n) => (c) => (c - n + 256) & 0xff;
const rotl8 = (n) => (c) => ((c << n) | (c >>> (8 - n))) & 0xff;
const rotr8 = (n) => (c) => ((c >>> n) | (c << (8 - n))) & 0xff;
const bytesFromBase64 = (b64) => toBytes(b64encode(b64));
const base64UrlEncodeBytes = (bytes) =>
  b64decode(fromBytes(bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function generateVrf(input) {
  const schedule0 = [sub8(223), rotr8(4), rotr8(4), add8(234), rotr8(7), rotr8(2), rotr8(7), sub8(223), rotr8(7), rotr8(6)];
  const schedule1 = [add8(19), rotr8(7), add8(19), rotr8(6), add8(19), rotr8(1), add8(19), rotr8(6), rotr8(7), rotr8(4)];
  const schedule2 = [sub8(223), rotr8(1), add8(19), sub8(223), rotl8(2), sub8(223), add8(19), rotl8(1), rotl8(2), rotl8(1)];
  const schedule3 = [add8(19), rotl8(1), rotl8(1), rotr8(1), add8(234), rotl8(1), sub8(223), rotl8(6), rotl8(4), rotl8(1)];
  const schedule4 = [rotr8(1), rotl8(1), rotl8(6), rotr8(1), rotl8(2), rotr8(4), rotl8(1), rotl8(1), sub8(223), rotl8(2)];

  let bytes = toBytes(encodeURIComponent(input));
  for (let step = 0; step < 5; step++) {
    const schedules = [schedule0, schedule1, schedule2, schedule3, schedule4];
    bytes = rc4Bytes(b64encode(CONST.rc4Keys[step]), bytes);
    const prefixKey = bytesFromBase64(CONST.prefixKeys[step]);
    bytes = transform(bytes, bytesFromBase64(CONST.seeds32[step]), prefixKey, prefixKey.length, schedules[step]);
  }
  return base64UrlEncodeBytes(bytes);
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

async function get(url, extra = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
      Referer: "https://mangafire.to/",
      "X-Requested-With": "XMLHttpRequest",
      ...extra,
    },
  });
  const text = await res.text();
  return { status: res.status, text, ct: res.headers.get("content-type") };
}

(async () => {
  const slug = "zk12-goodnight-punpun";
  const codes = ["zk12", slug, "zk12.goodnight-punpun"];

  // search
  const kw = "punpun";
  const searchVrf = generateVrf(kw);
  console.log("search vrf", searchVrf.slice(0, 40));
  for (const path of [
    `https://mangafire.to/filter?keyword=${encodeURIComponent(kw)}&page=1&vrf=${encodeURIComponent(searchVrf)}`,
    `https://mangafire.to/filter?keyword=${encodeURIComponent(kw)}&vrf=${encodeURIComponent(searchVrf)}`,
  ]) {
    const r = await get(path);
    console.log("SEARCH", r.status, r.ct, r.text.length, r.text.includes("unit") || r.text.includes("title"), r.text.slice(0, 120).replace(/\s+/g, " "));
  }

  for (const code of codes) {
    const vrf = generateVrf(`${code}@chapter@en`);
    const urls = [
      `https://mangafire.to/ajax/read/${code}/chapter/en?vrf=${encodeURIComponent(vrf)}`,
      `https://mangafire.to/ajax/manga/${code}/chapter/en?vrf=${encodeURIComponent(vrf)}`,
    ];
    for (const u of urls) {
      const r = await get(u);
      console.log("CH", code, r.status, r.ct, r.text.slice(0, 180).replace(/\s+/g, " "));
    }
  }

  // title page sizes
  for (const u of [
    "https://mangafire.to/title/zk12-goodnight-punpun",
    "https://mangafire.to/manga/zk12-goodnight-punpun",
    "https://mangafire.to/home",
  ]) {
    const r = await get(u, { "X-Requested-With": undefined });
    console.log("PAGE", u, r.status, r.text.length, r.text.includes("Goodnight") || r.text.includes("Punpun"));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

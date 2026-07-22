const js = require("fs").readFileSync("scripts/_flextv_bundle.js", "utf8");

function around(needle, before = 200, after = 800) {
  const i = js.indexOf(needle);
  if (i < 0) return `NOT FOUND: ${needle}`;
  return js.slice(Math.max(0, i - before), i + after);
}

console.log("=== httpGet def ===");
// find async function httpGet or const httpGet=
for (const n of ["function httpGet", "httpGet=async", "httpGet=", "const httpGet"]) {
  console.log(n, js.includes(n));
}

// Find $fetch or ofetch baseURL
for (const n of ["baseURL", "api-quick", "is_encrypt", "encryptParams", "AES.encrypt", "hmacSha256", "mr5k66ooDp"]) {
  let idx = 0,
    c = 0;
  while ((idx = js.indexOf(n, idx)) >= 0 && c < 3) {
    console.log(`\n--- ${n} @${idx} ---`);
    console.log(js.slice(Math.max(0, idx - 120), idx + 350).replace(/\n/g, " "));
    idx += n.length;
    c++;
  }
}

// play store / series detail endpoints
for (const n of [
  "/webPlay",
  "/webSeries",
  "/webDrama",
  "/webEpisode",
  "/webDetail",
  "/webVideo",
  "/webGetPlay",
  "/webResource",
  "positions",
  "series_list",
  "getPlayInfo",
  "playUrl",
  "video_url",
  "mp4_url",
  "m3u8_url",
]) {
  if (js.includes(n)) console.log("HAS", n);
}

console.log("\n=== play store usage ===");
console.log(around('usePlay=defineStore("play"', 50, 1500));

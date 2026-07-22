const fs = require("fs");
const js = fs.readFileSync("scripts/_flextv_bundle.js", "utf8");

// Find series detail / play related strings
for (const n of [
  "series_id",
  "series_no",
  "getPlay",
  "playInfo",
  "video_url",
  "mp4",
  "m3u8",
  "webGet",
  "webPlay",
  "webSeries",
  "webDetail",
  "webVideo",
  "webEpisode",
  "getUrlInfo",
  "file-cdn",
  "play_url",
  "clarity",
  "definition",
]) {
  let count = 0;
  let idx = 0;
  while ((idx = js.indexOf(n, idx)) >= 0) {
    count++;
    idx += n.length;
  }
  if (count) console.log(n, count);
}

// Download other nuxt chunks referenced
(async () => {
  const home = await fetch("https://www.flextv.cc/pt/", {
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.text());
  // find all _nuxt js including modulepreload
  const all = [
    ...home.matchAll(/\/_nuxt\/[A-Za-z0-9_-]+\.js/g),
  ].map((m) => m[0]);
  console.log("preload", [...new Set(all)]);

  // Also fetch episode page and collect scripts
  const ep = await fetch(
    "https://www.flextv.cc/pt/episodes/episode-1-dublada-acorda-querido-k5O3rGdZLg",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  ).then((r) => r.text());
  const eps = [...ep.matchAll(/\/_nuxt\/[A-Za-z0-9_-]+\.js/g)].map((m) => m[0]);
  console.log("ep scripts", [...new Set(eps)]);

  for (const src of [...new Set([...all, ...eps])]) {
    if (src.includes("BmA-_8vV")) continue;
    const body = await fetch("https://www.flextv.cc" + src, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => r.text());
    const webs = [...body.matchAll(/"(\/web[A-Za-z0-9_\/]+)"/g)].map((m) => m[1]);
    const playish = [...body.matchAll(/play|m3u8|mp4|video_url|series_list/gi)].length;
    if (webs.length || playish > 5) {
      console.log(src, "len", body.length, "webs", [...new Set(webs)], "playish", playish);
      fs.writeFileSync("scripts/_flextv_" + src.split("/").pop(), body);
    }
  }
})();

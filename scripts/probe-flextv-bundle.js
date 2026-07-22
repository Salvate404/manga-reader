const fs = require("fs");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

(async () => {
  const home = await fetch("https://www.flextv.cc/pt/", {
    headers: { "User-Agent": UA },
  }).then((r) => r.text());
  const scripts = [...home.matchAll(/src="(\/_nuxt\/[^"]+\.js)"/g)].map((m) => m[1]);
  console.log("scripts", scripts);

  for (const src of scripts) {
    const js = await fetch("https://www.flextv.cc" + src, {
      headers: { "User-Agent": UA },
    }).then((r) => r.text());
    fs.writeFileSync("scripts/_flextv_bundle.js", js);
    console.log("saved", src, js.length);

    // Extract interesting string literals
    const apiPaths = [
      ...js.matchAll(/["'`](\/api\/[a-zA-Z0-9_\/\-{}:?=&]+)["'`]/g),
    ].map((m) => m[1]);
    const unique = [...new Set(apiPaths)].sort();
    console.log("api paths", unique.slice(0, 80));

    const quick = [...js.matchAll(/api-quick[^"'`\s]{0,60}/g)].map((m) => m[0]);
    console.log("quick", [...new Set(quick)].slice(0, 20));

    // look for play / episode / browse methods
    for (const key of [
      "getPlay",
      "playInfo",
      "getEpisode",
      "episodeDetail",
      "dramaDetail",
      "searchDrama",
      "keyword",
      "video_url",
      "play_url",
      "m3u8",
      "hls",
      "getVideo",
      "browse",
      "homePage",
      "indexData",
    ]) {
      const i = js.indexOf(key);
      if (i >= 0) {
        console.log("\naround", key, "->", js.slice(i - 60, i + 120).replace(/\n/g, " "));
      }
    }
  }

  // Also parse __NUXT__.config from homepage
  const cfg = home.match(/window\.__NUXT__\.config=(\{.*?\});<\/script>/s);
  if (cfg) {
    console.log("\nconfig snippet", cfg[1].slice(0, 500));
  } else {
    const i = home.indexOf("api-quick");
    console.log("\naround api-quick in html", home.slice(i - 50, i + 400));
  }
})();

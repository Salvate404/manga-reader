const fs = require("fs");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

(async () => {
  const src =
    "https://dramashorts.io/_next/static/chunks/pages/shorts/%5BmovieId%5D-611974f9383cb222.js";
  const js = await fetch(src, { headers: { "User-Agent": UA } }).then((r) =>
    r.text()
  );
  fs.writeFileSync("scripts/_dramashorts_movie.js", js);
  console.log("len", js.length);

  const keys = [
    "playback",
    "m3u8",
    "mp4",
    "stream",
    "videoUrl",
    "video_url",
    "getEpisode",
    "episodes/",
    "/v1/",
    "web-api",
    "fetch(",
    "axios",
    "hls",
    "playlist",
    "cdn.",
    "unlocked",
    "watch",
  ];
  for (const k of keys) {
    let i = 0,
      c = 0;
    while ((i = js.indexOf(k, i)) >= 0 && c < 3) {
      console.log(`\n=== ${k} @${i} ===`);
      console.log(js.slice(Math.max(0, i - 100), i + 200).replace(/\n/g, " "));
      i += k.length;
      c++;
    }
  }

  // also search in shared chunks referenced
  const app = await fetch(
    "https://dramashorts.io/_next/static/chunks/pages/_app-05b79b90720caae4.js",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  fs.writeFileSync("scripts/_dramashorts_app.js", app);

  // Find chunk IDs imported
  const imports = [...js.matchAll(/static\/chunks\/([0-9a-f]+-[0-9a-f]+)\.js/g)].map(
    (m) => m[1]
  );
  console.log("\nimports", [...new Set(imports)]);

  // Grep all webpack chunks from home for playback
  const home = await fetch("https://dramashorts.io/pt", {
    headers: { "User-Agent": UA },
  }).then((r) => r.text());
  const chunks = [
    ...home.matchAll(/\/_next\/static\/chunks\/[0-9]+-[a-f0-9]+\.js/g),
  ].map((m) => m[0]);
  console.log("home chunks", [...new Set(chunks)]);

  for (const c of [...new Set(chunks)]) {
    const body = await fetch("https://dramashorts.io" + c, {
      headers: { "User-Agent": UA },
    }).then((r) => r.text());
    if (/playback|m3u8|videoUrl|\/v1\/episodes|streamUrl/i.test(body)) {
      console.log("HIT", c, body.length);
      fs.writeFileSync("scripts/_dramashorts_" + c.split("/").pop(), body);
      for (const k of ["playback", "m3u8", "/v1/", "videoUrl", "episodes"]) {
        const i = body.indexOf(k);
        if (i >= 0)
          console.log(" ", k, body.slice(i - 80, i + 160).replace(/\n/g, " "));
      }
    }
  }
})();

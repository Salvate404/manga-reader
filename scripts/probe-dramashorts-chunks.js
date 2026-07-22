const fs = require("fs");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function getText(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  return r.text();
}

(async () => {
  const man = await getText(
    "https://dramashorts.io/_next/static/9mZwqBCnTgpeDf8YuxLCW/_buildManifest.js"
  );
  console.log("manifest\n", man);

  // Download all unique chunk URLs from movie page
  const html = await getText(
    "https://dramashorts.io/pt/shorts/7700ea50-9edf-420a-9e2e-98337bba01fb"
  );
  const chunks = [
    ...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g),
  ].map((m) => m[0]);
  console.log("chunks", [...new Set(chunks)]);

  for (const c of [...new Set(chunks)]) {
    const body = await getText("https://dramashorts.io" + c);
    const interesting = /playback|m3u8|videoUrl|streamUrl|web-api|\/v1\/|hls\.js|playlist/i.test(
      body
    );
    if (!interesting) continue;
    console.log("\nHIT", c, body.length);
    fs.writeFileSync(
      "scripts/_ds_" + c.replace(/[\/\\%\[\]]+/g, "_"),
      body
    );
    for (const k of [
      "playback",
      "m3u8",
      "videoUrl",
      "streamUrl",
      "/v1/",
      "web-api",
      "episodes/",
      "hls",
    ]) {
      let i = 0,
        n = 0;
      while ((i = body.indexOf(k, i)) >= 0 && n < 2) {
        console.log(
          " ",
          k,
          body.slice(Math.max(0, i - 100), i + 200).replace(/\n/g, " ")
        );
        i += k.length;
        n++;
      }
    }
  }

  // Try Cloudflare-bypass via next rewrite? Or public CDN video paths
  // Episode cover path: cdn.dramashorts.io/img/episodes-previews/...
  // Maybe video at cdn.dramashorts.io/video/...?
  const epCover =
    "https://cdn.dramashorts.io/img/episodes-previews/At2NzHJ8GNRn4Jn74nQYOazw/HnbZxypgg5NmeYyi7U4drrgr/cover.jpeg";
  const base = epCover.replace("/cover.jpeg", "");
  console.log("\ntry video paths from cover base", base);
  for (const p of [
    "/video.m3u8",
    "/playlist.m3u8",
    "/index.m3u8",
    "/master.m3u8",
    "/hls/index.m3u8",
    "/stream.m3u8",
  ]) {
    const u = base.replace("/img/episodes-previews/", "/video/") + p;
    // also try
    const candidates = [
      base.replace("img/episodes-previews", "video") + p,
      base.replace("img/episodes-previews", "videos") + p,
      base.replace("img/episodes-previews", "hls") + p,
    ];
    for (const cand of candidates) {
      const r = await fetch(cand, {
        method: "HEAD",
        headers: { "User-Agent": UA, Referer: "https://dramashorts.io/" },
      });
      if (r.status !== 404)
        console.log(" ", r.status, cand);
    }
  }
})();

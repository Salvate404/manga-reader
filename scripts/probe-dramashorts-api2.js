const fs = require("fs");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

(async () => {
  const body = fs.readFileSync(
    "scripts/_dramashorts_6854-3fc90857714a1864.js",
    "utf8"
  );
  console.log("6854 len", body.length);
  for (const k of [
    "playback",
    "m3u8",
    "videoUrl",
    "streamUrl",
    "/v1/",
    "web-api",
    "episodes",
    "hls",
    "playlist",
    "cdn.dramashorts",
    "getStream",
    "playInfo",
    "mediaUrl",
  ]) {
    let i = 0,
      c = 0;
    while ((i = body.indexOf(k, i)) >= 0 && c < 4) {
      console.log(`\n${k}@${i}`, body.slice(Math.max(0, i - 80), i + 180).replace(/\n/g, " "));
      i += k.length;
      c++;
    }
  }

  // List build manifest for all page chunks
  const man = await fetch(
    "https://dramashorts.io/_next/static/9mZwqBCnTgpeDf8YuxLCW/_buildManifest.js",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  console.log("\nmanifest", man.slice(0, 1500));

  // Download framework + main and search
  for (const src of [
    "/_next/static/chunks/framework-f94ecef82a588b2f.js",
    "/_next/static/chunks/main-8bcd9b69ea0985a3.js",
    "/_next/static/chunks/webpack-4ea841f32d0a4d2b.js",
  ]) {
    const js = await fetch("https://dramashorts.io" + src, {
      headers: { "User-Agent": UA },
    }).then((r) => r.text());
    if (/web-api|m3u8|playback|\/v1\//i.test(js)) {
      console.log("HIT", src);
    }
  }

  // Scan movie page HTML for any video-related config / env
  const html = await fetch(
    "https://dramashorts.io/pt/shorts/7700ea50-9edf-420a-9e2e-98337bba01fb",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  const env = html.match(/__NEXT_DATA__[\s\S]{0,50}/);
  // look for runtime config
  for (const k of ["NEXT_PUBLIC", "web-api", "API_URL", "cdn.dramashorts", "stream"]) {
    console.log("html", k, html.includes(k), html.indexOf(k));
  }

  // Try common API with browser-like headers + cookies from set-cookie
  const home = await fetch("https://dramashorts.io/pt", {
    headers: { "User-Agent": UA },
  });
  const cookies = (home.headers.getSetCookie?.() || []).join("; ");
  console.log("cookies", cookies.slice(0, 200));

  const epId = "b6aaf123-2c1f-43eb-8df5-72b995a33a5a";
  const movieId = "7700ea50-9edf-420a-9e2e-98337bba01fb";
  for (const u of [
    `https://web-api.dramashorts.io/v1/episodes/${epId}/playback`,
    `https://web-api.dramashorts.io/v1/episodes/${epId}/stream`,
    `https://web-api.dramashorts.io/v1/episodes/${epId}`,
    `https://web-api.dramashorts.io/v1/movies/${movieId}/episodes/${epId}/playback`,
    `https://web-api.dramashorts.io/v1/playback/episodes/${epId}`,
    `https://web-api.dramashorts.io/v1/watch/${epId}`,
  ]) {
    const r = await fetch(u, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Origin: "https://dramashorts.io",
        Referer: "https://dramashorts.io/pt",
        Cookie: cookies,
      },
    });
    const t = await r.text();
    console.log(r.status, u.replace("https://web-api.dramashorts.io", ""), t.slice(0, 120).replace(/\s+/g, " "));
  }
})();

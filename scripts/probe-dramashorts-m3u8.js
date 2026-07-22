const cheerio = require("cheerio");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

(async () => {
  const movieId = "7700ea50-9edf-420a-9e2e-98337bba01fb";
  const html = await fetch(`https://dramashorts.io/pt/player/${movieId}`, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
  }).then((r) => r.text());

  // find m3u8
  const decoded = html.replace(/\\u002F/g, "/");
  const urls = [...decoded.matchAll(/https?:\/\/[^"'\\\s]+\.m3u8[^"'\\\s]*/g)].map(
    (m) => m[0]
  );
  console.log("m3u8 urls", [...new Set(urls)].slice(0, 10));

  const i = html.toLowerCase().indexOf("m3u8");
  console.log("around", html.slice(Math.max(0, i - 150), i + 250));

  // Also check shorts page for m3u8 (maybe only player has it)
  const shorts = await fetch(`https://dramashorts.io/pt/shorts/${movieId}`, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
  }).then((r) => r.text());
  console.log("shorts has m3u8?", /m3u8/i.test(shorts));

  // Parse next data for video fields
  const $ = cheerio.load(html);
  const nd = JSON.parse($("#__NEXT_DATA__").html());
  const dump = JSON.stringify(nd.props.pageProps);
  console.log("next has m3u8?", dump.includes("m3u8"));
  // find keys with url/video/stream
  function findKeys(obj, path = "") {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      const p = path + "." + k;
      if (/url|stream|video|play|hls|m3u8|src/i.test(k)) {
        console.log("key", p, typeof v, JSON.stringify(v)?.slice(0, 200));
      }
      if (v && typeof v === "object") findKeys(v, p);
    }
  }
  findKeys(nd.props.pageProps);

  // Try POST API without auth for episode playback endpoints
  const epId = "b6aaf123-2c1f-43eb-8df5-72b995a33a5a";
  for (const path of [
    "episodes/playback",
    "episode/playback",
    "playback",
    "episodes/get",
    "episodes/stream",
    "movies/episodes/playback",
    "watch/episode",
    "content/playback",
    "player/playback",
  ]) {
    const r = await fetch(`https://web-api.dramashorts.io/v1/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        Origin: "https://dramashorts.io",
        Referer: "https://dramashorts.io/pt",
        Authorization: "",
        "X-Interface-Language": "pt",
        "X-OS": "web",
        "X-OS-Version": "1.0.0",
        "X-App-Version": "1.0.0",
      },
      body: JSON.stringify({
        data: {
          episode_id: epId,
          movie_id: movieId,
          episodeId: epId,
          movieId: movieId,
        },
      }),
    });
    const t = await r.text();
    console.log("POST", path, r.status, t.slice(0, 180).replace(/\s+/g, " "));
  }

  // Search API methods in app for path strings
  const app = await fetch(
    "https://dramashorts.io/_next/static/chunks/pages/_app-05b79b90720caae4.js",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  const posts = [...app.matchAll(/\.post\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
  console.log("post paths", [...new Set(posts)]);
  const pathLits = [
    ...app.matchAll(/["']([a-z]+\/[a-z0-9_\/-]+)["']/g),
  ]
    .map((m) => m[1])
    .filter((p) => /episode|play|stream|movie|watch|content|video/i.test(p));
  console.log("path lits", [...new Set(pathLits)].slice(0, 50));
})();

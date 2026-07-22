const cheerio = require("cheerio");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url, headers = {}) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json,*/*",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Referer: "https://dramashorts.io/pt",
      ...headers,
    },
    redirect: "follow",
  });
  const text = await r.text();
  console.log("GET", r.status, url.slice(0, 100), "len", text.length);
  return { status: r.status, text, url: r.url, $: cheerio.load(text) };
}

(async () => {
  const home = await get("https://dramashorts.io/pt");
  const ids = [];
  home.$("a[href*='/pt/shorts/']").each((_, el) => {
    const href = home.$(el).attr("href") || "";
    const m = href.match(/\/pt\/shorts\/([a-f0-9-]+)/i);
    if (m) ids.push({ href, id: m[1], title: home.$(el).text().replace(/\s+/g, " ").trim().slice(0, 60) });
  });
  console.log("home cards", ids.slice(0, 8));

  // search?
  for (const u of [
    "https://dramashorts.io/pt/search?q=ceo",
    "https://dramashorts.io/pt/search?query=ceo",
    "https://dramashorts.io/pt/?q=ceo",
    "https://dramashorts.io/pt/shorts?search=ceo",
    "https://dramashorts.io/api/search?q=ceo&locale=pt",
  ]) {
    const r = await get(u);
    const has = r.text.includes("/pt/shorts/");
    console.log("  search?", has, r.$("title").text().slice(0, 60));
  }

  const movieId = ids[0]?.id || "7700ea50-9edf-420a-9e2e-98337bba01fb";
  const page = await get(`https://dramashorts.io/pt/shorts/${movieId}`);
  const nd = JSON.parse(page.$("#__NEXT_DATA__").html());
  const props = nd.props.pageProps;
  console.log("props keys", Object.keys(props));
  const eps = props.episodes || [];
  console.log("ep0", JSON.stringify(eps[0], null, 2));
  const epId = eps[0]?.episode?.id;
  console.log("epId", epId);

  // episode routes
  for (const u of [
    `https://dramashorts.io/pt/shorts/${movieId}/episode/${epId}`,
    `https://dramashorts.io/pt/shorts/${movieId}/episodes/${epId}`,
    `https://dramashorts.io/pt/shorts/${movieId}?episode=${epId}`,
    `https://dramashorts.io/pt/watch/${epId}`,
    `https://dramashorts.io/pt/episode/${epId}`,
    `https://dramashorts.io/pt/player/${epId}`,
  ]) {
    const r = await get(u);
    const hasM3u8 = /m3u8|mp4|hls|videoUrl|streamUrl|playUrl/i.test(r.text);
    const hasNext = r.text.includes("__NEXT_DATA__");
    console.log("  ep route m3u8?", hasM3u8, "next?", hasNext, r.$("title").text().slice(0, 50));
    if (hasNext && hasM3u8) {
      const j = JSON.parse(r.$("#__NEXT_DATA__").html());
      console.log("  pageProps", JSON.stringify(j.props?.pageProps).slice(0, 500));
    }
  }

  // Next data route
  const buildId = nd.buildId;
  console.log("buildId", buildId);
  for (const u of [
    `https://dramashorts.io/_next/data/${buildId}/pt/shorts/${movieId}.json`,
    `https://dramashorts.io/_next/data/${buildId}/pt.json`,
  ]) {
    const r = await get(u, { Accept: "application/json" });
    console.log("  next data", r.text.slice(0, 200));
  }

  // Scan chunk for playback endpoints
  const app = await fetch(
    "https://dramashorts.io/_next/static/chunks/pages/_app-05b79b90720caae4.js",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  const hits = [];
  for (const key of [
    "playback",
    "m3u8",
    "getEpisode",
    "stream",
    "videoUrl",
    "web-api",
    "/v1/",
    "episodes/",
  ]) {
    if (app.includes(key)) hits.push(key);
  }
  console.log("app hits", hits);

  // Find shorts page chunk
  const scripts = [
    ...page.text.matchAll(/\/_next\/static\/chunks\/pages\/[^"]+\.js/g),
  ].map((m) => m[0]);
  console.log("page scripts", scripts);
  for (const src of scripts.slice(0, 5)) {
    const js = await fetch("https://dramashorts.io" + src, {
      headers: { "User-Agent": UA },
    }).then((r) => r.text());
    const apis = [...js.matchAll(/["'`](\/v1\/[^"'`]+)["'`]/g)].map((m) => m[1]);
    const urls = [...js.matchAll(/web-api\.dramashorts[^"'`\s]*/g)].map((m) => m[0]);
    if (apis.length || urls.length || /m3u8|playback|stream/i.test(js)) {
      console.log(src, "apis", [...new Set(apis)].slice(0, 20), "urls", [...new Set(urls)]);
      // dump around playback
      for (const k of ["playback", "m3u8", "/episodes/", "videoUrl", "getStream"]) {
        const i = js.indexOf(k);
        if (i >= 0) console.log(" ", k, js.slice(i - 60, i + 120).replace(/\n/g, " "));
      }
    }
  }
})();

const cheerio = require("cheerio");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json,*/*",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Referer: "https://www.flextv.cc/pt/",
    },
  });
  return { status: r.status, text: await r.text(), url: r.url };
}

(async () => {
  const epUrl =
    "https://www.flextv.cc/pt/episodes/episode-1-dublada-acorda-querido-k5O3rGdZLg";
  const ep = await get(epUrl);
  const $ = cheerio.load(ep.text);

  // dump interesting substrings
  for (const pat of [
    /__NEXT_DATA__/,
    /__NUXT__/,
    /application\/ld\+json/,
    /playUrl|videoUrl|m3u8|hlsUrl|mediaUrl|streamUrl/i,
    /cdn\.|cloudfront|akamai|video\./i,
    /episodeId|dramaId|bookId/i,
  ]) {
    console.log("pattern", pat, "->", pat.test(ep.text));
  }

  // find all script type=application/json or ld+json
  $('script[type="application/ld+json"]').each((i, el) => {
    console.log("ldjson", ($(el).html() || "").slice(0, 500));
  });

  // look for window.__ or similar assignments
  const assigns = [
    ...ep.text.matchAll(/window\.[A-Za-z0-9_$]+\s*=\s*\{[\s\S]{0,200}/g),
  ].slice(0, 10);
  console.log(
    "window assigns",
    assigns.map((m) => m[0].slice(0, 120))
  );

  // meta tags
  console.log(
    "og:video",
    $('meta[property="og:video"]').attr("content"),
    "og:image",
    $('meta[property="og:image"]').attr("content")?.slice(0, 100)
  );

  // iframe
  $("iframe").each((_, el) =>
    console.log("iframe", $(el).attr("src"), $(el).attr("data-src"))
  );

  // Any data-* on body/main
  console.log("body data", $("body").attr());
  console.log(
    "div with data",
    $("[data-video],[data-play],[data-src*='http']")
      .slice(0, 5)
      .map((_, el) => el.attribs)
      .get()
  );

  // extract hrefs containing episode from homepage with titles near img
  const home = await get("https://www.flextv.cc/pt/");
  const $$ = cheerio.load(home.text);
  const cards = [];
  $$("a[href*='/pt/episodes/']").each((i, el) => {
    if (i > 30) return;
    const href = $$(el).attr("href");
    const img = $$(el).find("img").attr("src") || $$(el).find("img").attr("data-src");
    const alt = $$(el).find("img").attr("alt");
    const text = $$(el).text().replace(/\s+/g, " ").trim().slice(0, 80);
    cards.push({ href, img: img?.slice(0, 80), alt, text });
  });
  console.log("home episode cards", cards.slice(0, 8));

  // Try flextv API from network patterns - common for these sites
  for (const api of [
    "https://www.flextv.cc/api/v1/search?keyword=ceo&language=pt",
    "https://www.flextv.cc/api/search/drama?keyword=ceo",
    "https://api.flextv.cc/search?q=ceo",
    "https://www.flextv.cc/pt/search/ceo",
    "https://www.flextv.cc/pt/s/ceo",
  ]) {
    try {
      const r = await get(api);
      console.log("api", r.status, api, r.text.slice(0, 120).replace(/\s+/g, " "));
    } catch (e) {
      console.log("api fail", api, e.message);
    }
  }

  // Check if video loads from a known path in HTML comments or noscript
  const noscript = $("noscript").text().slice(0, 300);
  console.log("noscript", noscript);

  // Save a chunk around 'video' occurrences
  const idx = ep.text.toLowerCase().indexOf("video");
  console.log("around video", ep.text.slice(Math.max(0, idx - 50), idx + 200));
})();

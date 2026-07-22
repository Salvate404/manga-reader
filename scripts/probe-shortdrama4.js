const cheerio = require("cheerio");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html", Referer: "https://shortdrama.st/" },
  });
  return { status: res.status, text: await res.text() };
}

(async () => {
  // find search form on browse
  const browse = await get("https://shortdrama.st/browse");
  const $ = cheerio.load(browse.text);
  console.log(
    "forms",
    $("form")
      .map((_, el) => ({
        action: $(el).attr("action"),
        method: $(el).attr("method"),
        inputs: $(el)
          .find("input,select")
          .map((i, e) => ({
            name: $(e).attr("name"),
            type: $(e).attr("type"),
            id: $(e).attr("id"),
          }))
          .get(),
      }))
      .get()
  );

  // search inputs anywhere
  console.log(
    "search inputs",
    $("input")
      .map((_, el) => ({
        name: $(el).attr("name"),
        type: $(el).attr("type"),
        placeholder: $(el).attr("placeholder"),
        id: $(el).attr("id"),
      }))
      .get()
      .filter((x) => /search|q|query|keyword/i.test(JSON.stringify(x)))
  );

  // card structure on browse
  const cards = [];
  $("a[href*='/series/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/\/series\/([^/]+)\/(\d+)/);
    if (!m) return;
    const img =
      $(el).find("img").attr("src") ||
      $(el).find("img").attr("data-src") ||
      $(el).closest("article,div").find("img").first().attr("src");
    const title =
      $(el).attr("title") ||
      $(el).find("h2,h3,.title,p").first().text().trim() ||
      $(el).text().trim();
    cards.push({ slug: m[1], ep: m[2], img, title: title.slice(0, 80) });
  });
  console.log("browse cards", cards.length, cards.slice(0, 5));

  // try search endpoints
  for (const u of [
    "https://shortdrama.st/browse?sort=views",
    "https://shortdrama.st/?s=ceo",
    "https://shortdrama.st/browse?s=ceo",
    "https://shortdrama.st/browse?title=ceo",
    "https://shortdrama.st/search/ceo",
    "https://shortdrama.st/browse/ceo",
  ]) {
    const r = await get(u);
    const $$ = cheerio.load(r.text);
    const n = $$("a[href*='/series/']").length;
    const hasCeo = r.text.toLowerCase().includes("ceo");
    console.log("TRY", u, r.status, "links", n, "hasCeo", hasCeo);
  }

  // media-proxy playlist
  const pl = await get(
    "https://shortdrama.st/media-proxy/media/ShortMax/EN/fated-to-return-to-you/ep_1_hls/playlist.m3u8"
  );
  console.log("\nplaylist", pl.status, pl.text.slice(0, 400));

  // episode list from data-total-episodes - check episode 63 page
  const ep63 = await get("https://shortdrama.st/series/fated-to-return-to-you/63");
  const $e = cheerio.load(ep63.text);
  console.log(
    "ep63",
    ep63.status,
    $e("#player").attr("data-src"),
    $e("#player").attr("data-total-episodes"),
    $e("h1").text().trim()
  );

  // pagination on browse
  const page2 = await get("https://shortdrama.st/browse?page=2");
  const $p = cheerio.load(page2.text);
  const p2cards = $p("a[href*='/series/']").length;
  console.log("browse page2", page2.status, p2cards);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

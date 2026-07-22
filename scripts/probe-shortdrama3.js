const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const cheerio = require("cheerio");

async function get(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json,*/*",
      Referer: "https://shortdrama.st/",
    },
  });
  return { status: res.status, text: await res.text(), ct: res.headers.get("content-type") };
}

(async () => {
  const seriesUrl = "https://shortdrama.st/series/fated-to-return-to-you/1";
  const page = await get(seriesUrl);
  console.log("series", page.status, page.text.length);

  const $ = cheerio.load(page.text);
  console.log("title", $("h1").first().text().trim());
  console.log("og:image", $('meta[property="og:image"]').attr("content"));
  console.log("og:title", $('meta[property="og:title"]').attr("content"));
  console.log("description", $('meta[name="description"]').attr("content")?.slice(0, 200));

  // video / iframe / source
  console.log(
    "video",
    $("video").length,
    $("video source").attr("src"),
    $("video").attr("src")
  );
  console.log(
    "iframes",
    $("iframe")
      .map((_, el) => $(el).attr("src"))
      .get()
  );

  // episode links
  const eps = $('a[href*="/series/"]')
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter((h) => /\/series\/[^/]+\/\d+/.test(h));
  console.log("ep links sample", [...new Set(eps)].slice(0, 20));

  // look for m3u8 / mp4 in html
  const m3u8 = page.text.match(/https?:[^"'\\\s]+\.m3u8[^"'\\\s]*/gi) || [];
  const mp4 = page.text.match(/https?:[^"'\\\s]+\.mp4[^"'\\\s]*/gi) || [];
  console.log("m3u8", m3u8.slice(0, 5));
  console.log("mp4", mp4.slice(0, 5));

  // json in script tags
  $("script").each((_, el) => {
    const t = $(el).html() || "";
    if (t.includes("m3u8") || t.includes("episode") || t.includes("stream")) {
      console.log("SCRIPT CHUNK", t.slice(0, 400).replace(/\s+/g, " "));
    }
  });

  // data attributes
  const dataAttrs = [];
  $("[data-src],[data-url],[data-video],[data-stream],[data-episode]").each(
    (_, el) => {
      dataAttrs.push({
        tag: el.tagName,
        attrs: el.attribs,
      });
    }
  );
  console.log("data attrs", dataAttrs.slice(0, 10));

  // browse search
  for (const u of [
    "https://shortdrama.st/browse?q=ceo",
    "https://shortdrama.st/browse?search=ceo",
    "https://shortdrama.st/browse?query=ceo",
    "https://shortdrama.st/browse?keyword=ceo",
    "https://shortdrama.st/home",
  ]) {
    const r = await get(u);
    const $$ = cheerio.load(r.text);
    const cards = $$('a[href*="/series/"]')
      .map((_, el) => ({
        href: $$(el).attr("href"),
        text: $$(el).text().trim().slice(0, 60),
      }))
      .get()
      .filter((x) => x.href && /\/series\/[^/]+\/\d+/.test(x.href));
    console.log("\nBROWSE", u, r.status, "cards", cards.length, cards.slice(0, 3));
  }

  // series root without episode
  const root = await get("https://shortdrama.st/series/fated-to-return-to-you");
  console.log("\nseries root", root.status, root.text.length);
  const $r = cheerio.load(root.text);
  console.log("root h1", $r("h1").first().text().trim());
  const rootEps = $r('a[href*="/series/fated-to-return-to-you/"]')
    .map((_, el) => $r(el).attr("href"))
    .get();
  console.log("root eps", [...new Set(rootEps)].slice(0, 15));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

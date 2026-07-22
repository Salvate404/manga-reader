const cheerio = require("cheerio");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchHtml(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://shortdrama.st/",
    },
  });
  console.log("fetch", url, r.status);
  return r.text();
}

function parseBrowse(html) {
  const $ = cheerio.load(html);
  const cards = [];
  $(".drama-card").each((_, el) => {
    const a = $(el).find("a[href*='/series/']").first();
    const href = a.attr("href") || "";
    const title =
      $(el).find(".drama-title, .title, h3, h2").first().text().trim() ||
      a.attr("title") ||
      a.attr("aria-label") ||
      "";
    const img =
      $(el).find("img").attr("src") ||
      $(el).find("img").attr("data-src") ||
      null;
    cards.push({ href, title, img });
  });
  const ld = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      ld.push(JSON.parse($(el).html() || ""));
    } catch {}
  });
  return { cards: cards.slice(0, 5), ldTypes: ld.map((j) => j["@type"]), ld0: ld[0] };
}

function parseEpisode(html) {
  const $ = cheerio.load(html);
  const player = $("#player");
  return {
    dataSrc: player.attr("data-src"),
    total: player.attr("data-total-episodes"),
    platform: player.attr("data-platform"),
    poster: player.attr("data-poster"),
    ogImage: $('meta[property="og:image"]').attr("content"),
    title: $("title").text().trim(),
  };
}

(async () => {
  const browse = await fetchHtml("https://shortdrama.st/browse?q=ceo");
  console.log(JSON.stringify(parseBrowse(browse), null, 2));

  const ep = await fetchHtml("https://shortdrama.st/series/the-ceo/1");
  console.log(JSON.stringify(parseEpisode(ep), null, 2));

  const trend = await fetchHtml("https://shortdrama.st/browse?sort=views");
  const t = parseBrowse(trend);
  console.log("trending count sample", t.cards.length, t.cards[0]);
})();

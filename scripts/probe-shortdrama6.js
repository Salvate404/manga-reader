const cheerio = require("cheerio");

(async () => {
  const r = await fetch("https://shortdrama.st/browse?q=ceo", {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
  });
  const html = await r.text();
  const $ = cheerio.load(html);

  // JSON-LD ItemList
  const lists = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).html() || "");
      const graph = j["@graph"] || [j];
      for (const node of graph) {
        const main = node.mainEntity || node;
        if (main["@type"] === "ItemList" && main.itemListElement) {
          lists.push(
            main.itemListElement.slice(0, 5).map((x) => ({
              name: x.name,
              url: x.url,
            }))
          );
        }
      }
    } catch {}
  });
  console.log("ld lists", JSON.stringify(lists, null, 2));

  // drama-card
  const cards = [];
  $(".drama-card").each((_, el) => {
    const a = $(el).find("a").first();
    const href = a.attr("href") || $(el).closest("a").attr("href") || "";
    const img =
      $(el).find("img").attr("src") ||
      $(el).find("img").attr("data-src") ||
      "";
    const title =
      $(el).find(".card-title, h3, h2, p").first().text().trim() ||
      a.attr("title") ||
      "";
    cards.push({ href, img: img.slice(0, 100), title: title.slice(0, 60) });
  });
  console.log("drama-cards", cards.length, cards.slice(0, 4));

  // outer HTML of first drama-card
  const first = $(".drama-card").first().parent().html() || $(".drama-card").first().toString();
  console.log("\nfirst card wrap", String(first).slice(0, 800).replace(/\s+/g, " "));

  // series page without ep
  const s = await fetch("https://shortdrama.st/series/the-ceo", {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
  });
  const sh = await s.text();
  const $s = cheerio.load(sh);
  console.log("\nseries/the-ceo", s.status, $s("h1").text().trim().slice(0, 80));
  console.log("player", $s("#player").attr("data-src"), $s("#player").attr("data-total-episodes"));
  console.log("location?", s.url || "n/a");

  // redirect?
  console.log("canonical", $s('link[rel="canonical"]').attr("href"));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

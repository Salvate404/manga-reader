const cheerio = require("cheerio");

(async () => {
  const r = await fetch("https://shortdrama.st/browse?q=ceo", {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
  });
  const html = await r.text();
  const $ = cheerio.load(html);
  console.log("len", html.length);
  const all = [...html.matchAll(/\/series\/[a-z0-9-]+\/\d+/gi)].map((m) => m[0]);
  console.log("regex series count", new Set(all).size, [...new Set(all)].slice(0, 12));

  const idx = html.indexOf("/series/");
  console.log("around series", html.slice(Math.max(0, idx - 250), idx + 350).replace(/\s+/g, " "));

  // titles near cards
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.includes("/series/")) return;
  });

  // look for data-series or card class
  const classes = new Set();
  $("[class]").each((_, el) => {
    const c = $(el).attr("class") || "";
    if (/card|series|drama|poster|item/i.test(c)) classes.add(c.slice(0, 80));
  });
  console.log("classes", [...classes].slice(0, 30));

  // value of search input
  console.log("q value", $('input[name="q"]').attr("value"));

  // browse without q for card HTML
  const r2 = await fetch("https://shortdrama.st/browse?sort=views", {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
  });
  const html2 = await r2.text();
  const i2 = html2.indexOf("/series/");
  console.log("\nviews card", html2.slice(Math.max(0, i2 - 400), i2 + 500).replace(/\s+/g, " "));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

const cheerio = require("cheerio");

(async () => {
  const r = await fetch("https://shortdrama.st/series/the-ceo/1", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
  });
  const html = await r.text();
  const $ = cheerio.load(html);
  console.log("h1", $("h1").first().text().trim());
  console.log("desc meta", $('meta[name="description"]').attr("content")?.slice(0, 200));
  console.log("og desc", $('meta[property="og:description"]').attr("content")?.slice(0, 200));
  const classes = new Set();
  $("[class*='desc'], [class*='synop'], [class*='about']").each((_, el) => {
    classes.add($(el).attr("class"));
  });
  console.log("desc classes", [...classes].slice(0, 10));
  console.log(
    "p sample",
    $("main p, .series-info p, article p")
      .first()
      .text()
      .trim()
      .slice(0, 200)
  );
})();

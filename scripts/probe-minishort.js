const cheerio = require("cheerio");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchHtml(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Referer: "https://minishort.com/",
    },
    redirect: "follow",
  });
  console.log("GET", url, "->", r.status, r.url);
  return { status: r.status, url: r.url, html: await r.text() };
}

(async () => {
  const home = await fetchHtml("https://minishort.com/pt");
  const $ = cheerio.load(home.html);
  console.log("title", $("title").text().slice(0, 120));
  console.log(
    "lang links",
    $('a[href*="/pt"], a[href*="lang"]')
      .slice(0, 5)
      .map((_, el) => $(el).attr("href"))
      .get()
  );

  // find drama links
  const links = new Set();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (/drama|series|play|watch|episode|filme|mini/i.test(href)) {
      links.add(href);
    }
  });
  console.log("sample links", [...links].slice(0, 30));

  // search forms / api hints
  const scripts = [];
  $("script[src]").each((_, el) => scripts.push($(el).attr("src")));
  console.log(
    "scripts",
    scripts.filter((s) => /api|search|app/i.test(s || "")).slice(0, 15)
  );

  // try search
  for (const q of [
    "https://minishort.com/pt/search?q=ceo",
    "https://minishort.com/pt/search?keyword=ceo",
    "https://minishort.com/search?q=ceo&lang=pt",
    "https://minishort.com/pt/?s=ceo",
  ]) {
    try {
      const r = await fetchHtml(q);
      const $$ = cheerio.load(r.html);
      console.log(
        "search title",
        $$.("title").text().slice(0, 80),
        "cards",
        $$.(".card, .drama, article, .item").length
      );
    } catch (e) {
      console.log("search fail", q, e.message);
    }
  }
})();

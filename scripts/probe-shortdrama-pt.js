const cheerio = require("cheerio");

(async () => {
  // ShortDrama PT media paths?
  for (const u of [
    "https://shortdrama.st/browse?q=pt",
    "https://shortdrama.st/browse?q=portugu",
    "https://shortdrama.st/browse?q=dublado",
    "https://shortdrama.st/browse?lang=Portuguese",
  ]) {
    const r = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
    });
    const html = await r.text();
    const $ = cheerio.load(html);
    const titles = [];
    $(".drama-card").each((i, el) => {
      if (i > 5) return;
      titles.push(
        $(el).find(".drama-title, .title, h3, h2").first().text().trim() ||
          $(el).find("a").attr("title")
      );
    });
    // any /PT/ in covers?
    const ptMedia = (html.match(/\/PT\//g) || []).length;
    const brMedia = (html.match(/\/BR\//g) || []).length;
    const ptBr = (html.match(/\/PT-BR\//g) || []).length;
    console.log(u, "ptMedia", ptMedia, "br", brMedia, "ptbr", ptBr, titles);
  }

  // Look for lang filter options in browse HTML
  const browse = await (
    await fetch("https://shortdrama.st/browse", {
      headers: { "User-Agent": "Mozilla/5.0" },
    })
  ).text();
  const langs = [...browse.matchAll(/lang(?:uage)?[=\/"]([A-Za-z\-]+)/gi)]
    .map((m) => m[1])
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, 40);
  console.log("lang mentions", langs);

  // Check media path languages from a PT-sounding series search
  const r2 = await fetch("https://shortdrama.st/browse?q=juramento", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const h2 = await r2.text();
  const $2 = cheerio.load(h2);
  $2(".drama-card").each((i, el) => {
    if (i > 8) return;
    console.log("juramento", {
      title: $2(el).find(".drama-title,.title,h3").first().text().trim(),
      img: $2(el).find("img").attr("src"),
      href: $2(el).find("a").attr("href"),
    });
  });
})();

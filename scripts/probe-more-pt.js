const cheerio = require("cheerio");

(async () => {
  // Probe if shortdrama has non-EN language folders
  const html = await fetch("https://shortdrama.st/browse?sort=views", {
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.text());
  const langs = {};
  for (const m of html.matchAll(/\/media-proxy\/media\/[^/]+\/([A-Z]{2}(?:-[A-Z]{2})?)\//g)) {
    langs[m[1]] = (langs[m[1]] || 0) + 1;
  }
  console.log("shortdrama langs on trending", langs);

  // Try browse with language path variants
  for (const q of ["ES", "PT", "BR", "SPA", "POR"]) {
    const r = await fetch(`https://shortdrama.st/browse?q=${q}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((x) => x.text());
    const L = {};
    for (const m of r.matchAll(/\/media\/[^/]+\/([A-Z]{2})\//g)) {
      L[m[1]] = (L[m[1]] || 0) + 1;
    }
    console.log("q", q, L);
  }

  // DramaShorts - look deeper
  const ds = await fetch("https://dramashorts.io/pt", {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "pt-BR" },
  }).then((r) => r.text());
  console.log("ds len", ds.length, "m3u8", ds.includes("m3u8"), "video", /<video/i.test(ds));
  const $ = cheerio.load(ds);
  console.log("ds title", $("title").text());
  console.log(
    "ds anchors",
    $("a[href]")
      .slice(0, 20)
      .map((_, el) => $(el).attr("href"))
      .get()
  );
  // script src
  console.log(
    "ds scripts",
    $("script[src]")
      .map((_, el) => $(el).attr("src"))
      .get()
      .slice(0, 15)
  );

  // MinuteDrama PT
  const md = await fetch("https://minutedrama.com/", {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "pt-BR" },
  }).then((r) => r.text());
  console.log("minutedrama langs?", /Portugu[eê]s/i.test(md), md.includes("pt"));
})();

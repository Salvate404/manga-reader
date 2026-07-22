const cheerio = require("cheerio");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
    redirect: "follow",
  });
  const text = await r.text();
  console.log("GET", r.status, url, "final", r.url, "len", text.length);
  return { r, text, $: cheerio.load(text) };
}

(async () => {
  console.log("\n=== FLEXTV ===");
  const fx = await get("https://www.flextv.cc/pt/");
  const fxLinks = new Set();
  fx.$("a[href]").each((_, el) => {
    const h = fx.$(el).attr("href") || "";
    if (h.includes("/pt/") || h.includes("drama") || h.includes("play"))
      fxLinks.add(h);
  });
  console.log("links sample", [...fxLinks].slice(0, 25));
  console.log("title", fx.$("title").text().slice(0, 100));

  // try search
  for (const u of [
    "https://www.flextv.cc/pt/search?keyword=ceo",
    "https://www.flextv.cc/pt/search?q=ceo",
    "https://www.flextv.cc/api/search?keyword=ceo",
    "https://www.flextv.cc/pt/genres/all-plots",
  ]) {
    try {
      const x = await get(u);
      console.log("  title", x.$("title").text().slice(0, 80));
      const cards = [];
      x.$("a[href*='/pt/']").each((i, el) => {
        if (i > 8) return;
        const href = x.$(el).attr("href");
        const t = x.$(el).text().replace(/\s+/g, " ").trim().slice(0, 60);
        if (t.length > 3) cards.push({ href, t });
      });
      console.log("  sample", cards.slice(0, 5));
    } catch (e) {
      console.log("  fail", u, e.message);
    }
  }

  console.log("\n=== DRAMASHORTS ===");
  const ds = await get("https://dramashorts.io/pt");
  console.log("title", ds.$("title").text().slice(0, 100));
  const dsLinks = new Set();
  ds.$("a[href]").each((_, el) => {
    const h = ds.$(el).attr("href") || "";
    if (/watch|drama|movie|film|play|series/i.test(h)) dsLinks.add(h);
  });
  console.log("links", [...dsLinks].slice(0, 30));

  console.log("\n=== SHORTDRAMA LANG ===");
  for (const u of [
    "https://shortdrama.st/browse?lang=PT",
    "https://shortdrama.st/browse?language=PT",
    "https://shortdrama.st/browse?lang=pt-BR",
    "https://shortdrama.st/browse?q=dublado",
  ]) {
    const x = await get(u);
    const n = (x.text.match(/drama-card/g) || []).length;
    const items = x.text.match(/numberOfItems":(\d+)/);
    console.log("  cards", n, "items", items && items[1]);
  }

  console.log("\n=== MINISHORT ===");
  await get("https://minishort.com/pt");
})();

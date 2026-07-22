const cheerio = require("cheerio");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json,*/*",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Referer: "https://www.flextv.cc/pt/",
    },
    redirect: "follow",
  });
  const text = await r.text();
  console.log("GET", r.status, url.slice(0, 90), "len", text.length);
  return { status: r.status, url: r.url, text, $: cheerio.load(text) };
}

(async () => {
  // Episode page
  const ep = await get(
    "https://www.flextv.cc/pt/episodes/episode-1-dublada-acorda-querido-k5O3rGdZLg"
  );
  console.log("ep title", ep.$("title").text().slice(0, 120));
  console.log("h1", ep.$("h1").first().text().trim());
  const playerAttrs = {};
  ep.$("video, #player, [data-src], iframe, source").each((_, el) => {
    const $el = ep.$(el);
    playerAttrs.tag = el.tagName;
    for (const a of [
      "src",
      "data-src",
      "data-url",
      "poster",
      "data-hls",
      "data-video",
    ]) {
      if ($el.attr(a)) playerAttrs[a] = $el.attr(a);
    }
  });
  console.log("player", playerAttrs);

  // look for m3u8 / mp4 in html
  const m3u8 = ep.text.match(/https?:[^"'\\s]+\.m3u8[^"'\\s]*/);
  const mp4 = ep.text.match(/https?:[^"'\\s]+\.mp4[^"'\\s]*/);
  console.log("m3u8", m3u8 && m3u8[0]?.slice(0, 150));
  console.log("mp4", mp4 && mp4[0]?.slice(0, 150));

  // JSON in scripts
  const jsonHints = [];
  ep.$("script").each((_, el) => {
    const t = ep.$(el).html() || "";
    if (/m3u8|playUrl|videoUrl|hls|episode/i.test(t) && t.length < 5000) {
      jsonHints.push(t.slice(0, 400));
    } else if (/m3u8|playUrl|videoUrl/i.test(t)) {
      jsonHints.push(t.match(/.{0,80}(m3u8|playUrl|videoUrl|hls).{0,120}/i)?.[0]);
    }
  });
  console.log("hints", jsonHints.slice(0, 8));

  // Next data
  const nd = ep.$("#__NEXT_DATA__").html();
  if (nd) {
    const j = JSON.parse(nd);
    console.log("next keys", Object.keys(j.props?.pageProps || j));
    console.log(
      "next snippet",
      JSON.stringify(j.props?.pageProps || j).slice(0, 800)
    );
  }

  // dramas list page
  console.log("\n=== ALL DRAMAS ===");
  const all = await get("https://www.flextv.cc/pt/dramas/all-dramas");
  const dramaLinks = [];
  all.$("a[href*='/pt/drama/'], a[href*='/pt/episodes/']").each((_, el) => {
    dramaLinks.push({
      href: all.$(el).attr("href"),
      text: all.$(el).text().replace(/\s+/g, " ").trim().slice(0, 70),
    });
  });
  console.log("dramaLinks", dramaLinks.slice(0, 15));

  // search via next/router query params from homepage HTML
  const home = await get("https://www.flextv.cc/pt/");
  const searchAction = home.$("form").attr("action");
  const inputs = [];
  home.$("form input").each((_, el) =>
    inputs.push({
      name: home.$(el).attr("name"),
      type: home.$(el).attr("type"),
    })
  );
  console.log("forms", searchAction, inputs);

  // try common API paths found in scripts
  const apis = new Set();
  home.$("script[src]").each((_, el) => apis.add(home.$(el).attr("src")));
  console.log(
    "js",
    [...apis].filter((s) => /chunk|main|app/i.test(s || "")).slice(0, 10)
  );

  // genre CEO page might list PT titles
  const genre = await get("https://www.flextv.cc/pt/genres/ceo-94686zmr25");
  console.log("genre title", genre.$("title").text().slice(0, 80));
  const gLinks = [];
  genre.$("a[href*='/pt/episodes/'], a[href*='/pt/drama/']").each((i, el) => {
    if (i > 20) return;
    gLinks.push({
      href: genre.$(el).attr("href"),
      t: genre.$(el).text().replace(/\s+/g, " ").trim().slice(0, 80),
    });
  });
  console.log("genre items", gLinks.slice(0, 12));
})();

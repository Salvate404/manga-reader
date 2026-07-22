const cheerio = require("cheerio");

(async () => {
  const url =
    "https://www.goodshort.com/drama/dublado-voltei-mas-o-amor-nunca-foi-jamais-foi-embora-31001192618";
  // correct URL from search
  const pageUrl =
    "https://www.goodshort.com/drama/dublado-voltei-mas-o-amor-nunca-foi-embora-31001192618";
  const html = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  }).then((r) => r.text());

  const m3u8s = [...html.matchAll(/https?:[^"'\\\s]+\.m3u8[^"'\\\s]*/g)].map(
    (m) => m[0].replace(/\\u002F/g, "/")
  );
  console.log("m3u8 count", m3u8s.length, m3u8s.slice(0, 5));

  // also escaped
  const escaped = [...html.matchAll(/https:\\\/\\\/[^"'\\\s]+\.m3u8[^"'\\\s]*/g)].map(
    (m) => m[0].replace(/\\\//g, "/")
  );
  console.log("escaped", escaped.slice(0, 5));

  const $ = cheerio.load(html);
  $('script[type="application/ld+json"]').each((_, el) => {
    console.log("ld", ($(el).html() || "").slice(0, 300));
  });

  // dump around m3u8
  const i = html.toLowerCase().indexOf("m3u8");
  console.log("around m3u8", html.slice(Math.max(0, i - 100), i + 200));

  // Try app.js for API
  const appJs = await fetch(
    "https://acfs3.goodshort.com/dist/app.f6e10c455fec8af4f503.js",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  ).then((r) => r.text());
  console.log("appjs len", appJs.length);
  const apis = [...appJs.matchAll(/https?:\/\/[a-z0-9.-]+[^"'`\s]{0,40}/gi)]
    .map((m) => m[0])
    .filter((u) => /api|cdn|play|video|m3u8/i.test(u));
  console.log("hosts", [...new Set(apis)].slice(0, 30));

  const paths = [...appJs.matchAll(/["'`](\/api\/[^"'`]+)["'`]/g)].map((m) => m[1]);
  console.log("api paths", [...new Set(paths)].slice(0, 40));

  // Try fetch first m3u8 if any
  for (const u of [...new Set([...m3u8s, ...escaped])].slice(0, 3)) {
    try {
      const r = await fetch(u, {
        headers: {
          Referer: "https://www.goodshort.com/",
          Origin: "https://www.goodshort.com",
          "User-Agent": "Mozilla/5.0",
        },
      });
      const t = await r.text();
      console.log("\nplaylist", r.status, u.slice(0, 100), t.slice(0, 300));
    } catch (e) {
      console.log("fail", u, e.message);
    }
  }
})();

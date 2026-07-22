const cheerio = require("cheerio");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

(async () => {
  const id = "7700ea50-9edf-420a-9e2e-98337bba01fb";
  const html = await fetch(`https://dramashorts.io/pt/shorts/${id}`, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
  }).then((r) => r.text());
  const $ = cheerio.load(html);
  const nd = JSON.parse($("#__NEXT_DATA__").html());
  const eps = nd.props.pageProps.episodes;
  console.log("episodes type", Array.isArray(eps) ? "array " + eps.length : typeof eps);
  console.log("ep0", JSON.stringify(eps?.[0] || eps, null, 2).slice(0, 1500));
  console.log("ep1 keys", eps?.[1] && Object.keys(eps[1]));
  console.log("ep1", JSON.stringify(eps?.[1], null, 2).slice(0, 800));

  // Find episode watch URL pattern from links
  $("a[href*='episode'], a[href*='ep'], a[href*='watch']").each((i, el) => {
    if (i < 10) console.log("link", $(el).attr("href"));
  });

  // Try common episode routes
  const ep0id = eps?.[0]?.id || eps?.[0]?.episodeId;
  console.log("ep0id", ep0id);
  for (const u of [
    `https://dramashorts.io/pt/shorts/${id}/episodes/${ep0id}`,
    `https://dramashorts.io/pt/shorts/${id}/${ep0id}`,
    `https://dramashorts.io/pt/watch/${ep0id}`,
    `https://dramashorts.io/pt/episodes/${ep0id}`,
    `https://dramashorts.io/api/episodes/${ep0id}`,
    `https://dramashorts.io/api/movies/${id}/episodes`,
    `https://api.dramashorts.io/movies/${id}`,
  ]) {
    try {
      const r = await fetch(u, {
        headers: { "User-Agent": UA, Accept: "text/html,application/json" },
        redirect: "manual",
      });
      const t = await r.text();
      console.log(r.status, u.slice(0, 90), t.slice(0, 100).replace(/\s+/g, " "));
    } catch (e) {
      console.log("fail", u, e.message);
    }
  }

  // Scan next chunks for api host
  const pageJs = await fetch(
    "https://dramashorts.io/_next/static/chunks/pages/_app-05b79b90720caae4.js",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  const hosts = [
    ...pageJs.matchAll(/https?:\/\/[a-z0-9.-]+\.dramashorts[^"'`\s]*/gi),
  ].map((m) => m[0]);
  console.log("hosts", [...new Set(hosts)].slice(0, 20));
  const apiPaths = [...pageJs.matchAll(/["'`](\/v\d\/[^"'`]+)["'`]/g)].map((m) => m[1]);
  console.log("v paths", [...new Set(apiPaths)].slice(0, 30));
})();

const cheerio = require("cheerio");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Referer: "https://dramashorts.io/pt",
    },
  });
  const text = await r.text();
  console.log("GET", r.status, url, "len", text.length);
  return { status: r.status, text, $: cheerio.load(text), url: r.url };
}

(async () => {
  const id = "7700ea50-9edf-420a-9e2e-98337bba01fb";
  const page = await get(`https://dramashorts.io/pt/shorts/${id}`);
  console.log("title", page.$("title").text());
  console.log("h1", page.$("h1").first().text().trim());
  console.log("og:image", page.$('meta[property="og:image"]').attr("content"));
  console.log("desc", page.$('meta[name="description"]').attr("content")?.slice(0, 150));

  for (const pat of ["m3u8", "mp4", "hls", "video", "playlist", "player", "__NEXT_DATA__"]) {
    console.log(pat, page.text.includes(pat));
  }

  const nd = page.$("#__NEXT_DATA__").html();
  if (nd) {
    const j = JSON.parse(nd);
    console.log("next keys", Object.keys(j));
    console.log("pageProps keys", Object.keys(j.props?.pageProps || {}));
    console.log(JSON.stringify(j.props?.pageProps || j).slice(0, 2000));
  }

  // search
  for (const u of [
    `https://dramashorts.io/pt/search?q=ceo`,
    `https://dramashorts.io/api/search?q=ceo`,
    `https://dramashorts.io/pt/api/search?q=ceo`,
    `https://dramashorts.io/api/shorts?search=ceo`,
  ]) {
    try {
      const r = await get(u);
      console.log("  sample", r.text.slice(0, 200).replace(/\s+/g, " "));
    } catch (e) {
      console.log("fail", u, e.message);
    }
  }

  // look at next build for API
  const appJs = await fetch(
    "https://dramashorts.io/_next/static/chunks/pages/index-906caafb99d209bc.js",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  const apis = [...appJs.matchAll(/["'`](\/api\/[^"'`]+)["'`]/g)].map((m) => m[1]);
  console.log("index apis", [...new Set(apis)].slice(0, 30));
  const urls = [...appJs.matchAll(/https?:\/\/[^"'`\s]+/g)].map((m) => m[0]);
  console.log(
    "external",
    [...new Set(urls)].filter((u) => !u.includes("dramashorts")).slice(0, 20)
  );
})();

const fs = require("fs");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

(async () => {
  for (const c of [
    "/_next/static/chunks/2802-0fbbbf722bee58fb.js",
    "/_next/static/chunks/4802-6599234465770a52.js",
    "/_next/static/chunks/pages/player/%5BmovieId%5D-323b7b873c13c73f.js",
    "/_next/static/chunks/9074-ddfaafe51f291587.js",
  ]) {
    const body = await fetch("https://dramashorts.io" + c, {
      headers: { "User-Agent": UA },
    }).then((r) => r.text());
    console.log("\n====", c, body.length);
    fs.writeFileSync("scripts/_ds_" + c.split("/").pop().replace(/%/g, ""), body);
    for (const k of [
      "playback",
      "m3u8",
      "videoUrl",
      "streamUrl",
      "playlist",
      "/episodes",
      "get(",
      ".get(",
      "hls",
      "source",
      "media",
    ]) {
      let i = 0,
        n = 0;
      while ((i = body.indexOf(k, i)) >= 0 && n < 2) {
        console.log(
          k,
          body.slice(Math.max(0, i - 80), i + 160).replace(/\n/g, " ")
        );
        i += k.length;
        n++;
      }
    }
  }

  // Extract API client from _app
  const app = await fetch(
    "https://dramashorts.io/_next/static/chunks/pages/_app-05b79b90720caae4.js",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  const i = app.indexOf("web-api.dramashorts.io/v1");
  console.log("\n\nAPI CLIENT\n", app.slice(i - 200, i + 2500));

  // player page
  const movieId = "7700ea50-9edf-420a-9e2e-98337bba01fb";
  const player = await fetch(`https://dramashorts.io/pt/player/${movieId}`, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
  });
  const html = await player.text();
  console.log("\nplayer", player.status, html.length, html.includes("__NEXT_DATA__"));
  if (html.includes("__NEXT_DATA__")) {
    const cheerio = require("cheerio");
    const $ = cheerio.load(html);
    const nd = JSON.parse($("#__NEXT_DATA__").html());
    console.log("player props", Object.keys(nd.props?.pageProps || {}));
    console.log(JSON.stringify(nd.props.pageProps).slice(0, 1500));
  }
  console.log("player m3u8?", /m3u8/i.test(html));
})();

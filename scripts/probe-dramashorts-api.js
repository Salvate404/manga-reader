const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Origin: "https://dramashorts.io",
      Referer: "https://dramashorts.io/pt",
    },
  });
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  console.log("\nGET", r.status, url);
  console.log((json ? JSON.stringify(json) : text).slice(0, 700));
  return { status: r.status, json, text };
}

(async () => {
  const base = "https://web-api.dramashorts.io/v1";
  const movieId = "7700ea50-9edf-420a-9e2e-98337bba01fb";
  const epId = "b6aaf123-2c1f-43eb-8df5-72b995a33a5a";

  for (const path of [
    `/movies/${movieId}`,
    `/movies/${movieId}/episodes`,
    `/episodes/${epId}`,
    `/episodes/${epId}/stream`,
    `/episodes/${epId}/video`,
    `/episodes/${epId}/play`,
    `/playback/${epId}`,
    `/movies?search=ceo`,
    `/movies?query=ceo`,
    `/search?q=ceo`,
    `/search/movies?q=ceo`,
    `/catalog/search?q=ceo`,
    `/movies/search?q=ceo`,
    `/movies?locale=pt`,
    `/feed`,
    `/home`,
    `/catalog`,
  ]) {
    await get(base + path);
  }

  // Also scan app chunk for endpoints
  const app = await fetch(
    "https://dramashorts.io/_next/static/chunks/pages/_app-05b79b90720caae4.js",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  const paths = [...app.matchAll(/["'`](\/v1\/[a-zA-Z0-9_\/{}?-]+)["'`]/g)].map(
    (m) => m[1]
  );
  console.log("\napp v1 paths", [...new Set(paths)].slice(0, 50));
  const paths2 = [...app.matchAll(/web-api\.dramashorts\.io[^"'`\s]*/g)].map(
    (m) => m[0]
  );
  console.log("web-api refs", [...new Set(paths2)].slice(0, 20));

  // search in larger chunks
  const main = await fetch(
    "https://dramashorts.io/_next/static/chunks/main-8bcd9b69ea0985a3.js",
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  console.log(
    "main paths",
    [...new Set([...main.matchAll(/["'`](\/v1\/[^"'`]+)["'`]/g)].map((m) => m[1]))].slice(
      0,
      40
    )
  );
})();

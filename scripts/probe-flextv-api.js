const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url, headers = {}) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Origin: "https://www.flextv.cc",
      Referer: "https://www.flextv.cc/pt/",
      ...headers,
    },
  });
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  console.log(
    "\nGET",
    r.status,
    url,
    json ? `code=${json.code} keys=${Object.keys(json).join(",")}` : text.slice(0, 150)
  );
  if (json) console.log(JSON.stringify(json).slice(0, 600));
  return { status: r.status, json, text };
}

(async () => {
  const base = "https://api-quick.flextv.cc";

  // Probe common paths
  for (const path of [
    "/api/search?keyword=ceo",
    "/api/v1/search?keyword=ceo",
    "/search?keyword=ceo",
    "/drama/search?keyword=ceo",
    "/api/drama/search?keyword=ceo&language=pt",
    "/api/app/search?keyword=ceo",
    "/api/video/search?keyword=ceo",
    "/api/index/search?keyword=ceo",
  ]) {
    await get(base + path);
  }

  // Fetch homepage JS bundles to find API paths
  const home = await fetch("https://www.flextv.cc/pt/", {
    headers: { "User-Agent": UA },
  }).then((r) => r.text());
  const scripts = [...home.matchAll(/src="(\/_nuxt\/[^"]+\.js)"/g)].map((m) => m[1]);
  console.log("\nscripts", scripts.slice(0, 15));

  // Find api-quick mentions and nearby path strings in a few bundles
  for (const src of scripts.slice(0, 8)) {
    const js = await fetch("https://www.flextv.cc" + src, {
      headers: { "User-Agent": UA },
    }).then((r) => r.text());
    const hits = [
      ...js.matchAll(/api-quick\.flextv\.cc[^"'`\s]{0,80}/g),
      ...js.matchAll(/["'](\/api\/[^"'`]{3,80})["']/g),
      ...js.matchAll(/search[^"'`]{0,40}/gi),
    ].slice(0, 20);
    if (hits.length) {
      console.log("\nbundle", src, "len", js.length);
      console.log(
        hits
          .map((h) => (typeof h === "string" ? h : h[0] || h[1]))
          .slice(0, 25)
      );
    }
  }
})();

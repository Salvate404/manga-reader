const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
      Referer: "https://shortdrama.st/",
    },
  });
  const text = await res.text();
  return { status: res.status, text, ct: res.headers.get("content-type") };
}

(async () => {
  const home = await get("https://shortdrama.st/");
  console.log("home", home.status, home.text.length);

  const scripts = [...home.text.matchAll(/src=["']([^"']+\.js[^"']*)["']/g)].map(
    (m) => m[1]
  );
  console.log("scripts", scripts.slice(0, 20));

  const hrefs = [...home.text.matchAll(/href=["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((h) => /drama|watch|series|play|episode|\/d\//i.test(h));
  console.log("hrefs", [...new Set(hrefs)].slice(0, 40));

  // inline config / api base
  for (const key of [
    "api",
    "graphql",
    "supabase",
    "firebase",
    "m3u8",
    "cdn",
    "fetch(",
    "axios",
    "baseURL",
    "/v1/",
  ]) {
    const n = home.text.split(key).length - 1;
    if (n) console.log("key", key, n);
  }

  // try common API paths
  const tries = [
    "https://shortdrama.st/api/dramas",
    "https://shortdrama.st/api/v1/dramas",
    "https://shortdrama.st/api/series",
    "https://shortdrama.st/api/home",
    "https://api.shortdrama.st/dramas",
    "https://shortdrama.st/browse",
    "https://shortdrama.st/dramas",
    "https://shortdrama.st/sitemap.xml",
    "https://shortdrama.st/robots.txt",
  ];
  for (const u of tries) {
    try {
      const r = await get(u);
      console.log(
        "TRY",
        r.status,
        r.ct,
        u,
        r.text.slice(0, 160).replace(/\s+/g, " ")
      );
    } catch (e) {
      console.log("TRY FAIL", u, e.message);
    }
  }

  // fetch first script that looks like app
  for (const s of scripts.slice(0, 8)) {
    const url = s.startsWith("http") ? s : `https://shortdrama.st${s}`;
    try {
      const r = await get(url);
      console.log("\nSCRIPT", url, r.status, r.text.length);
      const apis = [...r.text.matchAll(/["'`](\/api\/[^"'`]+)["'`]/g)].map(
        (m) => m[1]
      );
      console.log("api paths", [...new Set(apis)].slice(0, 40));
      const urls = [
        ...r.text.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^"'`\\\s]*/gi),
      ]
        .map((m) => m[0])
        .filter((u) => /api|cdn|stream|drama/i.test(u));
      console.log("urls", [...new Set(urls)].slice(0, 30));
    } catch (e) {
      console.log("script fail", s, e.message);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
      Referer: "https://shortdrama.st/",
      ...headers,
    },
  });
  const text = await res.text();
  return { status: res.status, text, ct: res.headers.get("content-type") };
}

(async () => {
  const browse = await get("https://shortdrama.st/browse");
  console.log("browse", browse.status, browse.text.length);
  const scripts = [
    ...browse.text.matchAll(/src=["']([^"']+)["']/g),
  ].map((m) => m[1]);
  console.log("scripts", scripts);

  // look for modulepreload / type=module
  const mods = [
    ...browse.text.matchAll(
      /(?:src|href)=["']([^"']*(?:assets|dist|build|app|main|index)[^"']*)["']/gi
    ),
  ].map((m) => m[1]);
  console.log("mods", mods);

  // dump interesting chunks of HTML
  const idx = browse.text.indexOf("<body");
  console.log("body start", browse.text.slice(idx, idx + 2000).replace(/\s+/g, " "));

  // sitemap
  const sm = await get("https://shortdrama.st/sitemap.xml");
  console.log("\nsitemap", sm.text.slice(0, 1500));

  const pages = await get("https://shortdrama.st/sitemap-pages.xml");
  console.log("\npages sitemap", pages.status, pages.text.slice(0, 2000));

  // find a drama sitemap
  const locs = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log("sitemap locs", locs.slice(0, 20));

  for (const loc of locs.slice(0, 5)) {
    const r = await get(loc);
    console.log("\nSM", loc, r.status, r.text.slice(0, 500));
    const dramaLinks = [...r.text.matchAll(/https:\/\/shortdrama\.st\/[^<"]+/g)]
      .map((m) => m[0])
      .slice(0, 10);
    console.log("links", dramaLinks);
  }

  // try watch/play paths from marketing
  for (const u of [
    "https://shortdrama.st/app",
    "https://shortdrama.st/watch",
    "https://shortdrama.st/play",
    "https://shortdrama.st/catalog",
    "https://shortdrama.st/new",
    "https://shortdrama.st/trending",
  ]) {
    const r = await get(u);
    console.log("PATH", u, r.status, r.text.length, r.text.includes("root") || r.text.includes("app"));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

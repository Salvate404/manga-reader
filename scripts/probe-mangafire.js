const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json,*/*",
      Referer: "https://mangafire.to/",
    },
  });
  const text = await res.text();
  return { status: res.status, text, headers: Object.fromEntries(res.headers) };
}

function pick(html, re, n = 20) {
  return [...html.matchAll(re)].slice(0, n).map((m) => m[0]);
}

(async () => {
  const titleUrl = "https://mangafire.to/title/zk12-goodnight-punpun";
  const { status, text: html } = await fetchText(titleUrl);
  console.log("TITLE status", status, "len", html.length);

  console.log("\n--- ajax/api hints ---");
  console.log(pick(html, /\/ajax\/[a-zA-Z0-9_./?-]+/g, 40));
  console.log(pick(html, /data-[a-z-]+=["'][^"']+/gi, 40));
  console.log(pick(html, /href=["'][^"']*\/read\/[^"']+/gi, 20));
  console.log(pick(html, /https?:\/\/[^"']+\.(?:jpg|jpeg|webp|png)/gi, 15));

  const idx = html.toLowerCase().indexOf("chapter");
  if (idx >= 0) {
    console.log("\n--- around chapter ---");
    console.log(html.slice(Math.max(0, idx - 200), idx + 2500).replace(/\s+/g, " ").slice(0, 2000));
  }

  // try common endpoints based on mangafire structure (similar to other clones)
  const idMatch =
    html.match(/data-id=["'](\d+)["']/) ||
    html.match(/data-manga-id=["'](\d+)["']/) ||
    html.match(/manga_id["']?\s*[:=]\s*["']?(\d+)/i) ||
    html.match(/\/ajax\/manga\/([^"'/]+)/);

  console.log("\n--- id match ---", idMatch && idMatch[0]);

  // extract zk12 id from slug
  const slug = "zk12-goodnight-punpun";
  const code = slug.split("-")[0]; // zk12
  console.log("code", code);

  const candidates = [
    `https://mangafire.to/ajax/manga/${code}/chapter/en`,
    `https://mangafire.to/ajax/read/${code}/chapter/en`,
    `https://mangafire.to/ajax/manga/zk12/chapter/en`,
    `https://mangafire.to/ajax/read/zk12/chapter/en`,
    `https://mangafire.to/ajax/manga/${slug}/chapter/en`,
  ];

  // also search page
  const search = await fetchText("https://mangafire.to/filter?keyword=punpun");
  console.log("\nSEARCH status", search.status, "len", search.text.length);
  console.log(pick(search.text, /href=["']\/title\/[^"']+/gi, 10));
  console.log(pick(search.text, /\/ajax\/[a-zA-Z0-9_./?-]+/g, 20));

  // try to find vrf or ajax in scripts
  const scriptSrcs = [...html.matchAll(/src=["']([^"']+\.js[^"']*)["']/g)].map((m) => m[1]);
  console.log("\nSCRIPTS", scriptSrcs.slice(0, 20));

  for (const u of candidates) {
    try {
      const r = await fetchText(u);
      console.log("\nTRY", u, r.status, r.text.slice(0, 200).replace(/\s+/g, " "));
    } catch (e) {
      console.log("\nTRY FAIL", u, e.message);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

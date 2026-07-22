const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";

async function get(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Referer: "https://mangafire.to/",
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, len: text.length, json, preview: text.slice(0, 300) };
}

(async () => {
  const urls = [
    "https://mangafire.to/api/titles?keyword=punpun&page=1&limit=5",
    "https://mangafire.to/api/titles?order[views_30d]=desc&page=1&limit=5",
    "https://mangafire.to/api/titles/zk12",
    "https://mangafire.to/api/titles/zk12/chapters?language=en&sort=number&order=desc&page=1&limit=5",
    "https://mangafire.to/api/titles/zk12-goodnight-punpun",
  ];
  for (const u of urls) {
    const r = await get(u);
    console.log("\n====", u);
    console.log("status", r.status, "len", r.len);
    if (r.json) {
      console.log(JSON.stringify(r.json, null, 2).slice(0, 1200));
    } else {
      console.log(r.preview.replace(/\s+/g, " "));
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

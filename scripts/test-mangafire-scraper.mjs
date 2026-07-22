import { createRequire } from "module";
// Smoke test via dynamic import of compiled logic mirrored here

const BASE = "https://mangafire.to";
const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";

async function j(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA, Accept: "application/json", Referer: `${BASE}/` },
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

const search = await j("/api/titles?keyword=punpun&page=1&limit=3");
console.log(
  "search",
  search.items.map((i) => ({ hid: i.hid, title: i.title, slug: `${i.hid}-${i.slug}` }))
);

const detail = await j("/api/titles/zk12");
console.log("detail", detail.data.title, detail.data.languages);

const ch = await j(
  "/api/titles/zk12/chapters?language=pt-br&sort=number&order=desc&page=1&limit=3"
);
console.log("pt-br chapters", ch.items?.length, ch.meta?.total, ch.items?.[0]);

const en = await j(
  "/api/titles/zk12/chapters?language=en&sort=number&order=desc&page=1&limit=3"
);
console.log("en chapters", en.items?.length, en.meta?.total);

const pages = await j(`/api/chapters/${en.items[0].id}`);
console.log("pages", pages.data.pages.length, pages.data.pages[0].url.slice(0, 80));

console.log("OK");

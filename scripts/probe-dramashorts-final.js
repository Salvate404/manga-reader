const cheerio = require("cheerio");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function apiPost(path, data) {
  // Client converts camelCase -> snake_case before send
  const snake = Object.fromEntries(
    Object.entries(data || {}).map(([k, v]) => [
      k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()),
      v,
    ])
  );
  const r = await fetch(`https://web-api.dramashorts.io/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Origin: "https://dramashorts.io",
      Referer: "https://dramashorts.io/pt",
      Authorization: "",
      "X-Interface-Language": "pt",
      "X-OS": "web",
      "X-OS-Version": "1.0.0",
      "X-App-Version": "1.0.0",
    },
    body: JSON.stringify({ data: snake }),
  });
  const json = await r.json().catch(() => null);
  console.log("\nPOST", path, r.status, JSON.stringify(json).slice(0, 500));
  return json;
}

(async () => {
  const movieId = "7700ea50-9edf-420a-9e2e-98337bba01fb";
  const epId = "b6aaf123-2c1f-43eb-8df5-72b995a33a5a";

  await apiPost("web-movie-get", { movieId });
  await apiPost("web-episode-list", { movieId });
  await apiPost("web-episode-access", { movieId, episodeId: epId });
  await apiPost("web-movie-list", { page: 1, size: 12 });

  // HLS quality
  const m3u8 =
    "https://cdn.dramashorts.io/video/At2NzHJ8GNRn4Jn74nQYOazw/HnbZxypgg5NmeYyi7U4drrgr/manifest.m3u8";
  const pl = await fetch(m3u8, {
    headers: { Referer: "https://dramashorts.io/", "User-Agent": UA },
  }).then(async (r) => ({
    status: r.status,
    acao: r.headers.get("access-control-allow-origin"),
    text: await r.text(),
  }));
  console.log("\nplaylist", pl.status, "cors", pl.acao);
  console.log(pl.text.slice(0, 600));

  // Parse variants
  const variants = [...pl.text.matchAll(/RESOLUTION=(\d+x\d+)[^\n]*\n([^\n]+)/g)];
  console.log(
    "variants",
    variants.map((m) => ({ res: m[1], url: m[2].slice(0, 80) }))
  );

  // Search via HTML homepage filter - check top-movies / discover for search
  // Filter home cards by title containing query
  const home = await fetch("https://dramashorts.io/pt", {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
  }).then((r) => r.text());
  const $ = cheerio.load(home);
  const nd = home.includes("__NEXT_DATA__")
    ? JSON.parse($("#__NEXT_DATA__").html())
    : null;
  if (nd) {
    console.log("home props", Object.keys(nd.props.pageProps || {}));
    const disc = nd.props.pageProps.discover;
    console.log("discover blocks", disc?.length, disc?.[0]?.type);
    const titles = [];
    for (const b of disc || []) {
      for (const m of b.data?.movies || []) {
        titles.push(m.title);
      }
    }
    console.log(
      "sample titles",
      titles.filter((t) => /ceo|bilion|amor/i.test(t)).slice(0, 10)
    );
  }

  // next data discover
  const discApi = await apiPost("web-discover-get", {});
})();

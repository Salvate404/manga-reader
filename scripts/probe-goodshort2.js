(async () => {
  const pageUrl =
    "https://www.goodshort.com/drama/dublado-voltei-mas-o-amor-nunca-foi-embora-31001192618";
  const html = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR",
    },
  }).then((r) => r.text());

  // decode unicode escapes in a chunk
  const paths = [];
  for (const m of html.matchAll(/"m3u8Path"\s*:\s*"([^"]+)"/g)) {
    paths.push(JSON.parse('"' + m[1] + '"'));
  }
  // also chapter list
  for (const m of html.matchAll(/m3u8Path\\?":\\?"([^"\\]+)/g)) {
    try {
      paths.push(JSON.parse('"' + m[1].replace(/\\u/g, "\\u") + '"'));
    } catch {}
  }
  console.log("paths found", paths.length);
  console.log(paths[0]);

  // broader extract
  const i = html.indexOf("m3u8Path");
  const chunk = html.slice(i, i + 500);
  console.log("chunk", chunk);
  const decoded = chunk.replace(/\\u002F/g, "/").replace(/\\u0026/g, "&");
  const url = decoded.match(/https:\/\/[^"\\]+/);
  console.log("url", url && url[0]);

  if (url) {
    const m3u8 = url[0];
    const pl = await fetch(m3u8, {
      headers: {
        Referer: "https://www.goodshort.com/",
        Origin: "https://www.goodshort.com",
        "User-Agent": "Mozilla/5.0",
      },
    }).then(async (r) => ({ status: r.status, text: await r.text(), acao: r.headers.get("access-control-allow-origin") }));
    console.log("playlist", pl.status, "cors", pl.acao);
    console.log(pl.text.slice(0, 500));

    if (pl.status === 200) {
      const lines = pl.text.split("\n");
      const seg = lines.find((l) => l && !l.startsWith("#"));
      const segUrl = new URL(seg, m3u8).toString();
      const buf = Buffer.from(
        await fetch(segUrl, {
          headers: { Referer: "https://www.goodshort.com/" },
        }).then((r) => r.arrayBuffer())
      );
      const dur = Number(pl.text.match(/#EXTINF:([\d.]+)/)?.[1] || 5);
      console.log(
        "goodshort bitrate ~",
        Math.round((buf.length * 8) / (dur * 1000)),
        "kbps",
        "seg",
        buf.length,
        "dur",
        dur
      );
      // STREAM-INF?
      console.log("multi?", /EXT-X-STREAM-INF/.test(pl.text), pl.text.match(/RESOLUTION=\d+x\d+/g));
    }
  }

  // search page?
  for (const u of [
    "https://www.goodshort.com/pt/search?keyword=ceo",
    "https://www.goodshort.com/search?keyword=ceo",
    "https://www.goodshort.com/pt/search/ceo",
  ]) {
    const r = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "pt-BR" },
      redirect: "follow",
    });
    const t = await r.text();
    console.log("search", r.status, u, t.includes("drama/") ? "has dramas" : "no", t.slice(0, 80).replace(/\s+/g, " "));
  }
})();

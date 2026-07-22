(async () => {
  const s = await fetch(
    "http://localhost:3000/api/shorts/search?q=ceo&sources=flextv"
  );
  const sj = await s.json();
  console.log("search", s.status, sj.results?.length, sj.results?.[0]);

  const id = sj.results?.[0]?.seriesId;
  const d = await fetch(
    `http://localhost:3000/api/shorts/detail?sourceId=flextv&seriesId=${encodeURIComponent(id)}`
  );
  const dj = await d.json();
  console.log(
    "detail",
    d.status,
    dj.series?.title,
    dj.series?.episodeCount,
    dj.series?.episodes?.[0]
  );

  const ep = dj.series?.episodes?.[0]?.id;
  const st = await fetch(
    `http://localhost:3000/api/shorts/streams?sourceId=flextv&episodeId=${encodeURIComponent(ep)}`
  );
  const stj = await st.json();
  console.log("streams", st.status, stj.streams?.sources?.[0]?.url?.slice(0, 100));

  const t = await fetch("http://localhost:3000/api/shorts/trending");
  const tj = await t.json();
  console.log(
    "trending",
    t.status,
    tj.items?.slice(0, 3).map((x) => x.title)
  );
})();

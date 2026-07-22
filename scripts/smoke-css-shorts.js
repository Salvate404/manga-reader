(async () => {
  const r = await fetch("http://localhost:3000/");
  const html = await r.text();
  const m = html.match(/href="(\/_next\/static\/[^"]+\.css)"/);
  console.log("home", r.status, "css", m?.[1] || "MISSING");
  if (m) {
    const c = await fetch("http://localhost:3000" + m[1]);
    console.log("cssStatus", c.status, "bytes", (await c.text()).length);
  }
  const s = await fetch("http://localhost:3000/api/shorts/search?q=ceo");
  const sj = await s.json();
  console.log("shorts", s.status, sj.results?.length, sj.results?.[0]?.title);
})();

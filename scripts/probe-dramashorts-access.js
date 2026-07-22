const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function apiPost(path, data = {}) {
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
    body: JSON.stringify({ data }),
  });
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  console.log("\nPOST", path, r.status);
  console.log((json ? JSON.stringify(json) : text).slice(0, 800));
  return { status: r.status, json, text };
}

(async () => {
  const movieId = "7700ea50-9edf-420a-9e2e-98337bba01fb";
  const epId = "b6aaf123-2c1f-43eb-8df5-72b995a33a5a";
  const movieKey = "At2NzHJ8GNRn4Jn74nQYOazw";
  const epKey = "HnbZxypgg5NmeYyi7U4drrgr";

  // Auth create guest?
  await apiPost("web-auth-create", {});
  await apiPost("web-auth-token-get", {});

  await apiPost("web-movie-get", { movie_id: movieId, movieId });
  await apiPost("web-episode-list", { movie_id: movieId, movieId });
  await apiPost("web-episode-access", {
    episode_id: epId,
    episodeId: epId,
    movie_id: movieId,
    movieId,
  });
  await apiPost("web-discover-get", {});
  await apiPost("web-movie-list", { query: "ceo", search: "ceo", q: "ceo" });

  // Guess CDN paths for full episode
  const guesses = [
    `https://cdn.dramashorts.io/video/${movieKey}/${epKey}/manifest.m3u8`,
    `https://cdn.dramashorts.io/video/${movieKey}/${epKey}/index.m3u8`,
    `https://cdn.dramashorts.io/video/${epKey}/manifest.m3u8`,
    `https://cdn.dramashorts.io/video/${movieKey}/episodes/${epKey}/manifest.m3u8`,
    `https://cdn.dramashorts.io/video/${movieKey}/${epKey}/hls/manifest.m3u8`,
    `https://cdn.dramashorts.io/episodes/${movieKey}/${epKey}/manifest.m3u8`,
    `https://cdn.dramashorts.io/video/${movieKey}/${epId}/manifest.m3u8`,
  ];
  for (const u of guesses) {
    const r = await fetch(u, {
      method: "GET",
      headers: { "User-Agent": UA, Referer: "https://dramashorts.io/" },
    });
    const t = await r.text();
    console.log("CDN", r.status, u.replace("https://cdn.dramashorts.io", ""), t.slice(0, 80).replace(/\s+/g, " "));
  }
})();

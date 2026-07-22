import { dramaShorts } from "../src/lib/shorts/dramashorts";

async function main() {
  const search = await dramaShorts.search("ceo");
  console.log("search", search.length, search[0]?.title, search[0]?.seriesId);

  const trend = await dramaShorts.getTrending(5);
  console.log(
    "trend",
    trend.map((t) => t.title).slice(0, 3)
  );

  const id = search[0]?.seriesId || trend[0]?.seriesId;
  if (!id) throw new Error("no series");

  const detail = await dramaShorts.getDetail(id);
  console.log("detail", detail.title, "eps", detail.episodes.length);

  const streams = await dramaShorts.getEpisodeStreams(detail.episodes[0].id);
  console.log("stream ok", streams.sources[0].url.includes(".m3u8"));

  const ep10 = detail.episodes.find((e) => e.number === 10);
  if (ep10) {
    const s10 = await dramaShorts.getEpisodeStreams(ep10.id);
    console.log("ep10 ok", s10.sources[0].url.includes(".m3u8"));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

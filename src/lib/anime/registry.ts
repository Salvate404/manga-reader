import type { BaseAnimeSource } from "./base";
import { AnimeFireSource } from "./sources/animefire";
import { GoyabuSource } from "./sources/goyabu";
import { AnimesOnlineSource } from "./sources/animesonline";

const sources: BaseAnimeSource[] = [
  new AnimeFireSource(),
  new GoyabuSource(),
  new AnimesOnlineSource(),
];

export function getAllAnimeSources(): BaseAnimeSource[] {
  return sources;
}

export function getAnimeSourceById(sourceId: string): BaseAnimeSource | undefined {
  return sources.find((s) => s.sourceId === sourceId);
}

export function getAnimeSourceList() {
  return sources.map((s) => ({
    id: s.sourceId,
    name: s.sourceName,
    baseUrl: s.baseUrl,
    language: s.language,
  }));
}

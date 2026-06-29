/**
 * Exemplo comentado de como implementar um scraper.
 * Copie este arquivo, renomeie e adapte para o site desejado.
 *
 * Para ativar: descomente a importação no registry.ts
 */

// import axios from "axios";
// import * as cheerio from "cheerio";
// import { BaseScraper } from "../base";
// import type { MangaDetail, MangaSearchResult, ChapterPage } from "@/lib/types";
//
// export class ExemploScraper extends BaseScraper {
//   readonly sourceId = "exemplo";
//   readonly sourceName = "Site Exemplo";
//   readonly baseUrl = "https://exemplo.com";
//   readonly language = "pt-BR";
//
//   async search(query: string): Promise<MangaSearchResult[]> {
//     const { data } = await axios.get(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
//       headers: { "User-Agent": "Mozilla/5.0" },
//       timeout: 10_000,
//     });
//     const $ = cheerio.load(data);
//     const results: MangaSearchResult[] = [];
//
//     $(".manga-item").each((_, el) => {
//       const title = $(el).find(".title").text().trim();
//       const href = $(el).find("a").attr("href") ?? "";
//       const cover = $(el).find("img").attr("src") ?? null;
//       const mangaId = href.replace(/\/$/, "").split("/").pop() ?? "";
//
//       results.push({
//         sourceId: this.sourceId,
//         sourceName: this.sourceName,
//         mangaId,
//         title,
//         cover,
//         url: href.startsWith("http") ? href : `${this.baseUrl}${href}`,
//       });
//     });
//
//     return results;
//   }
//
//   async getMangaDetail(mangaId: string): Promise<MangaDetail> {
//     const { data } = await axios.get(`${this.baseUrl}/manga/${mangaId}`, {
//       headers: { "User-Agent": "Mozilla/5.0" },
//       timeout: 10_000,
//     });
//     const $ = cheerio.load(data);
//
//     const title = $("h1.manga-title").text().trim();
//     const cover = $(".cover img").attr("src") ?? null;
//     const description = $(".synopsis").text().trim();
//
//     const chapters = $(".chapter-item")
//       .map((i, el) => {
//         const num = $(el).find(".chapter-number").text().trim();
//         const href = $(el).find("a").attr("href") ?? "";
//         const chapterId = href.replace(/\/$/, "").split("/").pop() ?? "";
//         return {
//           id: chapterId,
//           number: num,
//           url: href.startsWith("http") ? href : `${this.baseUrl}${href}`,
//         };
//       })
//       .toArray();
//
//     return {
//       sourceId: this.sourceId,
//       mangaId,
//       title,
//       cover,
//       description,
//       chapters,
//     };
//   }
//
//   async getChapterPages(chapterId: string): Promise<ChapterPage[]> {
//     const { data } = await axios.get(`${this.baseUrl}/chapter/${chapterId}`, {
//       headers: { "User-Agent": "Mozilla/5.0" },
//       timeout: 10_000,
//     });
//     const $ = cheerio.load(data);
//
//     return $(".page-image img")
//       .map((index, el) => ({
//         index,
//         imageUrl: $(el).attr("src") ?? $(el).attr("data-src") ?? "",
//       }))
//       .toArray();
//   }
// }

export {};

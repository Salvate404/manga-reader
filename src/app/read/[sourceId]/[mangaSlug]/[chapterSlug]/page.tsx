import Link from "next/link";
import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { NexusReadPage } from "@/components/NexusReadPage";
import { getMangaChapters } from "@/lib/manga-service";
import { getScraperById } from "@/lib/scrapers/registry";

interface ReadPageProps {
  params: Promise<{ sourceId: string; mangaSlug: string; chapterSlug: string }>;
}

export const maxDuration = 30;

export default async function ReadPage({ params }: ReadPageProps) {
  const { sourceId, mangaSlug, chapterSlug } = await params;

  // NexusToons: usa client component que chama rotas Edge diretamente
  if (sourceId === "nexustoons") {
    return <NexusReadPage sourceId={sourceId} mangaSlug={mangaSlug} chapterSlug={chapterSlug} />;
  }

  const data = await getMangaChapters(sourceId, mangaSlug);

  if (!data) notFound();

  const { manga } = data;
  const chapterIndex = manga.chapters.findIndex((c) => c.id === chapterSlug);
  const chapter = manga.chapters[chapterIndex];

  if (!chapter) notFound();

  // Em listas geralmente decrescentes: anterior = índice maior, próximo = índice menor
  const prevChapter = manga.chapters[chapterIndex + 1];
  const nextChapter = manga.chapters[chapterIndex - 1];

  return (
    <div className="min-h-screen bg-black">
      {/* Breadcrumb mínimo */}
      <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex items-center gap-2 text-xs text-zinc-500 overflow-hidden">
        <Link href="/" className="hover:text-white transition-colors flex-shrink-0">
          Início
        </Link>
        <span>/</span>
        <Link
          href={`/manga/${sourceId}/${mangaSlug}`}
          className="hover:text-white transition-colors truncate max-w-[140px]"
        >
          {manga.title}
        </Link>
        <span className="flex-shrink-0">/</span>
        <span className="text-zinc-400 flex-shrink-0">Cap. {chapter.number}</span>
      </div>

      <Reader
        sourceId={sourceId}
        sourceName={getScraperById(sourceId)?.sourceName}
        mangaId={mangaSlug}
        mangaTitle={manga.title}
        cover={manga.cover}
        chapter={chapter}
        prevChapter={prevChapter}
        nextChapter={nextChapter}
        allChapters={manga.chapters}
      />
    </div>
  );
}

export async function generateMetadata({ params }: ReadPageProps) {
  const { sourceId, mangaSlug, chapterSlug } = await params;
  const data = await getMangaChapters(sourceId, mangaSlug);
  const chapter = data?.manga.chapters.find((c) => c.id === chapterSlug);
  const title = data?.manga.title ?? mangaSlug;
  return {
    title: `Cap. ${chapter?.number ?? chapterSlug} — ${title} | MangáReader`,
  };
}

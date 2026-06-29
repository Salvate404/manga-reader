import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterList } from "@/components/ChapterList";
import { getMangaChapters } from "@/lib/manga-service";

interface MangaPageProps {
  params: Promise<{ sourceId: string; mangaSlug: string }>;
}

export const maxDuration = 30;

export default async function MangaPage({ params }: MangaPageProps) {
  const { sourceId, mangaSlug } = await params;
  const data = await getMangaChapters(sourceId, mangaSlug);

  if (!data) notFound();

  const { manga } = data;
  const firstChapter = manga.chapters.at(-1); // geralmente em ordem decrescente
  const lastChapter = manga.chapters.at(0);

  const STATUS_LABEL: Record<string, string> = {
    ongoing: "Em andamento",
    completed: "Completo",
    hiatus: "Hiato",
    unknown: "Desconhecido",
  };

  return (
    <div className="max-w-3xl mx-auto page-enter">
      {/* Header do mangá */}
      <div className="relative">
        {/* Fundo desfocado com a capa */}
        {manga.cover && (
          <div
            className="absolute inset-0 opacity-10 bg-cover bg-center blur-2xl scale-110"
            style={{
              backgroundImage: `url('/api/proxy?url=${encodeURIComponent(manga.cover)}')`,
            }}
          />
        )}

        <div className="relative px-4 pt-6 pb-4 flex gap-4">
          {/* Capa */}
          <div className="relative w-[110px] h-[160px] flex-shrink-0 rounded-xl overflow-hidden bg-zinc-800 shadow-xl">
            {manga.cover ? (
              <Image
                src={`/api/proxy?url=${encodeURIComponent(manga.cover)}`}
                alt={manga.title}
                fill
                className="object-cover"
                sizes="110px"
                unoptimized
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M9 21V9" />
                </svg>
              </div>
            )}
          </div>

          {/* Metadados */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h1 className="text-white font-bold text-lg leading-tight mb-1">
                {manga.title}
              </h1>
              {manga.author && (
                <p className="text-zinc-400 text-sm">{manga.author}</p>
              )}
              {manga.status && manga.status !== "unknown" && (
                <span className="inline-block mt-2 text-xs font-medium bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                  {STATUS_LABEL[manga.status]}
                </span>
              )}
            </div>

            {/* Botão Ler */}
            {firstChapter && (
              <Link
                href={`/read/${sourceId}/${mangaSlug}/${firstChapter.id}`}
                className="mt-3 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.14v14l11-7-11-7z"/>
                </svg>
                Ler do início
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Descrição */}
      {manga.description && (
        <div className="px-4 py-3">
          <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">
            {manga.description}
          </p>
        </div>
      )}

      {/* Gêneros */}
      {manga.genres && manga.genres.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {manga.genres.map((genre) => (
            <span key={genre} className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
              {genre}
            </span>
          ))}
        </div>
      )}

      {/* Stats rápidos */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg">{manga.chapters.length}</p>
          <p className="text-zinc-500 text-xs">Capítulos</p>
        </div>
        <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
          <p className="text-white font-bold text-lg truncate">
            {lastChapter?.number ?? "—"}
          </p>
          <p className="text-zinc-500 text-xs">Último cap.</p>
        </div>
      </div>

      {/* Lista de capítulos */}
      <div className="px-4 pb-8">
        <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-3">
          Capítulos
        </h2>
        <ChapterList
          sourceId={sourceId}
          mangaId={mangaSlug}
          chapters={manga.chapters}
        />
      </div>
    </div>
  );
}

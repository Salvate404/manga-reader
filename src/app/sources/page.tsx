import Link from "next/link";
import { getSourceList } from "@/lib/scrapers/registry";
import { getAnimeSourceList } from "@/lib/anime/registry";

export default function SourcesPage() {
  const mangaSources = getSourceList();
  const animeSources = getAnimeSourceList();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 page-enter">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Fontes configuradas</h1>
        <p className="text-zinc-400 text-sm">
          Mangá e anime rodam em pipelines paralelos — cada um com suas próprias fontes.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-zinc-300 text-sm font-semibold uppercase tracking-wider mb-3">
          Mangá
        </h2>
        {mangaSources.length === 0 ? (
          <EmptySources kind="mangá" />
        ) : (
          <SourceList sources={mangaSources} />
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-zinc-300 text-sm font-semibold uppercase tracking-wider mb-3">
          Anime
        </h2>
        {animeSources.length === 0 ? (
          <EmptySources kind="anime" />
        ) : (
          <SourceList sources={animeSources} />
        )}
        <div className="mt-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-xs text-zinc-500 leading-relaxed">
          <p className="text-zinc-400 font-medium mb-1">Fontes de anime (PT-BR)</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              <span className="text-zinc-300">AnimeFire</span>,{" "}
              <span className="text-zinc-300">Goyabu</span> e{" "}
              <span className="text-zinc-300">AnimesOnline</span> — cada uma toca
              só o próprio catálogo
            </li>
            <li>
              Se um episódio falhar, o app <strong className="text-zinc-300">não</strong>{" "}
              troca de site sozinho; sugere abrir a mesma obra na outra fonte
            </li>
          </ul>
        </div>
      </section>

      <div className="mt-6 p-4 bg-zinc-800/30 border border-zinc-700/30 rounded-xl">
        <h2 className="text-zinc-300 text-sm font-medium mb-2">Como adicionar uma fonte de anime</h2>
        <ol className="text-zinc-500 text-xs space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>
            Crie uma classe em{" "}
            <code className="text-zinc-400">src/lib/anime/sources/</code> estendendo{" "}
            <code className="text-zinc-400">BaseAnimeSource</code>
          </li>
          <li>
            Implemente <code className="text-zinc-400">search</code>,{" "}
            <code className="text-zinc-400">getAnimeDetail</code> e{" "}
            <code className="text-zinc-400">getEpisodeStreams</code>
          </li>
          <li>
            Registre em <code className="text-zinc-400">src/lib/anime/registry.ts</code> e em{" "}
            <code className="text-zinc-400">ALL_ANIME_SOURCES</code>
          </li>
        </ol>
      </div>

      <div className="mt-4 text-center">
        <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function SourceList({
  sources,
}: {
  sources: { id: string; name: string; baseUrl: string; language: string }[];
}) {
  return (
    <div className="space-y-2">
      {sources.map((source) => (
        <div
          key={source.id}
          className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3 flex items-center justify-between"
        >
          <div>
            <p className="text-white font-medium text-sm">{source.name}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{source.baseUrl}</p>
          </div>
          <span className="text-[10px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
            {source.language}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptySources({ kind }: { kind: string }) {
  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-6 text-center">
      <p className="text-zinc-400 text-sm">Nenhuma fonte de {kind} configurada.</p>
    </div>
  );
}

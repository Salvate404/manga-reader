import Link from "next/link";
import { getSourceList } from "@/lib/scrapers/registry";

export default function SourcesPage() {
  const sources = getSourceList();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 page-enter">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Fontes configuradas</h1>
        <p className="text-zinc-400 text-sm">
          Sites de mangá que o sistema irá buscar ao fazer uma pesquisa.
        </p>
      </div>

      {sources.length === 0 ? (
        <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-6 text-center">
          <p className="text-zinc-400 text-sm mb-2">Nenhuma fonte configurada ainda.</p>
          <p className="text-zinc-600 text-xs leading-relaxed max-w-sm mx-auto">
            Para adicionar um site de mangá, crie um arquivo em{" "}
            <code className="text-zinc-500">src/lib/scrapers/sources/</code>{" "}
            seguindo o modelo em{" "}
            <code className="text-zinc-500">exemplo.ts</code>{" "}
            e registre-o em{" "}
            <code className="text-zinc-500">registry.ts</code>.
          </p>
        </div>
      ) : (
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
      )}

      <div className="mt-6 p-4 bg-zinc-800/30 border border-zinc-700/30 rounded-xl">
        <h2 className="text-zinc-300 text-sm font-medium mb-2">Como adicionar uma fonte</h2>
        <ol className="text-zinc-500 text-xs space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>Copie o arquivo <code className="text-zinc-400">src/lib/scrapers/sources/exemplo.ts</code></li>
          <li>Renomeie e implemente os métodos <code className="text-zinc-400">search</code>, <code className="text-zinc-400">getMangaDetail</code> e <code className="text-zinc-400">getChapterPages</code></li>
          <li>Importe e adicione a instância no array dentro de <code className="text-zinc-400">src/lib/scrapers/registry.ts</code></li>
          <li>Reinicie o servidor de desenvolvimento</li>
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

/** Mostrado pelo Next.js automaticamente enquanto a página de leitura carrega. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Barra de breadcrumb skeleton */}
      <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex gap-2">
        <div className="h-3 w-10 bg-zinc-700 rounded animate-pulse" />
        <div className="h-3 w-2 bg-zinc-700 rounded animate-pulse" />
        <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse" />
        <div className="h-3 w-2 bg-zinc-700 rounded animate-pulse" />
        <div className="h-3 w-14 bg-zinc-700 rounded animate-pulse" />
      </div>
      {/* Reader skeleton */}
      <div className="flex flex-col items-center gap-0 bg-black pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="w-full max-w-2xl bg-zinc-900 animate-pulse"
            style={{ height: "calc(100vw * 1.4)", maxHeight: "900px" }}
          />
        ))}
      </div>
    </div>
  );
}

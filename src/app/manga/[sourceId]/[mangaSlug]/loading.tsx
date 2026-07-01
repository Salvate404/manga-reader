/** Mostrado pelo Next.js automaticamente enquanto a página de mangá carrega. */
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex gap-4 pb-4">
        <div className="w-[110px] h-[160px] flex-shrink-0 rounded-xl bg-zinc-800" />
        <div className="flex-1 flex flex-col gap-3 pt-1">
          <div className="h-5 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-1/3" />
          <div className="h-3 bg-zinc-800 rounded w-1/4" />
          <div className="h-10 bg-zinc-800 rounded-xl mt-2 w-2/3" />
        </div>
      </div>
      {/* Capítulos skeleton */}
      <div className="mt-4 space-y-2 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-zinc-800/70 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carregando anime…",
};

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex gap-4">
        <div className="w-[110px] h-[160px] rounded-xl bg-zinc-900 animate-pulse" />
        <div className="flex-1 space-y-3 py-2">
          <div className="h-5 w-2/3 bg-zinc-900 rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-zinc-900 rounded animate-pulse" />
          <div className="h-9 w-28 bg-zinc-900 rounded-xl animate-pulse mt-4" />
        </div>
      </div>
      <div className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

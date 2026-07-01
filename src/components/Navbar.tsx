"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { InstallPrompt } from "@/components/InstallPrompt";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40 group-hover:bg-red-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight group-hover:text-red-400 transition-colors">
            MangáReader
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <InstallPrompt />
          <NavLink href="/" active={pathname === "/"}>Início</NavLink>
          <NavLink href="/sources" active={pathname === "/sources"}>Fontes</NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`text-sm px-3 py-1.5 rounded-lg transition-colors font-medium ${
        active
          ? "text-white bg-zinc-800"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
      }`}
    >
      {children}
    </Link>
  );
}


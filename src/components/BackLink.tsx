"use client";

import { useRouter } from "next/navigation";
import {
  getContentNavState,
  getReturnHref,
} from "@/lib/navigation-return";

interface BackLinkProps {
  href?: string;
  label?: string;
  className?: string;
}

export function BackLink({
  href = "/",
  label = "Voltar",
  className = "",
}: BackLinkProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        const fallback = getReturnHref(href);
        const { layer, fromHub } = getContentNavState();

        // Pula capa + episódio de uma vez e volta ao hub de origem
        if (fromHub && layer > 0) {
          window.history.go(-layer);
          return;
        }

        router.replace(fallback);
      }}
      className={`inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}

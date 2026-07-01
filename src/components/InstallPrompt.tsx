"use client";

/**
 * Botão "Instalar App" para PWA.
 * - Android / Chrome/Edge: usa o evento beforeinstallprompt
 * - iOS / Safari: mostra modal com instruções (Share → "Adicionar à Tela de Início")
 * - Oculta automaticamente se o app já está instalado (standalone mode)
 */

import { useState, useEffect } from "react";

type Platform = "android" | "ios" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  return "android";
}

function checkStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  // Inicializa direto do browser — evita setState síncrono em effect
  const [platform] = useState<Platform>(() => detectPlatform());
  const [alreadyInstalled] = useState(() => checkStandalone());
  const [promptEvent, setPromptEvent] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Escuta o evento de instalação (Android / Chrome / Edge)
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (alreadyInstalled || dismissed) return null;
  if (platform === "android" && !promptEvent) return null;

  async function handleInstall() {
    if (platform === "ios") {
      setShowIOSModal(true);
      return;
    }
    if (!promptEvent) return;
    await promptEvent.prompt();
    setDismissed(true);
  }

  return (
    <>
      <button
        onClick={handleInstall}
        title="Instalar app"
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-zinc-600 px-2.5 py-1.5 rounded-lg transition-all"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 16V4M8 12l4 4 4-4" />
          <rect x="3" y="18" width="18" height="3" rx="1" />
        </svg>
        Instalar
      </button>

      {/* Modal iOS */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-sm mb-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Instalar MangáReader</p>
                <p className="text-zinc-400 text-xs mt-0.5">Adicionar à tela de início</p>
              </div>
            </div>

            <ol className="space-y-3 text-sm text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Toque no botão{" "}
                  <span className="inline-flex items-center gap-1 bg-zinc-700 px-1.5 py-0.5 rounded text-xs">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    Compartilhar
                  </span>{" "}
                  na barra do Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Role para baixo e toque em{" "}
                  <strong className="text-white">&ldquo;Adicionar à Tela de Início&rdquo;</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Toque em <strong className="text-white">&ldquo;Adicionar&rdquo;</strong> no canto
                  superior direito
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}


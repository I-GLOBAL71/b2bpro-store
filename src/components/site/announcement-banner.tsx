"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { X, Megaphone } from "lucide-react";

/**
 * Bandeau d'annonce configurable (panneau admin → Page d'accueil).
 * Rejetable : le rejet est mémorisé par message (localStorage) — modifier le
 * message dans l'admin le fait réapparaître pour tout le monde.
 * Lecture via useSyncExternalStore (aucun écart d'hydratation : le serveur
 * rend le bandeau, le client le masque si déjà rejeté).
 */
const ANNOUNCE_EVENT = "b2bpro:annonce";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(ANNOUNCE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ANNOUNCE_EVENT, onChange);
  };
}

export function AnnouncementBanner({
  message,
  linkUrl,
  linkLabel,
}: {
  message: string;
  linkUrl: string;
  linkLabel: string;
}) {
  const storageKey = `b2bpro-annonce:${message}`;
  const dismissed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(storageKey) === "1";
      } catch {
        return false;
      }
    },
    () => false // rendu serveur : bandeau visible par défaut
  );

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* stockage indisponible : rejet simple pour la session */
    }
    window.dispatchEvent(new Event(ANNOUNCE_EVENT));
  }, [storageKey]);

  if (dismissed || !message) return null;

  return (
    <div role="status" aria-label="Annonce du site" className="relative z-[60] bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2.5 text-center sm:px-6 lg:px-8">
        <Megaphone className="hidden h-4 w-4 shrink-0 text-emerald-50 sm:block" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-[13px] font-medium leading-5">
          {message}
          {linkUrl && linkLabel && (
            <>
              {" "}
              <Link
                href={linkUrl}
                className="whitespace-nowrap font-bold underline decoration-white/50 underline-offset-2 transition-colors hover:decoration-white"
              >
                {linkLabel} →
              </Link>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer l'annonce"
          className="shrink-0 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

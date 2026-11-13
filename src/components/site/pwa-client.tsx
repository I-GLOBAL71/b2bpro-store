"use client";

/**
 * PwaClient — support PWA côté client (v2.3.0) : enregistrement du service
 * worker (condition d'installabilité Chromium) + invite d'installation maison.
 *
 * L'invite remplace le mini-bandeau natif Chrome : elle n'apparaît que quand
 * le navigateur a réellement décidé que l'app est installable (événement
 * `beforeinstallprompt`), puis :
 *   • floute tout l'arrière-plan (l'attention se concentre sur elle) ;
 *   • offre « Installer » (dialogue natif) ou la croix (fermeture) ;
 *   • fermée (croix, Échap, clic au-dehors, choix dans le dialogue natif),
 *     elle ne réapparaît plus de TOUTE la session (sessionStorage) : uniquement
 *     à la prochaine ouverture de l'app ;
 *   • jamais affichée si l'app tourne déjà en mode standalone (installée).
 *
 * iOS : Safari n'émet pas `beforeinstallprompt` (installation via Partage →
 * « Sur l'écran d'accueil », satisfaite par apple-touch-icon + manifeste) :
 * l'invite reste donc silencieuse, par conception.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Download, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Événement non standardisé émis par Chromium quand l'app devient installable. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/** Clé de session : fermer l'invite la masque jusqu'à la prochaine ouverture. */
const SESSION_KEY = "pwa-install-hidden";

/** Laisse la page terminer son premier rendu avant d'interpeller le visiteur. */
const SHOW_DELAY_MS = 900;

/** Vrai si l'app tourne déjà installée (plein écran standalone). */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as unknown as { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function PwaClient() {
  const [open, setOpen] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1) Service worker : condition d'installabilité Chrome/Edge/Android.
  //    Échec silencieux : le site fonctionne intégralement sans SW, seule
  //    l'invite d'installation ne se présentera pas.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // 2) Invite : uniquement si installable, pas déjà installée, pas refusée
  //    au cours de cette session.
  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const onBeforeInstallPrompt = (event: Event) => {
      // Chrome peut réémettre l'événement plus tard : la session a tranché.
      if (sessionStorage.getItem(SESSION_KEY)) return;
      const e = event as BeforeInstallPromptEvent;
      e.preventDefault();
      deferred.current = e;
      if (showTimer.current) clearTimeout(showTimer.current);
      showTimer.current = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    };

    const onAppInstalled = () => {
      sessionStorage.setItem(SESSION_KEY, "1");
      deferred.current = null;
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      if (showTimer.current) clearTimeout(showTimer.current);
    };
  }, []);

  /** Fermeture (croix, Échap, clic au-dehors) : silence jusqu'à la prochaine ouverture. */
  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) {
      sessionStorage.setItem(SESSION_KEY, "1");
      deferred.current = null;
    }
    setOpen(next);
  }, []);

  /** « Installer » : passe la main au dialogue natif, puis silence de session. */
  const install = useCallback(() => {
    const e = deferred.current;
    if (!e) return;
    deferred.current = null;
    // Le dialogue natif prend le relais : notre invite s'efface aussitôt,
    // et quoi qu'il choisisse ensuite (accepter / refuser), la session a
    // désormais sa réponse : plus aucune relance avant la prochaine ouverture.
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
    e.prompt().catch(() => {});
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        {/* Fond flouté : toute l'attention se concentre sur l'invite. z-[70] :
            au-dessus de la bannière d'annonce (z-60) et du header (z-50), sous
            les toasts (z-100) — le flou couvre donc TOUT le chrome du site. */}
        <DialogOverlay className="z-[70] bg-black/40 backdrop-blur-md" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={
            "bg-card data-[state=open]:animate-in data-[state=closed]:animate-out " +
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 " +
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 " +
            "fixed top-[50%] left-[50%] z-[70] grid w-[calc(100%-2rem)] max-w-[320px] " +
            "translate-x-[-50%] translate-y-[-50%] gap-5 rounded-3xl border-border/60 " +
            "border p-7 text-center shadow-2xl duration-300"
          }
        >
          {/* Icône de l'application (marque b2bpro, dégradé émeraude) */}
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={72}
            height={72}
            priority
            className="mx-auto rounded-2xl shadow-md ring-1 ring-black/5"
          />

          <div className="space-y-1.5">
            <DialogTitle className="text-lg leading-none font-semibold tracking-tight">
              Installer l&rsquo;application
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[13px] font-medium">
              b2bpro.store
            </DialogDescription>
          </div>

          <Button
            type="button"
            onClick={install}
            autoFocus
            className="h-11 w-full rounded-xl text-[15px] font-semibold shadow-sm"
          >
            <Download className="size-4" aria-hidden="true" />
            Installer
          </Button>

          {/* Fermeture : silence jusqu'à la prochaine ouverture de l'app */}
          <DialogClose
            aria-label="Fermer"
            className={
              "ring-offset-background focus:ring-ring absolute top-3.5 right-3.5 grid size-8 " +
              "place-items-center rounded-full text-muted-foreground transition-colors " +
              "hover:bg-accent hover:text-foreground focus:ring-2 focus:ring-offset-2 " +
              "focus:outline-hidden disabled:pointer-events-none"
            }
          >
            <X className="size-4" aria-hidden="true" />
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

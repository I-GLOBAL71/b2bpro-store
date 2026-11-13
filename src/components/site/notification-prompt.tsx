"use client";

/**
 * NotificationPrompt — invitation bienveillante aux notifications navigateur
 * (v2.4.0). Non intrusive PAR CONSTRUCTION :
 *
 *   • Jamais avant un vrai engagement : 40 s de présence + 3 interactions,
 *     ou 3 pages vues avec 15 s et 2 interactions (visiteur qui explore) ;
 *   • Jamais si le navigateur a déjà tranché (permission accordée ou refusée
 *     dans les réglages du site : on s'incline sans rien demander) ;
 *   • Jamais pendant l'invite d'installation de l'App, ni dans les 60 s qui
 *     suivent la fermeture de TOUTE invite (régisseur src/lib/prompt-hub.ts) ;
 *   • Un refus poli est respecté : 48 h, puis 7 jours, puis 30 jours de
 *     silence (cooldowns escaladants persistés dans localStorage) ;
 *   • Une fois activées : abonnement Web Push enregistré (si VAPID configuré)
 *     puis notification de confirmation affichée par le service worker.
 *
 * Visuellement, sœur de l'invite d'installation : même carte centrée, fond
 * flouté (l'attention se concentre sur elle), même famille de coins, de la même
 * famille de boutons et de croix. L'animation d'entrée est ici staggered :
 * médaille cloche qui « sonne » en pulsations concentriques, textes puis
 * boutons qui montent l'un après l'autre (spring, ~350 ms) : immersive mais
 * discrète.
 *
 * iOS Safari sans PWA installée : l'API Notification n'existe pas, l'invite
 * reste donc silencieuse, par conception (aucun message inutile).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, type Variants } from "framer-motion";
import { BellRing, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  acquirePrompt,
  releasePrompt,
  usePromptHub,
  withinSpacing,
  type PromptHubSnapshot,
} from "@/lib/prompt-hub";

/* ══ Réglages d'apparition : le cœur du « non intrusif » ═══════════════════ */

/** Persistance locale : statut + cooldowns escaladants après refus poli. */
const LS_KEY = "b2bpro-notif-prompt";
const DAY_MS = 86_400_000;
/** 1er refus : 48 h ; 2e : 7 jours ; suivants : 30 jours. */
const DISMISS_COOLDOWNS_MS = [2 * DAY_MS, 7 * DAY_MS, 30 * DAY_MS];

/** Engagement posé : le visiteur a lu, cliqué, exploré (40 s + 3 interactions). */
const ENGAGE_TIME_MS = 40_000;
const ENGAGE_INTERACTIONS = 3;
/** Engagement rapide : le visiteur navigue (3 pages + 15 s + 2 interactions). */
const FAST_PAGES = 3;
const FAST_TIME_MS = 15_000;
const FAST_INTERACTIONS = 2;

interface NotifStore {
  status?: "enabled" | "blocked";
  dismissed?: number;
  until?: number;
}

function readStore(): NotifStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) ?? "{}") as NotifStore;
  } catch {
    return {};
  }
}

function writeStore(patch: Partial<NotifStore>) {
  try {
    const merged = { ...readStore(), ...patch };
    window.localStorage.setItem(LS_KEY, JSON.stringify(merged));
  } catch {
    /* stockage indisponible : la session seule décidera */
  }
}

/** Vrai si l'API Notifications existe (Safari iOS sans PWA installée : non). */
function notificationsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

/** Décode une clé publique VAPID (base64url) vers le buffer attendu par Push. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const padded = base64 + padding;
  const normalized = padded.split("-").join("+").split("_").join("/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Toutes les portes d'apparition, réunies (re-évaluées périodiquement). */
function canAppear(hub: PromptHubSnapshot, pathname: string | null): boolean {
  if (!notificationsSupported()) return false;
  if (Notification.permission !== "default") return false; // accordé ou refusé : on s'incline
  if (hub.active) return false; // l'invite d'installation occupe le créneau
  if (withinSpacing(hub)) return false; // courtoisie post-fermeture
  if (pathname && (pathname.startsWith("/admin") || pathname.startsWith("/api"))) return false;
  const stored = readStore();
  if (stored.status === "enabled" || stored.status === "blocked") return false;
  if (typeof stored.until === "number" && Date.now() < stored.until) return false;
  return true;
}

/* ══ Chorégraphie d'entrée : stagger discret, ressorts ══════════════════════ */

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 340, damping: 26 },
  },
};

const pop: Variants = {
  hidden: { opacity: 0, scale: 0.4 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 360, damping: 17 } },
};

export function NotificationPrompt() {
  const [open, setOpen] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState(0);

  const hub = usePromptHub();
  const pathname = usePathname();

  const timeRef = useRef(0);
  const interactionsRef = useRef(0);
  const pagesRef = useRef(0);
  const engagedRef = useRef(false);

  /* Pages vues : l'invite vit dans le layout racine (jamais démontée en
     navigation douce) : chaque pathname franchi est une page de plus. */
  useEffect(() => {
    pagesRef.current += 1;
  }, [pathname]);

  /* Interactions : clics/toucher et clavier (compteurs passifs). */
  useEffect(() => {
    const bump = () => {
      interactionsRef.current = Math.min(interactionsRef.current + 1, 99);
    };
    window.addEventListener("pointerdown", bump, { passive: true });
    window.addEventListener("keydown", bump, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, []);

  /* Temps de présence (onglet visible seulement), engagement, re-évaluation
     périodique : la fin d'un espacement ou d'un cooldown est ainsi détectée
     sans attendre le moindre événement utilisateur. */
  useEffect(() => {
    if (open) return; // l'invite est à l'écran : on cesse d'évaluer
    const id = setInterval(() => {
      if (document.visibilityState === "visible") timeRef.current += 1000;
      const engagedNow =
        (timeRef.current >= ENGAGE_TIME_MS && interactionsRef.current >= ENGAGE_INTERACTIONS) ||
        (pagesRef.current >= FAST_PAGES &&
          timeRef.current >= FAST_TIME_MS &&
          interactionsRef.current >= FAST_INTERACTIONS);
      if (engagedNow && !engagedRef.current) {
        engagedRef.current = true;
        setEngaged(true);
      }
      if (timeRef.current > 0 && timeRef.current % 10_000 === 0) setCheck((c) => c + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  /* Décision : toutes les portes ouvertes → on prend le créneau d'attention. */
  useEffect(() => {
    if (open || !engaged) return;
    if (!canAppear(hub, pathname)) return;
    if (!acquirePrompt("notifications")) return;
    setOpen(true);
  }, [open, engaged, hub, pathname, check]);

  /* Libération du créneau + courtoisie, quelle que soit la voie de sortie. */
  useEffect(() => {
    if (!open) return;
    return () => releasePrompt("notifications");
  }, [open]);

  /** Fermeture : enregistre l'issue (refus poli → cooldown escaladant). */
  const close = useCallback((outcome: "dismiss" | "enabled" | "blocked") => {
    if (outcome === "dismiss") {
      const dismissed = (readStore().dismissed ?? 0) + 1;
      const cooldown =
        DISMISS_COOLDOWNS_MS[Math.min(dismissed - 1, DISMISS_COOLDOWNS_MS.length - 1)];
      writeStore({ dismissed, until: Date.now() + cooldown });
    } else if (outcome === "enabled") {
      writeStore({ status: "enabled", until: 0 });
    } else {
      writeStore({ status: "blocked" });
    }
    setOpen(false);
  }, []);

  /** Croix, Échap, clic au-dehors : refus poli, même escalade que « Plus tard ». */
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setOpen(true);
        return;
      }
      close("dismiss");
    },
    [close],
  );

  /** « Activer » : permission navigateur → abonnement Web Push → confirmation. */
  const activate = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!notificationsSupported()) {
        close("blocked");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        // Refus au niveau NAVIGATEUR : l'OS ne re-proposera pas de sitôt.
        // On l'interprète comme un « non » définitif, sans rancune.
        close("blocked");
        return;
      }
      close("enabled");
      // Abonnement Web Push (si VAPID configuré) puis notification de
      // confirmation : la preuve immédiate que tout fonctionne.
      try {
        const registration = await navigator.serviceWorker.ready;
        let synced = false;
        try {
          const res = await fetch("/api/push/public-key", { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { publicKey: string | null };
            if (data.publicKey) {
              const existing = await registration.pushManager.getSubscription();
              const subscription = existing
                ? existing
                : await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
                  });
              const save = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription.toJSON()),
              });
              synced = save.ok;
            }
          }
        } catch {
          /* Web Push indisponible (VAPID absent, réseau...) : les
             notifications LOCALES du service worker restent fonctionnelles. */
        }
        await registration.showNotification("Notifications activées", {
          body: "Vous serez alerté à temps : suivi de vos commandes et réponses clés, uniquement l'essentiel.",
          icon: "/icons/icon-192.png",
          badge: "/icons/maskable-192.png",
          tag: "b2bpro-notifications",
          data: { url: "/" },
        });
        toast.success(
          synced ? "Notifications activées et synchronisées." : "Notifications activées sur cet appareil.",
        );
      } catch {
        toast.success("Notifications activées sur cet appareil.");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, close]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange={handleOpenChange}>
      <DialogPortal>
        {/* Fond flouté : toute l'attention se concentre sur l'invite. z-[70] :
            même étage que l'invite d'installation, sous les toasts. */}
        <DialogOverlay className="z-[70] bg-black/40 backdrop-blur-md" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={
            "bg-card data-[state=open]:animate-in data-[state=closed]:animate-out " +
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 " +
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 " +
            "fixed top-[50%] left-[50%] z-[70] w-[calc(100%-2rem)] max-w-[320px] " +
            "translate-x-[-50%] translate-y-[-50%] rounded-3xl border-border/60 " +
            "border p-7 text-center shadow-2xl duration-300"
          }
        >
          <motion.div variants={container} initial="hidden" animate="visible" className="grid gap-5">
            {/* Médaille cloche : elle « sonne » par pulsations concentriques. */}
            <motion.div
              variants={pop}
              className="relative mx-auto grid size-[76px] place-items-center"
            >
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-primary/25"
                animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
              />
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-primary/20"
                animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut", delay: 2.1 }}
              />
              <div className="grid size-[76px] place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <BellRing className="size-8" aria-hidden="true" />
              </div>
            </motion.div>
            {/* TEXTES_ET_BOUTONS_ICI */}
          </motion.div>
          {/* CROIX_ICI */}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

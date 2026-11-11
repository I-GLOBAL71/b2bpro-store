"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, RotateCcw, Send, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ServiceChatWidget — assistant IA flottant propre à chaque service (v1.9.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  - Bouton flottant en bas à droite portant les INITIALES DU VENDEUR sur son
 *    dégradé d'avatar (couleurs uniques par vendeur) + pastille de discussion.
 *  - Panneau de conversation : message d'accueil déterministe (aucun appel
 *    réseau pour démarrer), suggestions issues de la FAQ de la fiche,
 *    indicateur de frappe, réponses brèves et conviviales côté /api/service-chat.
 *  - Historique conservé par service (sessionStorage) : le visiteur qui rouvre
 *    la fiche retrouve sa conversation de la session.
 *  - Robustesse : envoi bloqué pendant un appel, échec réseau → message de
 *    repli rassurant, Échap referme le panneau, focus automatique sur le champ.
 */

export interface ServiceChatWidgetProps {
  /** Slug du service (clé d'historique + appel API). */
  slug: string;
  /** Titre commercial de la fiche. */
  serviceTitle: string;
  /** Prix formaté côté serveur (ex. « 20 € »). */
  basePrice: string;
  deliveryDays: number;
  /** Note formatée (ex. « 4,8/5 »). */
  ratingLabel: string;
  reviewsCount: number;
  sellerName: string;
  sellerInitials: string;
  sellerCity: string;
  sellerCountry: string;
  /** Temps de réponse affiché sur la fiche vendeur (ex. « moins de 2 h »). */
  responseTime: string;
  /** Dégradé du bouton [couleur1, couleur2] (avatarColors du vendeur). */
  colors: [string, string];
  /** Questions suggérées (FAQ de la fiche, pré-tronquées côté serveur). */
  suggestions: string[];
  /** true = bouton surélevé au-dessus de la barre de commande persistante (v2.0.0). */
  raiseAboveDock?: boolean;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const FALLBACK_REPLY =
  "Petit contretemps technique de mon côté. Reposez-moi votre question dans un instant — et s'il persiste, notre équipe humaine vous répond sous 4 h via la page Support.";

export function ServiceChatWidget(props: ServiceChatWidgetProps) {
  const {
    slug,
    serviceTitle,
    basePrice,
    deliveryDays,
    ratingLabel,
    reviewsCount,
    sellerName,
    sellerInitials,
    sellerCity,
    sellerCountry,
    responseTime,
    colors,
    suggestions,
    raiseAboveDock = false,
  } = props;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const storageKey = `b2bpro-svcchat:${slug}`;

  const welcome: Msg = {
    role: "assistant",
    content: `Bonjour ! Je suis l'assistant IA de ${sellerName}. Ravi de vous conseiller sur « ${serviceTitle} » : offre de base à ${basePrice}, livrée en ${deliveryDays} jours ouvrés, notée ${ratingLabel} par ${reviewsCount} clients. Que souhaitez-vous savoir (inclus, options, garanties) ?`,
  };

  // Restauration de la conversation de la session pour CE service.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setMessages(JSON.parse(saved) as Msg[]);
    } catch {
      /* ignore : une session corrompue repart de zéro */
    }
  }, []);

  // Défilement vers le dernier message + persistance. « open » est une
  // dépendance : à la réouverture du panneau (historique restauré), le fil doit
  // se positionner en bas même si `messages` n'a pas changé depuis le montage.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    // Défilement instantané (jamais interrompu), pour garantir la position
    // finale quel que soit l'état d'animation au moment de l'appel.
    el.scrollTop = el.scrollHeight;
    if (messages.length > 1) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(messages));
      } catch {
        /* quota dépassé : la conversation continue sans persistance */
      }
    }
  }, [messages, open, storageKey]);

  // Échap referme le panneau — comportement attendu d'une fenêtre flottante.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/service-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          history: next.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { reply?: string };
      if (!data.reply) throw new Error("empty");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: FALLBACK_REPLY }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function resetChat() {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setMessages([]);
  }

  const gradient = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
  const visibleMessages = messages.length > 0 ? messages : [welcome];

  return (
    <div
      className={cn(
        "fixed right-4 z-50 flex flex-col items-end gap-3 sm:right-5",
        raiseAboveDock ? "bottom-[84px]" : "bottom-4 sm:bottom-5",
      )}
    >
      {/* ── Panneau de conversation ─────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label={`Discussion avec l'assistant de ${sellerName}`}
          className="flex h-[540px] max-h-[72vh] w-[calc(100vw-2rem)] animate-fade-up flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl sm:w-[380px]"
        >
          {/* En-tête — identité du vendeur */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 text-white"
            style={{ background: gradient }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-[14px] font-bold backdrop-blur-sm">
              {sellerInitials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold">{sellerName}</p>
              <p className="flex items-center gap-1.5 truncate text-[11.5px] text-white/85">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300 animate-pulse-soft"
                  aria-hidden="true"
                />
                Assistant IA · {responseTime}
              </p>
              <p className="truncate text-[10.5px] text-white/70">
                {sellerCity}, {sellerCountry}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={resetChat}
                aria-label="Recommencer la conversation"
                className="h-8 w-8 rounded-full text-white/80 hover:bg-white/15 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Fermer la discussion"
                className="h-8 w-8 rounded-full text-white/80 hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Fil de discussion */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Messages de la discussion"
            className="flex-1 space-y-3 overflow-y-auto bg-muted/30 px-4 py-4"
          >
            {visibleMessages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <p
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-6",
                    m.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border bg-card text-foreground"
                  )}
                >
                  {m.content}
                </p>
              </div>
            ))}

            {/* Indicateur de frappe */}
            {loading && (
              <div className="flex justify-start">
                <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">{sellerName} est en train d'écrire</span>
                </span>
              </div>
            )}
          </div>

          {/* Suggestions (visibles au démarrage) */}
          {visibleMessages.length <= 1 && !loading && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2.5 pt-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Champ de saisie */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Posez votre question à propos de ce service"
              aria-label="Votre message à l'assistant"
              className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Envoyer le message"
              className="h-11 w-11 shrink-0 rounded-full p-0 text-white disabled:opacity-50"
              style={{ background: gradient }}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>

          {/* Transparence + réassurance */}
          <p className="flex items-center gap-1.5 border-t border-border/60 px-4 py-2 text-[10.5px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
            Réponses générées par IA — paiement séquestré, remboursement intégral si non conforme.
          </p>
        </div>
      )}

      {/* ── Bouton flottant : initiales du vendeur ───────────────────────────── */}
      <div className="flex items-center gap-3">
        {!open && (
          <span className="hidden items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[12px] font-semibold shadow-lg sm:flex">
            Discuter avec {sellerName.split(" ")[0]}
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={
            open
              ? `Fermer la discussion avec ${sellerName}`
              : `Discuter avec ${sellerName} à propos de « ${serviceTitle} »`
          }
          aria-expanded={open}
          className="relative flex h-14 w-14 items-center justify-center rounded-full text-[17px] font-extrabold text-white shadow-xl transition-transform duration-200 hover:scale-105 active:scale-95"
          style={{ background: gradient }}
        >
          {/* Halo pulsant — attire l'œil sans agressivité */}
          <span
            className="pointer-events-none absolute -inset-1.5 rounded-full opacity-35 animate-pulse-soft"
            style={{ background: gradient }}
            aria-hidden="true"
          />
          <span className="relative">{sellerInitials}</span>
          {!open && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-card shadow-md">
              <MessageCircle
                className="h-3.5 w-3.5"
                style={{ color: colors[0] }}
                aria-hidden="true"
              />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

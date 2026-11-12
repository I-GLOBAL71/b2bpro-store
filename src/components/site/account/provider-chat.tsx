"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCcw, Send, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { API_ROUTES, type SupportThreadMessageDTO } from "@/lib/contracts";

/**
 * Chat avec le PRESTATAIRE HUMAIN de la plateforme (v2.2.0) — c'est-à-dire le
 * propriétaire lui-même (prestataire unique). Conversation bijective :
 *   • chaque question du client → email URGENT au propriétaire + notification
 *     dans son panneau d'administration (/admin/messages) ;
 *   • chaque réponse du propriétaire → email au client + affichage ici.
 *
 * Actualisation automatique toutes les 20 s (léger, compatible Vercel) et à
 * la reprise de focus de l'onglet : la réponse du prestataire apparaît sans
 * rechargement de page.
 */

const POLL_MS = 20_000;

const timeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

interface ThreadState {
  status: "open" | "closed";
  messages: SupportThreadMessageDTO[];
}

export function ProviderChat() {
  const [thread, setThread] = useState<ThreadState | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (scroll: boolean) => {
    try {
      const res = await fetch(API_ROUTES.supportThread, { cache: "no-store" });
      if (res.status === 401) {
        setThread(null);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        thread?: { status: string } | null;
        messages?: SupportThreadMessageDTO[];
      };
      setThread({
        status: data.thread?.status === "closed" ? "closed" : "open",
        messages: data.messages ?? [],
      });
      setLoading(false);
      if (scroll) {
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        });
      }
    } catch {
      /* réseau passager : le prochain cycle réessaiera */
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const id = setInterval(() => void load(false), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void load(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  async function send() {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      const res = await fetch(API_ROUTES.supportThread, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "L'envoi a échoué — réessayez dans un instant.");
        return;
      }
      setText("");
      await load(true);
      toast.success("Message transmis au prestataire — il est notifié immédiatement.");
    } catch {
      toast.error("Réseau indisponible — votre message n'est pas perdu, réessayez.");
    } finally {
      setSending(false);
    }
  }

  const messages = thread?.messages ?? [];

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
      {/* En-tête : qui répond, et comment il est alerté */}
      <div className="border-b border-border bg-accent/40 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight">
              Discuter avec le prestataire — réponse humaine
            </p>
            <p className="text-[12.5px] leading-5 text-muted-foreground">
              Vous écrivez directement au propriétaire de b2bpro.store, prestataire
              unique de la plateforme : chaque question le notifie par email (marquée
              urgente) et remonte dans son tableau de bord.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(false)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            aria-label="Actualiser la conversation"
          >
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="max-h-96 min-h-44 space-y-3 overflow-y-auto px-4 py-4 sm:px-5"
        role="log"
        aria-label="Conversation avec le prestataire"
        aria-live="polite"
      >
        {loading ? (
          <div className="flex h-44 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="ml-2 text-[13px]">Chargement de la conversation…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center gap-2 text-center">
            <p className="text-[13.5px] font-semibold">Aucun message pour l&apos;instant</p>
            <p className="mx-auto max-w-sm text-[12.5px] leading-5 text-muted-foreground">
              Une question sur un service, une commande en cours, un livrable à préciser ?
              Posez-la ici : le propriétaire-prestataire vous répond personnellement.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "client" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:max-w-[75%] ${
                  m.role === "client"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border bg-muted/60 text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-[13.5px] leading-6">{m.content}</p>
                <p
                  className={`mt-1 text-right text-[11px] tabular-nums ${
                    m.role === "client" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {m.role === "owner" ? "Prestataire · " : ""}
                  {timeFmt.format(new Date(m.createdAt))}
                </p>
              </div>
            </div>
          ))
        )}
        {thread?.status === "closed" && messages.length > 0 && (
          <p className="text-center text-[12px] text-muted-foreground">
            Fil clôturé par le prestataire — écrivez de nouveau pour le rouvrir.
          </p>
        )}
      </div>

      {/* Composition */}
      <form
        className="border-t border-border bg-muted/30 px-4 py-4 sm:px-5"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="provider-chat-input" className="sr-only">
          Votre message au prestataire
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
          <textarea
            id="provider-chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Ctrl/Cmd + Entrée = envoi rapide (frappe multi-lignes préservée).
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={3}
            maxLength={4000}
            placeholder="Votre question au prestataire (Commande CMD-…, livrable, délai…)"
            className="min-w-0 flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-[13.5px] leading-6 outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          <Button
            type="submit"
            disabled={sending || text.trim().length < 5}
            className="h-11 shrink-0 gap-2 rounded-2xl font-semibold sm:h-auto sm:self-stretch"
            aria-label="Envoyer le message au prestataire"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sm:hidden">Envoyer au prestataire</span>
            <span className="hidden sm:inline">Envoyer</span>
          </Button>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-4 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Réponse humaine personnalisée, généralement sous 4 h. Historique conservé
          dans votre espace — Ctrl + Entrée pour envoyer.
        </p>
      </form>
    </div>
  );
}

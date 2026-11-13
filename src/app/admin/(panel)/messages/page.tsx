"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CornerDownRight,
  Hash,
  Loader2,
  Mail,
  MessagesSquare,
  RefreshCcw,
  Send,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiGet, apiSend } from "@/components/admin/api";
import { AdminPageHeader } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

/**
 * « Messages clients » (v2.2.0, routage par question v2.5.0) — boîte de
 * réception du support humain.
 *
 * Chaque question d'un client arrive ici avec sa ROUTE UNIQUE (code
 * Q-XXXXXX) ; l'email d'alerte au support contient un lien direct
 * /admin/messages?thread=<id> qui ouvre CE fil précis.
 *
 * Répondre : cliquer une question la CIBLE (replyTo) — la réponse part vers
 * le client du fil, avec l'objet « Réponse à votre question Q-XXXXXX ». Le
 * serveur valide que la question ciblée appartient bien au fil affiché :
 * un client ne peut jamais recevoir la réponse d'un autre.
 */

interface ThreadRow {
  id: string;
  email: string;
  name: string | null;
  status: "open" | "closed" | string;
  unreadForOwner: number;
  lastMessageAt: string;
  messageCount: number;
  lastMessage: { role: "client" | "owner"; excerpt: string; createdAt: string } | null;
}

interface ThreadsResponse {
  unreadTotal: number;
  openThreads: number;
  threads: ThreadRow[];
}

interface ThreadMessage {
  id: string;
  role: "client" | "owner";
  content: string;
  createdAt: string;
  reference?: string | null;
}

interface ThreadDetail {
  thread: {
    id: string;
    email: string;
    name: string | null;
    status: "open" | "closed" | string;
    createdAt: string;
    messages: ThreadMessage[];
  };
}

const dtFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function relative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return dtFmt.format(new Date(iso));
}

export default function AdminMessagesPage() {
  const [list, setList] = useState<ThreadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ThreadDetail["thread"] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  /** Question ciblée par la réponse en cours (null = dernière question du fil). */
  const [replyTarget, setReplyTarget] = useState<ThreadMessage | null>(null);
  const deepLinkDone = useRef(false);

  const load = useCallback(async () => {
    try {
      const d = await apiGet<ThreadsResponse>("/api/admin/support");
      setList(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  const open = useCallback(async (threadId: string) => {
    setLoadingDetail(true);
    setReplyTarget(null);
    try {
      const d = await apiGet<ThreadDetail>(`/api/admin/support/${threadId}`);
      setDetail(d.thread);
      // La lecture remet le compteur du fil à zéro : reflète-le localement.
      setList((prev) =>
        prev
          ? {
              ...prev,
              unreadTotal: Math.max(
                0,
                prev.unreadTotal -
                  (prev.threads.find((t) => t.id === threadId)?.unreadForOwner ?? 0),
              ),
              threads: prev.threads.map((t) =>
                t.id === threadId ? { ...t, unreadForOwner: 0 } : t
              ),
            }
          : prev
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversation introuvable");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Lien direct depuis l'email d'alerte : /admin/messages?thread=<id>
  // (lecture via window.location — pas de useSearchParams, donc aucun
  // périmètre Suspense à ajouter pour le prérendu).
  useEffect(() => {
    if (deepLinkDone.current) return;
    deepLinkDone.current = true;
    const threadId = new URLSearchParams(window.location.search).get("thread");
    if (threadId) void open(threadId);
  }, [open]);

  async function sendReply() {
    if (!detail || sending) return;
    const message = reply.trim();
    if (message.length < 2) {
      toast.error("La réponse est trop courte.");
      return;
    }
    setSending(true);
    try {
      const res = await apiSend<{ ok: boolean; emailSent: boolean; questionRef: string | null }>(
        `/api/admin/support/${detail.id}`,
        "POST",
        { message, replyTo: replyTarget?.id ?? undefined }
      );
      setReply("");
      setReplyTarget(null);
      await open(detail.id);
      await load();
      toast.success(
        res.emailSent
          ? res.questionRef
            ? `Réponse envoyée au client par email (question ${res.questionRef}).`
            : "Réponse enregistrée et transmise au client par email."
          : "Réponse enregistrée — visible dans l'espace client (email non envoyé : SMTP absent)."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    if (!detail || statusBusy) return;
    setStatusBusy(true);
    const next = detail.status === "closed" ? "open" : "closed";
    try {
      await apiSend(`/api/admin/support/${detail.id}`, "PATCH", { status: next });
      setDetail({ ...detail, status: next });
      setList((prev) =>
        prev
          ? { ...prev, threads: prev.threads.map((t) => (t.id === detail.id ? { ...t, status: next } : t)) }
          : prev
      );
      toast.success(next === "closed" ? "Fil clôturé." : "Fil réouvert.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Messages clients"
        description="Chaque question porte une route unique (code Q-XXXXXX) et notifie le support par email urgent — cliquez une question pour y répondre précisément : le client la reçoit par email, personne d'autre."
        icon={<MessagesSquare className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground">
        {list && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
            <Mail className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {list.unreadTotal} non lu{list.unreadTotal > 1 ? "s" : ""} · {list.openThreads} fil
            {list.openThreads > 1 ? "s" : ""} ouvert{list.openThreads > 1 ? "s" : ""}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            void load();
            if (detail) void open(detail.id);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-medium transition-colors hover:border-primary/40 hover:text-primary"
          aria-label="Actualiser les messages"
        >
          <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Actualiser
        </button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,360px),minmax(0,1fr)]">
        {/* Liste des fils */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/50 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Conversations
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="text-[13px]">Chargement…</span>
              </div>
            ) : !list || list.threads.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[13.5px] font-semibold">Aucun message pour l&apos;instant</p>
                <p className="mx-auto mt-1.5 max-w-xs text-[12.5px] leading-5 text-muted-foreground">
                  Les questions des clients (espace « Contacter le support humain ») apparaîtront
                  ici, avec une notification par email.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {list.threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => void open(t.id)}
                      aria-current={detail?.id === t.id ? "true" : undefined}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                        detail?.id === t.id ? "bg-accent/60" : ""
                      }`}
                      aria-label={`Ouvrir la conversation avec ${t.email}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                          {t.name ?? t.email}
                        </span>
                        {t.unreadForOwner > 0 && (
                          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                            {t.unreadForOwner > 9 ? "9+" : t.unreadForOwner}
                          </span>
                        )}
                        {t.status === "closed" && (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-600"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <span className="truncate text-[11.5px] text-muted-foreground">{t.email}</span>
                      {t.lastMessage && (
                        <span className="line-clamp-2 text-[12.5px] leading-5 text-muted-foreground">
                          {t.lastMessage.role === "owner" ? "Vous : " : ""}
                          {t.lastMessage.excerpt}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {relative(t.lastMessageAt)} · {t.messageCount} message
                        {t.messageCount > 1 ? "s" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Conversation sélectionnée */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {!detail ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <MessagesSquare className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
              <p className="text-[13.5px] font-semibold">Sélectionnez une conversation</p>
              <p className="max-w-xs text-[12.5px] leading-5 text-muted-foreground">
                La réponse part vers le client du fil sélectionné, avec la référence de sa
                question — aucun croisement possible.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-muted/50 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <UserRound className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold">
                    {detail.name ?? detail.email}
                    {detail.status === "closed" && (
                      <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-600">
                        clôturé
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{detail.email}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void toggleStatus()}
                  disabled={statusBusy}
                  className="gap-1.5"
                  aria-label={detail.status === "closed" ? "Réouvrir le fil" : "Clôturer le fil"}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {detail.status === "closed" ? "Réouvrir" : "Clôturer"}
                </Button>
              </div>

              {loadingDetail ? (
                <div className="flex items-center justify-center gap-2 px-4 py-12 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span className="text-[13px]">Chargement de la conversation…</span>
                </div>
              ) : (
                <div
                  className="max-h-[380px] space-y-3 overflow-y-auto px-4 py-4"
                  role="log"
                  aria-label={`Conversation avec ${detail.email}`}
                  aria-live="polite"
                >
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.role === "owner" ? "justify-end" : "justify-start"}`}
                    >
                      {/* Question client : cliquable → devient la cible de la réponse. */}
                      <div
                        className={
                          m.role === "client"
                            ? "max-w-[85%] cursor-pointer rounded-2xl rounded-bl-md border bg-muted/50 transition-colors aria-selected:border-primary/60 aria-selected:bg-accent/50"
                            : "max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                        }
                        {...(m.role === "client" && {
                          role: "button",
                          tabIndex: 0,
                          "aria-selected": replyTarget?.id === m.id,
                          "aria-label": `Cibler la réponse sur la question ${m.reference ?? m.id}`,
                          onClick: () => setReplyTarget(m),
                          onKeyDown: (e: React.KeyboardEvent) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setReplyTarget(m);
                            }
                          },
                        })}
                      >
                        <div
                          className={cn(
                            "px-3.5 py-2.5",
                            m.role === "client" &&
                              replyTarget?.id === m.id &&
                              "ring-1 ring-primary/50 rounded-2xl"
                          )}
                        >
                          {m.reference && (
                            <p
                              className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold tracking-wide ${
                                m.role === "client"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-primary-foreground/15 text-primary-foreground/90"
                              }`}
                            >
                              <Hash className="h-3 w-3" aria-hidden="true" />
                              {m.reference}
                            </p>
                          )}
                          <p
                            className={`whitespace-pre-wrap break-words text-[13px] leading-6 ${
                              m.role === "owner" ? "" : "text-foreground"
                            }`}
                          >
                            {m.content}
                          </p>
                          <p
                            className={`mt-1 text-right text-[10.5px] tabular-nums ${
                              m.role === "owner" ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {m.role === "owner" ? "Support · " : "Client · "}
                            {dtFmt.format(new Date(m.createdAt))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form
                className="border-t border-border bg-muted/30 px-4 py-3.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendReply();
                }}
              >
                {/* Cible de réponse : toujours visible, jamais ambiguë. */}
                <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                  <CornerDownRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {replyTarget ? (
                    <>
                      Répond à la question{" "}
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                        {replyTarget.reference ?? replyTarget.id.slice(0, 8)}
                      </span>{" "}
                      de {detail.name ?? detail.email}
                      <button
                        type="button"
                        onClick={() => setReplyTarget(null)}
                        className="ml-1 rounded-full px-1.5 text-[11px] text-muted-foreground underline decoration-dotted hover:text-foreground"
                      >
                        détacher
                      </button>
                    </>
                  ) : (
                    <>Réponse à la dernière question de {detail.name ?? detail.email} — cliquez une question pour la cibler.</>
                  )}
                </p>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
                  <label htmlFor="admin-reply" className="sr-only">
                    Votre réponse au client {detail.email}
                  </label>
                  <textarea
                    id="admin-reply"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                    rows={3}
                    maxLength={4000}
                    placeholder="Votre réponse au client (envoyée par email avec la référence de sa question, et visible dans son espace)…"
                    className="min-w-0 flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-[13px] leading-6 outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="submit"
                    disabled={sending || reply.trim().length < 2}
                    className="h-11 shrink-0 gap-2 rounded-2xl font-semibold sm:h-auto sm:self-stretch"
                    aria-label="Envoyer la réponse au client"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span className="sm:hidden">Envoyer au client</span>
                    <span className="hidden sm:inline">Répondre</span>
                  </Button>
                </div>
                <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                  Envoi exclusif à ce client (email filaire + espace). Ctrl + Entrée pour envoyer.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

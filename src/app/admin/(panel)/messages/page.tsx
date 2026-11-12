"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
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

/**
 * « Messages clients » (v2.2.0) — boîte de réception du propriétaire-prestataire.
 *
 * Chaque question posée par un client dans son espace (/account) arrive ici :
 *   • email URGENT envoyé au propriétaire au moment de la question ;
 *   • badge de non-lus dans la navigation (interrogé toutes les 45 s) ;
 *   • cette page liste les fils, les affiche (lecture = remise à zéro du
 *     compteur), permet d'y répondre (réponse aussi transmise par email au
 *     client) et de clôturer/réouvrir chaque fil.
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

interface ThreadDetail {
  thread: {
    id: string;
    email: string;
    name: string | null;
    status: "open" | "closed" | string;
    createdAt: string;
    messages: { id: string; role: "client" | "owner"; content: string; createdAt: string }[];
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

  useEffect(() => {
    void load();
  }, [load]);

  async function open(threadId: string) {
    setLoadingDetail(true);
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
  }

  async function sendReply() {
    if (!detail || sending) return;
    const message = reply.trim();
    if (message.length < 2) {
      toast.error("La réponse est trop courte.");
      return;
    }
    setSending(true);
    try {
      const res = await apiSend<{ ok: boolean; emailSent: boolean }>(
        `/api/admin/support/${detail.id}`,
        "POST",
        { message }
      );
      setReply("");
      await open(detail.id);
      await load();
      toast.success(
        res.emailSent
          ? "Réponse enregistrée et transmise au client par email."
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
        description="Questions posées au prestataire humain : chaque question notifie le propriétaire par email urgent — répondez ici, le client est prévenu par email et dans son espace."
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
                  Les questions des clients (espace « Discuter avec le prestataire ») apparaîtront
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
                La réponse du prestataire est envoyée au client par email et reste visible dans
                son espace client.
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
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                          m.role === "owner"
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border bg-muted/50"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-[13px] leading-6">
                          {m.content}
                        </p>
                        <p
                          className={`mt-1 text-right text-[10.5px] tabular-nums ${
                            m.role === "owner" ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {m.role === "owner" ? "Vous · " : "Client · "}
                          {dtFmt.format(new Date(m.createdAt))}
                        </p>
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
                    placeholder="Votre réponse au client (envoyée par email et visible dans son espace)…"
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
                  Réponse signée « prestataire » : email au client + historique conservé dans son
                  espace. Ctrl + Entrée pour envoyer.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

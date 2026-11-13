"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  CreditCard,
  FileCheck2,
  Hourglass,
  Loader2,
  MessageCircle,
  PackageCheck,
  PenLine,
  Send,
  ShieldCheck,
  ShoppingBag,
  Star,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OrderCountdown } from "@/components/site/account/order-countdown";
import { API_ROUTES, ORDER_PAYMENT_STATUS, ORDER_STAGES, orderActionUrl } from "@/lib/contracts";
import { cn } from "@/lib/utils";

/**
 * OrderCard — carte de commande structurée pour l'espace client (v2.5.0).
 *
 * Conçue mobile d'abord, desktop ensuite :
 *   • en-tête : référence mono + badge de paiement (statut séquestre) ;
 *   • corps : fiche du service (lien), options choisies, méta (date, délai,
 *     montant) ;
 *   • LIGNE DE VIE à quatre jalons (payée → production/modification → livrée
 *     → validée) : le client sait TOUJOURS où en est sa commande ;
 *   • compte à rebours de livraison avec barre de progression (100 % =
 *     échéance promise), horodaté côté client au montage — jamais d'écart
 *     d'hydratation ;
 *   • actions contextuelles (v2.5.0) : demander une modification, valider la
 *     livraison (libère les fonds), laisser un avis et une note après
 *     validation.
 */

export interface OrderCardDTO {
  /** Id Prisma du service — l'avis lié à la commande le cible. */
  serviceId: string;
  reference: string;
  serviceSlug: string;
  serviceTitle: string;
  optionLabels: string[];
  createdAt: string;
  paidAt: string | null;
  deliveryDays: number;
  total: number;
  currency: string;
  paymentStatus: string;
  paymentProvider: string;
  stage: string;
  deliveredAt: string | null;
  releasedAt: string | null;
  revisionCount: number;
  lastRevision: { reason: string; status: string; createdAt: string } | null;
  hasReview: boolean;
  /** Nom du client (session) — préremplit l'avis. */
  clientName: string | null;
}

const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PAID: { label: "Payée — fonds séquestrés", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  CREATED: { label: "En attente de paiement", className: "border-amber-300 bg-amber-50 text-amber-800" },
  FAILED: { label: "Paiement non abouti", className: "border-red-300 bg-red-50 text-red-700" },
  REFUNDED: { label: "Remboursée", className: "border-border bg-muted text-muted-foreground" },
};

const dtFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

const COUNTRIES = [
  "France", "Belgique", "Suisse", "Canada (Québec)", "Sénégal", "Côte d'Ivoire",
  "Cameroun", "Maroc", "Tunisie", "RD Congo", "Bénin", "Togo", "Gabon",
  "Burkina Faso", "Mali", "Guinée", "Luxembourg", "Autre",
];

/** Jalon de la ligne de vie. */
function Milestone({
  icon,
  label,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  state: "done" | "active" | "todo";
}) {
  return (
    <li aria-current={state === "active" ? "step" : undefined} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full border transition-colors",
          state === "done" && "border-primary bg-primary text-primary-foreground",
          state === "active" && "border-primary bg-accent text-primary ring-2 ring-primary/25",
          state === "todo" && "border-border bg-muted/50 text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "text-[10.5px] leading-3.5 font-semibold",
          state === "todo" ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {label}
      </span>
    </li>
  );
}

export function OrderCard({ order }: { order: OrderCardDTO }) {
  const router = useRouter();
  const paid = order.paymentStatus === ORDER_PAYMENT_STATUS.PAID;
  const stage = order.stage;

  const [revOpen, setRevOpen] = useState(false);
  const [revReason, setRevReason] = useState("");
  const [revBusy, setRevBusy] = useState(false);
  const [validOpen, setValidOpen] = useState(false);
  const [validBusy, setValidBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [authorName, setAuthorName] = useState(order.clientName ?? "");
  const [country, setCountry] = useState("France");
  const [comment, setComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  // Échéance promise : paidAt + délai — sous forme de MILLISECONDES
  // primitives (stables entre rendus : un new Date() à chaque rendu
  // ferait changer les dépendances d'effet et boucler en re-rendus).
  const paidAtMs = order.paidAt ? Date.parse(order.paidAt) : null;
  const deliveryAtMs = useMemo(
    () => (paid && paidAtMs !== null ? paidAtMs + order.deliveryDays * 86_400_000 : null),
    [paid, paidAtMs, order.deliveryDays],
  );

  // Progression du délai (0 → 1) : calculée APRÈS montage (hydration sûre).
  const [progress, setProgress] = useState<number | null>(null);
  useEffect(() => {
    if (paidAtMs === null || deliveryAtMs === null) return;
    const span = deliveryAtMs - paidAtMs;
    const tick = () => {
      setProgress(Math.min(1, Math.max(0, (Date.now() - paidAtMs) / span)));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [paidAtMs, deliveryAtMs]);

  /* ── Action : demander une modification ─────────────────────────────────── */
  const submitRevision = useCallback(async () => {
    const reason = revReason.trim();
    if (revBusy || reason.length < 15) {
      if (reason.length < 15 && !revBusy) {
        toast.error("Décrivez la modification souhaitée (15 caractères minimum).");
      }
      return;
    }
    setRevBusy(true);
    try {
      const res = await fetch(orderActionUrl(order.reference, "revision"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Demande impossible");
      setRevOpen(false);
      setRevReason("");
      toast.success("Demande envoyée : le support est alerté et le prestataire notifié.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Demande impossible pour le moment.");
    } finally {
      setRevBusy(false);
    }
  }, [revBusy, revReason, order.reference, router]);

  /* ── Action : valider la livraison (libère les fonds) ─────────────────────── */
  const submitValidation = useCallback(async () => {
    if (validBusy) return;
    setValidBusy(true);
    try {
      const res = await fetch(orderActionUrl(order.reference, "validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Validation impossible");
      setValidOpen(false);
      toast.success(
        "Livraison validée : les fonds sont libérés au prestataire. Merci de laisser un avis !",
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation impossible pour le moment.");
    } finally {
      setValidBusy(false);
    }
  }, [validBusy, order.reference, router]);

  /* ── Action : publier l'avis lié à la commande ───────────────────────────── */
  const submitReview = useCallback(async () => {
    const c = comment.trim();
    if (reviewBusy) return;
    if (c.length < 15) {
      toast.error("Votre avis doit contenir au moins 15 caractères pour aider les futurs clients.");
      return;
    }
    if (authorName.trim().length < 2) {
      toast.error("Indiquez un nom ou pseudo (2 caractères minimum).");
      return;
    }
    setReviewBusy(true);
    try {
      const res = await fetch(API_ROUTES.reviews, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: order.serviceId,
          authorName,
          country,
          rating,
          comment: c,
          orderReference: order.reference,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Publication impossible");
      setReviewOpen(false);
      toast.success("Merci ! Votre note et votre avis sont publiés sur la fiche du service.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publication impossible pour le moment.");
    } finally {
      setReviewBusy(false);
    }
  }, [reviewBusy, comment, authorName, country, rating, order.reference, order.serviceId, router]);

  const st = PAYMENT_STATUS_LABELS[order.paymentStatus] ?? {
    label: order.paymentStatus,
    className: "border-border bg-muted text-muted-foreground",
  };

  const canRequestRevision =
    paid && (stage === ORDER_STAGES.PRODUCTION || stage === ORDER_STAGES.REVISION || stage === ORDER_STAGES.DELIVERED);
  const canValidate = paid && stage === ORDER_STAGES.DELIVERED;
  const canReview = paid && stage === ORDER_STAGES.COMPLETED && !order.hasReview;

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* ── En-tête : référence + statut de paiement ──────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/70 bg-muted/30 px-4 py-2.5 sm:px-5">
        <span className="font-mono text-[11.5px] font-semibold tracking-wide text-muted-foreground">
          {order.reference}
        </span>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold",
            st.className,
          )}
        >
          {st.label}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        {/* ── Corps : service, options, méta ───────────────────────────────── */}
        <div>
          <Link
            href={`/services/${order.serviceSlug}`}
            className="text-[15px] font-semibold leading-snug hover:text-primary hover:underline"
          >
            {order.serviceTitle}
          </Link>
          {order.optionLabels.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {order.optionLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </p>
          )}
          <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-4">
            <div className="flex items-center gap-1.5 min-w-0">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <dd className="truncate text-muted-foreground" title={dtFmt.format(new Date(order.createdAt))}>
                {dtFmt.format(new Date(order.createdAt))}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <dd className="text-muted-foreground">
                Livraison {order.deliveryDays} j
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <dd className="tabular-nums font-semibold text-foreground">
                {order.total.toLocaleString("fr-FR")} €
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <dd className="text-muted-foreground">
                {order.paymentProvider === "paypal" ? "PayPal" : "Démo"}
              </dd>
            </div>
          </dl>
        </div>

        {/* ── Ligne de vie (commandes payées uniquement) ───────────────────── */}
        {paid && (
          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3">
            <ol className="flex items-start gap-1" aria-label="Progression de la commande">
              <Milestone icon={<CreditCard className="h-3.5 w-3.5" aria-hidden="true" />} label="Payée" state="done" />
              <span aria-hidden="true" className="mt-3.5 h-0.5 flex-1 rounded bg-primary/25" />
              <Milestone
                icon={
                  stage === ORDER_STAGES.REVISION ? (
                    <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  )
                }
                label={stage === ORDER_STAGES.REVISION ? "Modification" : "Production"}
                state={stage === ORDER_STAGES.REVISION || stage === ORDER_STAGES.PRODUCTION ? "active" : "done"}
              />
              <span aria-hidden="true" className="mt-3.5 h-0.5 flex-1 rounded bg-primary/25" />
              <Milestone
                icon={<PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Livrée"
                state={stage === ORDER_STAGES.DELIVERED ? "active" : stage === ORDER_STAGES.COMPLETED ? "done" : "todo"}
              />
              <span aria-hidden="true" className="mt-3.5 h-0.5 flex-1 rounded bg-primary/25" />
              <Milestone
                icon={<BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                label="Validée"
                state={stage === ORDER_STAGES.COMPLETED ? "done" : "todo"}
              />
            </ol>
          </div>
        )}

        {/* ── Compte à rebours / situation courante ───────────────────────── */}
        {paid && stage === ORDER_STAGES.PRODUCTION && deliveryAtMs !== null && (
          <div className="space-y-2 rounded-xl border border-primary/25 bg-accent/40 px-3.5 py-3">
            <OrderCountdown deliveryAt={new Date(deliveryAtMs).toISOString()} />
            {progress !== null && (
              <div
                className="h-1.5 overflow-hidden rounded-full bg-primary/15"
                role="progressbar"
                aria-label="Progression du délai de livraison"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-[width] duration-500"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {paid && stage === ORDER_STAGES.REVISION && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-amber-900">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <PenLine className="h-4 w-4 shrink-0" aria-hidden="true" />
              Modification en traitement
              {order.revisionCount > 1 ? ` (demande n°${order.revisionCount})` : ""}
            </p>
            {order.lastRevision && (
              <p className="mt-1 line-clamp-2 text-[12px] leading-5 opacity-80">
                Votre demande du {dayFmt.format(new Date(order.lastRevision.createdAt))} : « {order.lastRevision.reason.slice(0, 160)}{order.lastRevision.reason.length > 160 ? "…" : ""} »
              </p>
            )}
            <p className="mt-1 text-[11.5px] opacity-70">
              Le support est alerté : le prestataire ajuste le livrable, le délai reprend à la remise.
            </p>
          </div>
        )}

        {paid && stage === ORDER_STAGES.DELIVERED && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-3 text-emerald-800">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <PackageCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Livrable prêt
              {order.deliveredAt ? ` depuis le ${dayFmt.format(new Date(order.deliveredAt))}` : ""}
            </p>
            <p className="mt-1 text-[12px] leading-5 opacity-80">
              Vérifiez le travail puis validez : votre validation libère le paiement du prestataire.
              Un défaut subsiste ? Demandez une modification avant de valider.
            </p>
          </div>
        )}

        {paid && stage === ORDER_STAGES.COMPLETED && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 px-3.5 py-3 text-emerald-800">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Commande terminée
              {order.releasedAt ? ` — paiement libéré le ${dayFmt.format(new Date(order.releasedAt))}` : ""}
            </p>
            {order.hasReview ? (
              <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium opacity-90">
                <ThumbsUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Votre note et votre avis sont publiés — merci !
              </p>
            ) : (
              <p className="mt-1 text-[12px] opacity-80">
                Votre note aidera les prochains clients à choisir ce prestataire.
              </p>
            )}
          </div>
        )}

        {/* ── Actions contextuelles ───────────────────────────────────────── */}
        {(canRequestRevision || canValidate || canReview) && (
          <div className="flex flex-wrap gap-2">
            {canValidate && (
              <Button
                onClick={() => setValidOpen(true)}
                className="h-10 gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 px-4 text-[13px] font-bold text-white shadow-sm hover:shadow-md"
              >
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                Valider la livraison
              </Button>
            )}
            {canReview && (
              <Button
                onClick={() => setReviewOpen(true)}
                variant="outline"
                className="h-10 gap-2 rounded-full border-primary/40 px-4 text-[13px] font-semibold text-primary hover:bg-accent"
              >
                <Star className="h-4 w-4" aria-hidden="true" />
                Laisser une note et un avis
              </Button>
            )}
            {canRequestRevision && (
              <Button
                onClick={() => setRevOpen(true)}
                variant="outline"
                className="h-10 gap-2 rounded-full px-4 text-[13px] font-semibold hover:bg-accent"
              >
                <PenLine className="h-4 w-4" aria-hidden="true" />
                Demander une modification
              </Button>
            )}
            <Button
              asChild
              variant="ghost"
              className="h-10 gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
            >
              <Link href="/account#support-humain">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Une question ?
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* ── Dialogue : demande de modification ───────────────────────────────── */}
      <Dialog open={revOpen} onOpenChange={setRevOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-primary" aria-hidden="true" />
              Demander une modification
            </DialogTitle>
            <DialogDescription>
              {order.serviceTitle} · {order.reference}. Décrivez précisément l&apos;ajustement
              attendu : le support est alerté immédiatement et le prestataire notifié — les fonds
              restent séquestrés jusqu&apos;à votre validation.
            </DialogDescription>
          </DialogHeader>
          <form
            className="mt-1 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submitRevision();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor={`rev-${order.reference}`}>La modification souhaitée</Label>
              <Textarea
                id={`rev-${order.reference}`}
                value={revReason}
                onChange={(e) => setRevReason(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Ex : ajouter le volet « fournisseurs européens » au tableau livré, corriger la mise en page du rapport…"
                autoFocus
              />
              <p className="text-right text-[11px] text-muted-foreground">
                {revReason.trim().length}/2000 — 15 caractères minimum
              </p>
            </div>
            <Button
              type="submit"
              disabled={revBusy || revReason.trim().length < 15}
              className="h-11 w-full gap-2 rounded-full font-semibold"
            >
              {revBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {revBusy ? "Envoi…" : "Envoyer la demande"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation : validation de la livraison ──────────────────────── */}
      <AlertDialog open={validOpen} onOpenChange={setValidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" aria-hidden="true" />
              Valider la livraison ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {order.serviceTitle} · {order.reference}. Vous confirmez que le livrable est
                  conforme à la commande.
                </p>
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
                  Cette validation libère les fonds séquestrés ({order.total.toLocaleString("fr-FR")} €)
                  au prestataire. Elle est définitive : pour un défaut, préférez d&apos;abord
                  « Demander une modification ».
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={validBusy}>Pas encore</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void submitValidation();
              }}
              disabled={validBusy}
              className="gap-1.5 font-semibold"
            >
              {validBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Valider et libérer le paiement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialogue : note et avis après validation ──────────────────────── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" aria-hidden="true" />
              Votre note et votre avis
            </DialogTitle>
            <DialogDescription>
              Commande {order.reference} · {order.serviceTitle}. Publié sur la fiche du service —
              votre retour guide les prochains clients francophones.
            </DialogDescription>
          </DialogHeader>
          <form
            className="mt-1 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitReview();
            }}
          >
            <div className="space-y-1.5">
              <Label>Votre note</Label>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Note de 1 à 5 étoiles">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={rating === v}
                    aria-label={`${v} étoile${v > 1 ? "s" : ""}`}
                    onMouseEnter={() => setHover(v)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(v)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-7 w-7 transition-colors",
                        v <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
                      )}
                    />
                  </button>
                ))}
                <span className="ml-2 text-[14px] font-semibold">
                  {rating.toString().replace(".", ",")}/5
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`rv-name-${order.reference}`}>Votre nom / pseudo</Label>
                <Input
                  id={`rv-name-${order.reference}`}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Ex : Marc D."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`rv-country-${order.reference}`}>Votre pays</Label>
                <select
                  id={`rv-country-${order.reference}`}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[13.5px] shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`rv-comment-${order.reference}`}>Votre expérience</Label>
              <Textarea
                id={`rv-comment-${order.reference}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={1200}
                placeholder="Qualité du livrable, respect des délais, communication…"
                required
              />
              <p className="text-right text-[11px] text-muted-foreground">
                {comment.trim().length}/1200 — 15 caractères minimum
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={reviewBusy || comment.trim().length < 15}
                className="h-11 flex-1 gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 text-[14px] font-bold text-white"
              >
                {reviewBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                )}
                {reviewBusy ? "Publication…" : "Publier mon avis"}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost" className="rounded-full">
                  Plus tard
                </Button>
              </DialogClose>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </li>
  );
}

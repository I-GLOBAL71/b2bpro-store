"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Clock,
  Loader2,
  PackageCheck,
  PackageSearch,
  PenLine,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiGet, apiSend } from "@/components/admin/api";
import { AdminPageHeader } from "@/components/admin/fields";
import { OrderCountdown } from "@/components/site/account/order-countdown";
import { adminOrderActionUrl, type AdminOrderRow } from "@/lib/contracts";
import { cn } from "@/lib/utils";

/**
 * « Commandes » (v2.5.0) — pilotage support du cycle de vie.
 *
 * Le support voit ici les commandes payées avec leur étape (production,
 * modification demandée, livrée, validée) et le geste décisif « Marquer
 * livré » : il ouvre chez le client la phase de validation qui libère les
 * fonds au prestataire (email automatique au client + compte à rebours de
 * validation dans son espace).
 */

interface OrdersResponse {
  orders: AdminOrderRow[];
  counts: {
    total: number;
    paid: number;
    inProduction: number;
    inRevision: number;
    delivered: number;
    completed: number;
  };
}

const PAYMENT_LABELS: Record<string, { label: string; className: string }> = {
  PAID: { label: "Payée", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  CREATED: { label: "Non payée", className: "border-amber-300 bg-amber-50 text-amber-800" },
  FAILED: { label: "Échec", className: "border-red-300 bg-red-50 text-red-700" },
  REFUNDED: { label: "Remboursée", className: "border-border bg-muted text-muted-foreground" },
};

const STAGE_LABELS: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  production: {
    label: "En production",
    className: "border-sky-300 bg-sky-50 text-sky-800",
    icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  revision: {
    label: "Modification demandée",
    className: "border-amber-400 bg-amber-50 text-amber-900",
    icon: <PenLine className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  delivered: {
    label: "Livrée — validation attendue",
    className: "border-emerald-400 bg-emerald-50 text-emerald-800",
    icon: <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  completed: {
    label: "Validée — fonds libérés",
    className: "border-emerald-600 bg-emerald-100 text-emerald-900",
    icon: <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />,
  },
};

const dtFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function AdminOrdersPage() {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyRef, setBusyRef] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiGet<OrdersResponse>("/api/admin/orders");
      setData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  async function deliver(reference: string) {
    if (busyRef) return;
    setBusyRef(reference);
    try {
      const res = await apiSend<{ ok: boolean; emailSent: boolean; stage: string }>(
        adminOrderActionUrl(reference, "deliver"),
        "POST",
      );
      toast.success(
        res.emailSent
          ? `Commande ${reference} livrée — email de validation envoyé au client.`
          : `Commande ${reference} livrée (email client non envoyé : SMTP absent).`,
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setBusyRef(null);
    }
  }

  const counts = data?.counts;

  return (
    <div>
      <AdminPageHeader
        title="Commandes"
        description="Cycle de vie des prestations : marquez « livré » quand le prestataire a rendu le travail — le client reçoit un email puis valide, ce qui libère les fonds au prestataire."
        icon={<ShoppingCart className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px]">
        {counts && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
            <PackageSearch className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {counts.total} total · {counts.inProduction} en production ·{" "}
            {counts.inRevision} en modification · {counts.delivered} à valider ·{" "}
            {counts.completed} terminées
          </span>
        )}
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          aria-label="Actualiser les commandes"
        >
          <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="text-[13px]">Chargement des commandes…</span>
        </div>
      ) : !data || data.orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
          <p className="text-[14px] font-semibold">Aucune commande pour l&apos;instant</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-muted-foreground">
            Les commandes (voie démo et PayPal) apparaîtront ici avec leur étape de production,
            pour être marquées livrées au bon moment.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {data.orders.map((o) => {
            const pay = PAYMENT_LABELS[o.paymentStatus] ?? {
              label: o.paymentStatus,
              className: "border-border bg-muted text-muted-foreground",
            };
            const stageInfo = STAGE_LABELS[o.stage] ?? STAGE_LABELS.production;
            const isPaid = o.paymentStatus === "PAID";
            const canDeliver =
              isPaid && (o.stage === "production" || o.stage === "revision");
            const deliveryAt =
              isPaid && o.paidAt
                ? new Date(new Date(o.paidAt).getTime() + o.deliveryDays * 86_400_000)
                : null;

            return (
              <li
                key={o.id}
                className="flex flex-wrap items-start gap-x-6 gap-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                    <Link
                      href={`/services/${o.serviceSlug}`}
                      className="hover:text-primary hover:underline"
                    >
                      {o.serviceTitle}
                    </Link>
                    <span className="font-mono text-[11.5px] text-muted-foreground">
                      {o.reference}
                    </span>
                    {o.hasReview && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
                        avis publié
                      </span>
                    )}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                    <span className="tabular-nums font-semibold text-foreground">
                      {o.total.toLocaleString("fr-FR")} €
                    </span>
                    <span className="truncate">{o.clientEmail}</span>
                    <span>{dtFmt.format(new Date(o.createdAt))}</span>
                    {o.paidAt && <span>payée le {dtFmt.format(new Date(o.paidAt))}</span>}
                  </p>
                  {o.lastRevision && (
                    <p className="mt-1.5 line-clamp-2 rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1.5 text-[11.5px] leading-4 text-amber-900">
                      Modification ({o.lastRevision.status === "resolved" ? "traitée" : "en attente"}) :
                      « {o.lastRevision.reason.slice(0, 140)}{o.lastRevision.reason.length > 140 ? "…" : ""} »
                    </p>
                  )}
                  {deliveryAt && o.stage !== "completed" && o.stage !== "delivered" && (
                    <p className="mt-2.5">
                      <OrderCountdown deliveryAt={deliveryAt.toISOString()} />
                    </p>
                  )}
                </div>
                <div className="flex w-full flex-col items-end gap-2 sm:w-auto sm:items-end">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold",
                      pay.className,
                    )}
                  >
                    {pay.label}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold",
                      stageInfo.className,
                    )}
                  >
                    {stageInfo.icon}
                    {stageInfo.label}
                  </span>
                  {canDeliver && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void deliver(o.reference)}
                      disabled={busyRef === o.reference}
                      className="gap-1.5 rounded-full font-semibold"
                    >
                      {busyRef === o.reference ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Marquer livré
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

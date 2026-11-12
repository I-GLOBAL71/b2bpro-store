import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  CalendarDays,
  Clock,
  CreditCard,
  LogIn,
  MessageCircle,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderCountdown } from "@/components/site/account/order-countdown";
import { ProviderChat } from "@/components/site/account/provider-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon compte et mes commandes | b2bpro.store",
  description: "Suivez vos commandes b2bpro.store, leurs statuts et vos livraisons.",
  robots: { index: false, follow: false },
};

/** Libellés FR des statuts de paiement. */
const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PAID: { label: "Payée — fonds séquestrés", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  CREATED: { label: "En attente de paiement", className: "border-amber-300 bg-amber-50 text-amber-800" },
  FAILED: { label: "Paiement non abouti", className: "border-red-300 bg-red-50 text-red-700" },
  REFUNDED: { label: "Remboursée", className: "border-border bg-muted text-muted-foreground" },
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  // ── Visiteur non connecté : invitation claire, aucune zone vide ──────────
  if (!email) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-card p-8 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Espace client b2bpro.store</h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-muted-foreground">
            Connectez-vous avec Google ou votre email pour suivre vos commandes,
            leurs statuts de paiement et vos livraisons — sans mot de passe à retenir.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[12.5px] font-medium text-accent-foreground">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Cliquez sur « Se connecter » en haut de page
          </p>
          <Button asChild variant="outline" className="mt-6 rounded-full border-primary/40 text-primary hover:bg-accent">
            <Link href="/services">Découvrir les services en attendant</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Commandes rattachées à l'email du compte (Lead ↔ Order) ──────────────
  const orders = await db.order.findMany({
    where: { lead: { email } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const name = session?.user?.name ?? null;
  const initials = (name ?? email)
    .split(/[\s@]+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Profil */}
      <section
        aria-labelledby="account-title"
        className="flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-card p-6"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-500 text-[16px] font-bold text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h1 id="account-title" className="text-xl font-extrabold tracking-tight">
            {name ?? "Mon compte"}
          </h1>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{email}</p>
        </div>
        <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1 text-[12px]">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Compte vérifié
        </Badge>
      </section>

      {/* Commandes */}
      <section aria-labelledby="orders-title" className="mt-8">
        <h2 id="orders-title" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <PackageSearch className="h-5 w-5 text-primary" aria-hidden="true" />
          Mes commandes ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-[14px] font-semibold">Aucune commande pour l'instant</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-muted-foreground">
              Vos futures commandes apparaîtront ici : statut de paiement, référence,
              montant et fiche du service commandé.
            </p>
            <Button asChild className="mt-5 gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 font-semibold text-white">
              <Link href="/services">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Commander mon premier service
              </Link>
            </Button>
          </div>
        ) : (
          <ol className="mt-4 space-y-3.5">
            {orders.map((order) => {
              const st = PAYMENT_STATUS_LABELS[order.paymentStatus] ?? {
                label: order.paymentStatus,
                className: "border-border bg-muted text-muted-foreground",
              };
              // Compte à rebours (v2.2.0) : livrable promis X jours ouvrés après
              // le paiement capturé (PAID) — approximation calendairé affichée au client.
              const anchor = order.paidAt ?? order.createdAt;
              const deliveryAt =
                order.paymentStatus === "PAID"
                  ? new Date(anchor.getTime() + order.deliveryDays * 86_400_000)
                  : null;
              return (
                <li
                  key={order.id}
                  className="flex flex-wrap items-start gap-x-6 gap-y-3 rounded-2xl border border-border bg-card p-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                      <Link
                        href={`/services/${order.serviceSlug}`}
                        className="hover:text-primary hover:underline"
                      >
                        {order.serviceTitle}
                      </Link>
                      <span className="font-mono text-[11.5px] text-muted-foreground">
                        {order.reference}
                      </span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        {dateFmt.format(order.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Livraison {order.deliveryDays} jour{order.deliveryDays > 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                        {order.total.toLocaleString("fr-FR")} €
                      </span>
                    </p>
                    {deliveryAt && (
                      <p className="mt-2.5">
                        <OrderCountdown deliveryAt={deliveryAt.toISOString()} />
                      </p>
                    )}
                    <Link
                      href="#prestataire"
                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Une question sur cette commande ? Écrire au prestataire
                    </Link>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold ${st.className}`}
                  >
                    {st.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-6 text-[12.5px] leading-5 text-muted-foreground">
          Rappel : le paiement a lieu à la commande, mais les fonds restent séquestrés
          jusqu'à la livraison approuvée par vous — le vendeur n'est payé qu'après
          votre validation du livrable.
        </p>
      </section>

      {/* Conversation avec le prestataire humain (propriétaire) — v2.2.0 */}
      <section id="prestataire" aria-labelledby="prestataire-title" className="mt-10 scroll-mt-24">
        <h2 id="prestataire-title" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          Discuter avec le prestataire — réponse humaine
        </h2>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted-foreground">
          Le propriétaire de b2bpro.store est le prestataire unique de la plateforme :
          vos questions sur une commande, un livrable ou un délai lui parviennent
          directement (email marqué urgent + notification dans son tableau de bord).
        </p>
        <div className="mt-4">
          <ProviderChat />
        </div>
      </section>
    </div>
  );
}

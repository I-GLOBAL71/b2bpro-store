import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { LogIn, MessageCircle, PackageSearch, ShieldCheck, ShoppingBag } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderCard, type OrderCardDTO } from "@/components/site/account/order-card";
import { ProviderChat } from "@/components/site/account/provider-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon compte et mes commandes | b2bpro.store",
  description: "Suivez vos commandes b2bpro.store, leurs statuts et vos livraisons.",
  robots: { index: false, follow: false },
};

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
  // v2.5.0 : la carte structurée reçoit tout ce qu'elle affiche — options
  // choisies (libellés), dernière demande de modification, avis publié.
  const orders = await db.order.findMany({
    where: { lead: { email } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      revisions: { orderBy: { createdAt: "desc" }, take: 1 },
      review: { select: { id: true } },
      _count: { select: { revisions: true } },
    },
  });

  const optionIdsAll = orders.flatMap((o) => {
    try {
      return JSON.parse(o.optionIds) as string[];
    } catch {
      return [] as string[];
    }
  });
  const optionsMap = new Map<string, string>();
  if (optionIdsAll.length > 0) {
    const found = await db.serviceOption.findMany({
      where: { id: { in: optionIdsAll } },
      select: { id: true, name: true },
    });
    for (const o of found) optionsMap.set(o.id, o.name);
  }

  const name = session?.user?.name ?? null;
  const initials = (name ?? email)
    .split(/[\s@]+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const cards: OrderCardDTO[] = orders.map((o) => {
    let optIds: string[] = [];
    try {
      optIds = JSON.parse(o.optionIds) as string[];
    } catch {
      optIds = [];
    }
    const lastRevision = o.revisions[0];
    return {
      serviceId: o.serviceId,
      reference: o.reference,
      serviceSlug: o.serviceSlug,
      serviceTitle: o.serviceTitle,
      optionLabels: optIds
        .map((id) => optionsMap.get(id))
        .filter((n): n is string => Boolean(n)),
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      deliveryDays: o.deliveryDays,
      total: o.total,
      currency: o.currency,
      paymentStatus: o.paymentStatus,
      paymentProvider: o.paymentProvider,
      stage: o.stage,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
      releasedAt: o.releasedAt?.toISOString() ?? null,
      revisionCount: o._count.revisions,
      lastRevision: lastRevision
        ? {
            reason: lastRevision.reason,
            status: lastRevision.status,
            createdAt: lastRevision.createdAt.toISOString(),
          }
        : null,
      hasReview: Boolean(o.review),
      clientName: name,
    };
  });

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
          Mes commandes ({cards.length})
        </h2>

        {cards.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-[14px] font-semibold">Aucune commande pour l&apos;instant</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-muted-foreground">
              Vos futures commandes apparaîtront ici : ligne de vie, compte à rebours,
              validation de livraison et avis.
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
            {cards.map((order) => (
              <OrderCard key={order.reference} order={order} />
            ))}
          </ol>
        )}

        <p className="mt-6 text-[12.5px] leading-5 text-muted-foreground">
          Rappel : le paiement a lieu à la commande, mais les fonds restent séquestrés
          jusqu&apos;à la livraison approuvée par vous — le vendeur n&apos;est payé qu&apos;après
          votre validation du livrable.
        </p>
      </section>

      {/* Support humain — v2.5.0 : plus jamais « prestataire unique » */}
      <section id="support-humain" aria-labelledby="support-title" className="mt-10 scroll-mt-24">
        <h2 id="support-title" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          Contacter le support humain
        </h2>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted-foreground">
          Une question sur une commande, un livrable ou un délai ? L&apos;équipe support
          b2bpro.store — qui pilote l&apos;ensemble des prestataires de la plateforme — vous
          répond personnellement : chaque question porte sa propre route de réponse.
        </p>
        <div className="mt-4">
          <ProviderChat />
        </div>
      </section>
    </div>
  );
}

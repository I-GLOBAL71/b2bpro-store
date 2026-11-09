"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Users,
  Star,
  ShoppingCart,
  Mail,
  TrendingUp,
  BookOpen,
  Bot,
  ArrowRight,
  TriangleAlert,
} from "lucide-react";
import type { AdminStatsResponse } from "@/lib/contracts";
import { apiGet } from "@/components/admin/api";
import { AdminPageHeader } from "@/components/admin/fields";
import { RotationLive } from "@/components/admin/rotation-live";

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      {inner}
    </Link>
  ) : (
    <div className="rounded-2xl border border-border bg-card p-4">{inner}</div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [defaultPassword, setDefaultPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [s, session] = await Promise.all([
          apiGet<AdminStatsResponse>("/api/admin/stats"),
          apiGet<{ usingDefaultPassword: boolean }>("/api/admin/session"),
        ]);
        if (alive) {
          setStats(s);
          setDefaultPassword(session.usingDefaultPassword);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Erreur de chargement");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de la place de marché et de la rotation équitable de la vitrine d'accueil."
        icon={<LayoutDashboard className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      {defaultPassword && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[13px] leading-6 text-amber-800" role="alert">
          <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Mot de passe par défaut actif.</strong> Définissez{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[12px]">ADMIN_PASSWORD</code>{" "}
            dans vos variables d&apos;environnement pour sécuriser l&apos;accès en production.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{error}</div>
      )}

      {stats ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              icon={<Package className="h-4 w-4" aria-hidden="true" />}
              label="Services"
              value={stats.counts.services.toLocaleString("fr-FR")}
              hint="catalogue vivant"
              href="/admin/services"
            />
            <StatCard
              icon={<Users className="h-4 w-4" aria-hidden="true" />}
              label="Vendeurs"
              value={stats.counts.sellers.toLocaleString("fr-FR")}
            />
            <StatCard
              icon={<Star className="h-4 w-4" aria-hidden="true" />}
              label="Note moyenne"
              value={`${stats.avgRating.toString().replace(".", ",")}/5`}
              hint={`${stats.counts.reviews.toLocaleString("fr-FR")} avis`}
            />
            <StatCard
              icon={<ShoppingCart className="h-4 w-4" aria-hidden="true" />}
              label="Commandes"
              value={stats.counts.orders.toLocaleString("fr-FR")}
              hint={`${stats.revenuePaid.toLocaleString("fr-FR")} € encaissés`}
            />
            <StatCard
              icon={<Mail className="h-4 w-4" aria-hidden="true" />}
              label="Leads"
              value={stats.counts.leads.toLocaleString("fr-FR")}
            />
            <StatCard
              icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
              label="Articles blog"
              value={stats.counts.blogPosts.toLocaleString("fr-FR")}
            />
            <StatCard
              icon={<Bot className="h-4 w-4" aria-hidden="true" />}
              label="Base IA"
              value={stats.counts.knowledgeItems.toLocaleString("fr-FR")}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
              label="Best-seller"
              value={(stats.topService?.salesCount ?? 0).toLocaleString("fr-FR")}
              hint={stats.topService ? `ventes — ${stats.topService.title.slice(0, 34)}…` : undefined}
            />
          </div>

          <div className="mt-8 space-y-6">
            <RotationLive />

            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/admin/vitrine"
                className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <p className="text-[14px] font-bold">Régler la rotation</p>
                <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">
                  Fenêtre (10 min par défaut), nombre de cartes, filtre de note, textes de la vitrine.
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                  Ouvrir Vitrine &amp; Rotation
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </p>
              </Link>
              <Link
                href="/admin/accueil"
                className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <p className="text-[14px] font-bold">Configurer la page d&apos;accueil</p>
                <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">
                  Annonce, héros, sections visibles et volumétrie des témoignages.
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                  Ouvrir Page d&apos;accueil
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </p>
              </Link>
            </div>
          </div>
        </>
      ) : (
        !error && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-muted/50" />
            ))}
          </div>
        )
      )}
    </div>
  );
}

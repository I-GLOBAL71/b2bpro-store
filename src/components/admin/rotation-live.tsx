"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Crown, Timer, Users } from "lucide-react";
import type { RotationInfoDTO } from "@/lib/contracts";
import { apiGet } from "@/components/admin/api";
import { cn } from "@/lib/utils";

interface VitrineLive {
  rotation: RotationInfoDTO | null;
  current: { position: number; slug: string; title: string; poleSlug: string; rating: number; basePrice: number }[];
  upcoming: { window: number; slug: string; title: string; poleSlug: string }[];
}

function formatDelay(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} h ${m.toString().padStart(2, "0")}` : `${h} h`;
  }
  return `${minutes} min`;
}

/**
 * État live de la rotation : 1ère position courante, compte à rebours,
 * file d'attente des prochaines 1ères places, métriques d'équité.
 * Rafraîchi toutes les 30 s + à la demande.
 */
export function RotationLive({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<VitrineLive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const d = await apiGet<VitrineLive>("/api/admin/vitrine");
        if (alive) {
          setData(d);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Erreur de chargement");
      }
    };
    void load();
    const poll = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (!data?.rotation) return;
    const tick = () => setRemaining(Math.max(0, data.rotation!.rotatesAt - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const r = data.rotation;
  if (!r) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-[13.5px] text-muted-foreground">
        Rotation <strong>désactivée</strong> — la vitrine affiche les best-sellers figés
        (services « mis en avant », triés par ventes). Activez la rotation dans
        l&apos;onglet Vitrine &amp; Rotation pour un affichage équitable.
      </div>
    );
  }

  const first = data.current[0];
  const seconds = remaining === null ? null : Math.ceil(remaining / 1000);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-primary">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Rotation en direct
        </p>
        <p className="flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-[12.5px] font-semibold text-primary tabular-nums" aria-live="polite">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          {seconds === null
            ? "…"
            : seconds > 0
              ? `Prochaine rotation dans ${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`
              : "Rotation imminente…"}
        </p>
      </div>

      <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        <div className="rounded-xl bg-muted/60 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Actuellement en 1ère place
          </p>
          {first ? (
            <Link
              href={`/services/${first.slug}`}
              className="mt-1 line-clamp-2 text-[13.5px] font-bold leading-snug hover:text-primary"
            >
              <Crown className="mr-1 inline h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              {first.title}
            </Link>
          ) : (
            <p className="mt-1 text-[13.5px] font-semibold">—</p>
          )}
        </div>
        <div className="rounded-xl bg-muted/60 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Participants
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[15px] font-bold tabular-nums">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            {r.totalEligible} services éligibles
          </p>
          <p className="text-[11.5px] text-muted-foreground">sur {r.slotCount} affichés simultanément</p>
        </div>
        <div className={cn("rounded-xl bg-muted/60 p-3.5", compact && "sm:col-span-2")}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Équité garantie
          </p>
          <p className="mt-1 text-[15px] font-bold tabular-nums">
            Fenêtre de {r.windowMinutes} min · cycle complet en {formatDelay(r.fullCycleMinutes)}
          </p>
          <p className="text-[11.5px] text-muted-foreground">
            chaque service repasse en 1ère place une fois par cycle
          </p>
        </div>
      </div>

      {!compact && data.upcoming.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            File d&apos;attente — prochaines 1ères positions
          </p>
          <ol className="mt-2 space-y-1.5">
            {data.upcoming.map((u) => (
              <li key={u.window} className="flex items-center gap-2.5 text-[12.5px]">
                <span className="w-14 shrink-0 rounded bg-muted px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums text-muted-foreground">
                  +{u.window - r.windowIndex} ⟳
                </span>
                <Link href={`/services/${u.slug}`} className="line-clamp-1 font-medium hover:text-primary">
                  {u.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

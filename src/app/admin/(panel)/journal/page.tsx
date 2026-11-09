"use client";

import { useEffect, useState } from "react";
import { ScrollText, LogIn, LogOut, Settings2, Package, ShieldX } from "lucide-react";
import type { AdminLogDTO } from "@/lib/contracts";
import { apiGet } from "@/components/admin/api";
import { AdminPageHeader } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

const ACTION_META: Record<string, { icon: React.ReactNode; label: string; tone: string }> = {
  login: { icon: <LogIn className="h-4 w-4" aria-hidden="true" />, label: "Connexion", tone: "text-emerald-600 bg-emerald-500/10" },
  logout: { icon: <LogOut className="h-4 w-4" aria-hidden="true" />, label: "Déconnexion", tone: "text-muted-foreground bg-muted" },
  "login.failed": { icon: <ShieldX className="h-4 w-4" aria-hidden="true" />, label: "Échec de connexion", tone: "text-red-600 bg-red-500/10" },
  "config.update": { icon: <Settings2 className="h-4 w-4" aria-hidden="true" />, label: "Configuration", tone: "text-violet-600 bg-violet-500/10" },
  "service.update": { icon: <Package className="h-4 w-4" aria-hidden="true" />, label: "Service", tone: "text-amber-600 bg-amber-500/10" },
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function AdminJournalPage() {
  const [logs, setLogs] = useState<AdminLogDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const d = await apiGet<{ logs: AdminLogDTO[] }>("/api/admin/logs");
        if (alive) setLogs(d.logs);
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
        title="Journal d'audit"
        description="Traçabilité complète des actions administrateur : connexions, réglages modifiés, services pilotés. 60 dernières entrées."
        icon={<ScrollText className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{error}</div>
      )}

      {logs === null && !error && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {logs && logs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-[13.5px] text-muted-foreground">
          Aucune action enregistrée pour l&apos;instant — le journal se remplira à mesure de votre
          utilisation du panneau (connexions, réglages, services).
        </div>
      )}

      {logs && logs.length > 0 && (
        <ol className="space-y-2">
          {logs.map((log) => {
            const meta = ACTION_META[log.action] ?? {
              icon: <Settings2 className="h-4 w-4" aria-hidden="true" />,
              label: log.action,
              tone: "text-muted-foreground bg-muted",
            };
            return (
              <li key={log.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13.5px] font-bold">{meta.label}</p>
                    <time dateTime={log.createdAt} className="text-[11.5px] tabular-nums text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 break-words text-[12.5px] leading-5 text-muted-foreground">{log.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

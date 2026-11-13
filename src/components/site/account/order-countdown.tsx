"use client";

import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";

/**
 * Compte à rebours de livraison d'une commande payée (v2.2.0, corrigé v2.5.0).
 *
 * La date cible (paidAt + délai de livraison) est calculée côté SERVEUR et
 * passée en prop ISO — le client n'affiche que le décompte. Rendu robuste à
 * l'hydratation : la seconde s'affiche après montage (le serveur rend le
 * libellé statique « livraison prévue le … »).
 *
 * v2.5.0 — stabilité du rendu : la cible vit sous forme de MILLISECONDES
 * primitives (Date.parse). Un `new Date()` à chaque rendu faisait changer
 * les dépendances de l'effet à chaque re-rendu (boucle « Maximum update
 * depth » dès qu'un parent re-rendait, ex. ouverture d'un dialogue).
 */

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d} j ${pad(h)} h ${pad(m)} min`;
  if (h > 0) return `${h} h ${pad(m)} min ${pad(s)} s`;
  return `${m} min ${pad(s)} s`;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function OrderCountdown({ deliveryAt }: { deliveryAt: string }) {
  // Primitive stable : la prop ISO est analysée en millisecondes UNE fois,
  // jamais recréée par un new Date() dans le corps du composant.
  const targetMs = Date.parse(deliveryAt);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(targetMs - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const late = remaining !== null && remaining <= 0;

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold tabular-nums ${
        late
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-primary/30 bg-accent text-primary"
      }`}
      title={`Livraison prévue le ${dateFmt.format(new Date(targetMs))}`}
    >
      <Hourglass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {late ? (
        <span className="truncate">Livraison attendue — validation à venir</span>
      ) : (
        <span className="truncate">
          Livraison {dateFmt.format(new Date(targetMs))}
          {remaining !== null ? ` · dans ${formatRemaining(remaining)}` : ""}
        </span>
      )}
      <span className="sr-only">
        Livraison prévue le {dateFmt.format(new Date(targetMs))}
        {late ? ", échéance atteinte" : ""}
      </span>
    </span>
  );
}

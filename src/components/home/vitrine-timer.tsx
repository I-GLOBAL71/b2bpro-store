"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * Compte à rebours avant la prochaine rotation de la vitrine.
 * À zéro : appelle router.refresh() (si autoRefresh) — la page d'accueil est
 * rendue dynamiquement côté serveur, la vitrine se met à jour sans rechargement.
 *
 * Premier affichage « --:-- » (place-holder) puis synchronisation asynchrone :
 * aucune divergence d'hydratation entre serveur et client.
 */
export function VitrineTimer({
  rotatesAt,
  autoRefresh,
  windowMinutes,
}: {
  rotatesAt: number;
  autoRefresh: boolean;
  windowMinutes: number;
}) {
  const router = useRouter();
  /** null = pas encore synchronisé (place-holder serveur + premier rendu client). */
  const [remaining, setRemaining] = useState<number | null>(null);
  const refreshedRef = useRef(false);

  useEffect(() => {
    refreshedRef.current = false;

    const sync = () => {
      const left = Math.max(0, rotatesAt - Date.now());
      setRemaining(left);
      if (left <= 0 && autoRefresh && !refreshedRef.current) {
        refreshedRef.current = true;
        router.refresh();
      }
    };

    const kickoff = setTimeout(sync, 0); // asynchrone : évite les rendus en cascade
    const tick = setInterval(sync, 1000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(tick);
    };
  }, [rotatesAt, autoRefresh, router]);

  const totalSeconds = remaining === null ? null : Math.ceil(remaining / 1000);
  const minutes = totalSeconds === null ? 0 : Math.floor(totalSeconds / 60);
  const seconds = totalSeconds === null ? 0 : totalSeconds % 60;
  const urgent = totalSeconds !== null && totalSeconds <= 60 && totalSeconds > 0;

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-[12.5px] font-medium text-primary"
      aria-live="polite"
      title={`Aucun service ne reste plus de ${windowMinutes} min en première place : la vitrine tourne automatiquement.`}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${urgent ? "animate-spin" : ""}`} aria-hidden="true" />
      <span className="tabular-nums" suppressHydrationWarning>
        {totalSeconds === null
          ? "--:--"
          : totalSeconds > 0
            ? `Rotation dans ${minutes}:${seconds.toString().padStart(2, "0")}`
            : "Rotation imminente…"}
      </span>
    </span>
  );
}

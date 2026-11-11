"use client";

import { useMemo } from "react";
import { Check, Clock, Info, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type OptionDTO } from "@/lib/contracts";
import { useOrderStore } from "@/lib/order-store";

function fmt(n: number) {
  return `${n.toLocaleString("fr-FR")} €`;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  OptionSelector — carte latérale de la fiche service (v2.0.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Offre de base + options cumulables cochables directement dans la carte,
 *  total en direct. Le bouton « Commander » ouvre le tunnel partagé
 *  (OrderDock) : la sélection effectuée ici s'y retrouve — et réciproquement,
 *  grâce au store unique src/lib/order-store (zustand).
 *
 *  Le tunnel lui-même (options → coordonnées → paiement) vit dans
 *  OrderDock (barre persistante bas d'écran) : plus de dialog imbriqué ici.
 */
export function OptionSelector({
  basePrice,
  baseDays,
  options,
}: {
  /** Prix de l'offre de base (EUR). */
  basePrice: number;
  /** Délai de livraison de l'offre de base (jours ouvrés). */
  baseDays: number;
  /** Options supplémentaires cumulables. */
  options: OptionDTO[];
}) {
  // ── État partagé avec la barre persistante et le tunnel ──
  const selectedIds = useOrderStore((s) => s.selectedIds);
  const toggleOption = useOrderStore((s) => s.toggleOption);
  const openOrderDialog = useOrderStore((s) => s.openOrderDialog);

  const { total, totalDays } = useMemo(() => {
    let t = basePrice;
    let d = baseDays;
    for (const o of options) {
      if (selectedIds.includes(o.id)) {
        t += o.priceExtra;
        d += o.daysExtra;
      }
    }
    return { total: t, totalDays: d };
  }, [selectedIds, options, basePrice, baseDays]);

  const selectedCount = options.filter((o) => selectedIds.includes(o.id)).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Offre de base */}
      <div className="rounded-2xl border-2 border-primary/60 bg-accent/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[14px] font-bold">Offre de base</p>
              <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">
                Le livrable complet décrit sur cette page, avec ajustements inclus.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[16px] font-extrabold text-primary">{fmt(basePrice)}</p>
            <p className="text-[11.5px] text-muted-foreground">{baseDays} j</p>
          </div>
        </div>
      </div>

      {/* Options */}
      {options.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Options supplémentaires ({options.length})
          </p>
          {options.map((o) => {
            const isSel = selectedIds.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggleOption(o.id)}
                aria-pressed={isSel}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                  isSel
                    ? "border-primary/60 bg-accent/25 shadow-sm"
                    : "border-border bg-card hover:border-primary/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isSel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
                    )}
                  >
                    {isSel && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold">{o.name}</p>
                    <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">{o.description}</p>
                    {o.monthly && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-amber-600">
                        <Info className="h-3 w-3" aria-hidden="true" />
                        Facturation mensuelle
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[14.5px] font-bold text-primary">+{fmt(o.priceExtra)}</p>
                  {o.daysExtra > 0 && (
                    <p className="text-[11.5px] text-muted-foreground">+{o.daysExtra} j</p>
                  )}
                  {o.daysExtra === 0 && !o.monthly && (
                    <p className="text-[11.5px] text-emerald-600">délai inchangé</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Total + CTA → tunnel partagé (OrderDock) */}
      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
              Total ({1 + selectedCount} élément{selectedCount > 0 ? "s" : ""})
            </p>
            <p className="mt-0.5 text-2xl font-extrabold text-foreground">{fmt(total)}</p>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Livraison {totalDays} jour{totalDays > 1 ? "s" : ""} ouvré{totalDays > 1 ? "s" : ""}
          </div>
        </div>

        <Button
          type="button"
          onClick={() => openOrderDialog()}
          className="mt-4 h-12 w-full gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 text-[15px] font-bold text-white shadow-lg shadow-primary/20 hover:shadow-xl"
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          Commander maintenant
        </Button>
      </div>

      <p className="text-center text-[12px] leading-5 text-muted-foreground">
        Paiement séquestré · le vendeur n'est payé qu'après votre validation ·
        remboursement intégral si non conforme
      </p>
    </div>
  );
}

/** Groupe radio pour usage futur (variantes d'offre exclusives). */
export function ExclusiveRadioGroup({
  items,
  value,
  onValueChange,
}: {
  items: { value: string; label: string; hint?: string }[];
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => (
        <label
          key={it.value}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3.5"
        >
          <input
            type="radio"
            name="exclusive-option"
            value={it.value}
            checked={value === it.value}
            onChange={() => onValueChange(it.value)}
            className="h-4 w-4 accent-primary"
          />
          <div className="flex-1">
            <p className="text-[14px] font-semibold">{it.label}</p>
            {it.hint && <p className="text-[12px] text-muted-foreground">{it.hint}</p>}
          </div>
        </label>
      ))}
    </div>
  );
}

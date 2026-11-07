"use client";

import { useMemo, useState } from "react";
import { Check, Clock, ShoppingCart, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface OptionItem {
  id: string;
  name: string;
  description: string;
  priceExtra: number;
  daysExtra: number;
  monthly: boolean;
}

function fmt(n: number) {
  return `${n.toLocaleString("fr-FR")} €`;
}

/** Sélecteur d'options à la ComeUp : offre de base + options cumulables, total en direct. */
export function OptionSelector({
  serviceId,
  serviceSlug,
  serviceTitle,
  basePrice,
  baseDays,
  options,
}: {
  serviceId: string;
  serviceSlug: string;
  serviceTitle: string;
  basePrice: number;
  baseDays: number;
  options: OptionItem[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [orderOpen, setOrderOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { total, totalDays } = useMemo(() => {
    let t = basePrice;
    let d = baseDays;
    for (const o of options) {
      if (selected.has(o.id)) {
        t += o.priceExtra;
        d += o.daysExtra;
      }
    }
    return { total: t, totalDays: d };
  }, [selected, options, basePrice, baseDays]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Veuillez saisir un email valide pour recevoir votre commande.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          brief,
          serviceId,
          serviceSlug,
          serviceTitle,
          optionIds: [...selected],
          total,
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      toast.success("Commande enregistrée ! Le récapitulatif vient de partir vers votre email.");
    } catch {
      toast.error("Une erreur est survenue lors de l'enregistrement. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

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
            const isSel = selected.has(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                aria-pressed={isSel}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                  isSel
                    ? "border-primary/60 bg-accent/25 shadow-sm"
                    : "border-border bg-card hover:border-primary/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isSel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
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

      {/* Total + CTA */}
      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
              Total ({1 + selected.size} élément{selected.size > 0 ? "s" : ""})
            </p>
            <p className="mt-0.5 text-2xl font-extrabold text-foreground">{fmt(total)}</p>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Livraison {totalDays} jour{totalDays > 1 ? "s" : ""} ouvré{totalDays > 1 ? "s" : ""}
          </div>
        </div>

        <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 h-12 w-full gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 text-[15px] font-bold text-white shadow-lg shadow-primary/20 hover:shadow-xl">
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              Commander maintenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                Finaliser votre commande
              </DialogTitle>
              <DialogDescription>
                {serviceTitle} — <span className="font-semibold text-foreground">{fmt(total)}</span> ·
                livraison {totalDays} j. Paiement sécurisé après validation du formulaire.
              </DialogDescription>
            </DialogHeader>

            {done ? (
              <div className="rounded-xl border border-primary/30 bg-accent/30 p-5 text-center">
                <p className="text-[15px] font-bold">Commande enregistrée ✓</p>
                <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
                  Le récapitulatif complet vient d'être envoyé à <strong>{email}</strong>. Un
                  conseiller confirme votre commande et le lien de paiement sécurisé dans
                  l'heure. Vos fonds restent séquestrés jusqu'à validation du livrable.
                </p>
              </div>
            ) : (
              <form onSubmit={placeOrder} className="mt-2 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="order-name">Nom / Société</Label>
                  <Input
                    id="order-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex : Durand SAS"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="order-email">Email professionnel *</Label>
                  <Input
                    id="order-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="order-brief">Vos consignes (optionnel)</Label>
                  <Textarea
                    id="order-brief"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="Décrivez votre besoin : cible, zone, volume attendu…"
                    rows={3}
                  />
                </div>
                <div className="rounded-xl bg-muted/60 p-3.5 text-[12.5px] leading-5 text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    Récapitulatif : {fmt(total)} · {totalDays} jours
                  </p>
                  <p className="mt-1">
                    {selected.size > 0
                      ? `Offre de base + ${selected.size} option${selected.size > 1 ? "s" : ""} : ${options
                          .filter((o) => selected.has(o.id))
                          .map((o) => o.name)
                          .join(", ")}`
                      : "Offre de base (ajustements inclus)"}
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-full bg-gradient-to-r from-primary to-emerald-500 text-[14.5px] font-bold text-white"
                >
                  {submitting ? "Enregistrement…" : "Confirmer la commande"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
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
    <RadioGroup value={value} onValueChange={onValueChange} className="gap-2.5">
      {items.map((it) => (
        <div
          key={it.value}
          className="flex items-center space-x-3 rounded-xl border border-border p-3.5"
        >
          <RadioGroupItem value={it.value} id={it.value} />
          <div className="flex-1">
            <Label htmlFor={it.value} className="text-[14px] font-semibold">
              {it.label}
            </Label>
            {it.hint && <p className="text-[12px] text-muted-foreground">{it.hint}</p>}
          </div>
        </div>
      ))}
    </RadioGroup>
  );
}

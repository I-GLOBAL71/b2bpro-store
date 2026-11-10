"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, ShoppingCart, Sparkles, Info, ArrowLeft, Lock, CreditCard } from "lucide-react";
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
import { API_ROUTES, type PayPalClientConfig } from "@/lib/contracts";

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

// ─── Typages minimaux du SDK PayPal JS (chargé dynamiquement) ────────────────

interface PayPalButtonsInstance {
  close(): Promise<void>;
}

interface PayPalButtonsConfig {
  style?: Record<string, string>;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError?: (err: unknown) => void;
}

interface PayPalSdk {
  Buttons: (config: PayPalButtonsConfig) => {
    render: (target: HTMLElement) => Promise<PayPalButtonsInstance>;
  };
}

declare global {
  interface Window {
    paypal?: PayPalSdk;
  }
}

type CheckoutStep = "form" | "payment" | "done";

/** Sélecteur d'options à la ComeUp : offre de base + options cumulables, total en direct.
 *
 * Paiement :
 *  - prop `payPal` fournie (production) → tunnel 2 étapes : formulaire →
 *    boutons PayPal (SDK JS) → capture serveur → confirmation avec référence.
 *  - prop absente (démo / sandbox) → voie historique POST /api/orders,
 *    strictement inchangée.
 */
export function OptionSelector({
  serviceId,
  serviceSlug,
  serviceTitle,
  basePrice,
  baseDays,
  options,
  payPal,
}: {
  serviceId: string;
  serviceSlug: string;
  serviceTitle: string;
  basePrice: number;
  baseDays: number;
  options: OptionItem[];
  /** Configuration PayPal (clientId public + devise) — absente = mode démo. */
  payPal?: PayPalClientConfig;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [orderOpen, setOrderOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Tunnel PayPal
  const [step, setStep] = useState<CheckoutStep>("form");
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState<{ reference: string; total: number; payerEmail: string | null } | null>(null);
  const paypalContainerRef = useRef<HTMLDivElement>(null);

  // Réfs anti-closures-périmées : le SDK est rendu une fois, les données du
  // formulaire restent fraîches via ces réfs.
  const formRef = useRef({ email, name, brief, selected });
  formRef.current = { email, name, brief, selected };

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

  function handleDialogOpen(open: boolean) {
    setOrderOpen(open);
    if (!open) {
      // Fermeture : réinitialiser le tunnel pour une prochaine commande propre.
      setStep("form");
      setPaid(null);
      setPaying(false);
    }
  }

  // ── Étape 1 → Étape 2 (validation légère ; la validation d'autorité reste serveur) ──
  function goToPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Veuillez saisir un email valide pour recevoir votre commande.");
      return;
    }
    setStep("payment");
  }

  // ── Voie démo historique (POST /api/orders) — strictement inchangée ──────
  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Veuillez saisir un email valide pour recevoir votre commande.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API_ROUTES.orders, {
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

  // ── Chargement du SDK PayPal JS (une seule balise <script> partagée) ─────
  useEffect(() => {
    if (!payPal) return;
    const src =
      `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(payPal.clientId)}` +
      `&currency=${payPal.currency}&locale=fr_FR&intent=capture&components=buttons&disable-funding=paylater`;

    let script = document.getElementById("paypal-sdk-js") as HTMLScriptElement | null;
    if (script?.dataset.loaded === "1") {
      setSdkReady(true);
      return;
    }
    if (!script) {
      script = document.createElement("script");
      script.id = "paypal-sdk-js";
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    }
    const onLoad = () => {
      script!.dataset.loaded = "1";
      setSdkReady(true);
    };
    const onError = () => setSdkFailed(true);
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    return () => {
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
    };
  }, [payPal]);

  // ── Rendu des boutons PayPal dans le conteneur (étape paiement) ───────────
  useEffect(() => {
    if (!payPal || !sdkReady || step !== "payment") return;
    const sdk = window.paypal;
    const target = paypalContainerRef.current;
    if (!sdk || !target) {
      if (!sdk) setSdkFailed(true);
      return;
    }

    let cancelled = false;
    let instance: PayPalButtonsInstance | null = null;

    sdk.Buttons({
      style: { layout: "vertical", color: "gold", shape: "pill", label: "paypal", height: "45" },
      createOrder: async () => {
        const f = formRef.current;
        setPaying(true);
        const res = await fetch(API_ROUTES.paypalCreateOrder, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: f.email,
            name: f.name,
            brief: f.brief,
            serviceId,
            optionIds: [...f.selected],
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          setPaying(false);
          throw new Error(err?.error ?? "Création de commande impossible.");
        }
        const data = (await res.json()) as { paypalOrderId: string };
        return data.paypalOrderId;
      },
      onApprove: async (data) => {
        const res = await fetch(API_ROUTES.paypalCaptureOrder, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paypalOrderId: data.orderID }),
        });
        setPaying(false);
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          toast.error(err?.error ?? "Le paiement n'a pas pu être finalisé. Aucun montant n'a été débité.");
          return;
        }
        const ok = (await res.json()) as { reference: string; total: number; payerEmail: string | null };
        setPaid({ reference: ok.reference, total: ok.total, payerEmail: ok.payerEmail });
        setStep("done");
        toast.success(`Paiement confirmé : commande ${ok.reference}.`);
      },
      onError: () => {
        setPaying(false);
        toast.error("PayPal a signalé une erreur. Vous pouvez réessayer ou contactez le support IA.");
      },
    })
      .render(target)
      .then((btn) => {
        if (cancelled) btn.close().catch(() => undefined);
        else instance = btn;
      })
      .catch(() => setSdkFailed(true));

    return () => {
      cancelled = true;
      instance?.close().catch(() => undefined);
      if (paypalContainerRef.current) paypalContainerRef.current.innerHTML = "";
    };
  }, [payPal, sdkReady, step, serviceId]);

  const selectedOptions = options.filter((o) => selected.has(o.id));

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

        <Dialog open={orderOpen} onOpenChange={handleDialogOpen}>
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
                {payPal && step === "payment"
                  ? "Paiement sécurisé PayPal"
                  : payPal
                    ? "Finaliser votre commande"
                    : "Finaliser votre commande"}
              </DialogTitle>
              <DialogDescription>
                {serviceTitle} : <span className="font-semibold text-foreground">{fmt(total)}</span> ·
                livraison {totalDays} j.{" "}
                {payPal
                  ? "Paiement par carte ou compte PayPal, fonds sécurisés."
                  : "Paiement sécurisé après validation du formulaire."}
              </DialogDescription>
            </DialogHeader>

            {/* ── Confirmation finale (voie PayPal payée OU voie démo) ── */}
            {payPal && paid ? (
              <div className="rounded-xl border border-primary/30 bg-accent/30 p-5 text-center">
                <p className="text-[15px] font-bold">Paiement confirmé ✓</p>
                <p className="mt-1 text-[13px] font-semibold text-primary">
                  Commande {paid.reference} : {fmt(paid.total)} réglés
                </p>
                <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
                  Le paiement a été encaissé via PayPal
                  {paid.payerEmail ? (
                    <>
                      {" "}({paid.payerEmail})
                    </>
                  ) : null}
                  . Le récapitulatif complet et le suivi de livraison partent vers{" "}
                  <strong>{email}</strong>. Votre expert est notifié et démarre sous 24 h —
                  vos fonds restent protégés jusqu'à validation du livrable.
                </p>
              </div>
            ) : payPal && step === "done" && !paid ? null :

            /* ── Étape 2 : paiement PayPal ── */
            payPal && step === "payment" ? (
              <div className="mt-2 space-y-4">
                <div className="rounded-xl bg-muted/60 p-3.5 text-[12.5px] leading-5 text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    Récapitulatif : {fmt(total)} · {totalDays} jours
                  </p>
                  <p className="mt-1">
                    {selectedOptions.length > 0
                      ? `Offre de base + ${selectedOptions.length} option${selectedOptions.length > 1 ? "s" : ""} : ${selectedOptions
                          .map((o) => o.name)
                          .join(", ")}`
                      : "Offre de base (ajustements inclus)"}
                  </p>
                  <p className="mt-1">
                    Confirmation envoyée à <strong>{email}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-[12px] font-medium text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Paiement chiffré — le vendeur n'est payé qu'après votre validation du livrable
                </div>

                {sdkFailed ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-[13px] leading-6 text-amber-800">
                    <p className="font-semibold">Impossible de charger le module PayPal.</p>
                    <p className="mt-1">
                      Vérifiez votre connexion puis réessayez — ou contactez le support IA,
                      aucun montant n'a été débité.
                    </p>
                  </div>
                ) : (
                  <div
                    ref={paypalContainerRef}
                    aria-busy={!sdkReady || paying}
                    aria-label="Boutons de paiement PayPal"
                    className="min-h-[120px] rounded-xl"
                  >
                    {(!sdkReady || paying) && (
                      <div className="flex h-[120px] items-center justify-center gap-2 rounded-xl border border-dashed border-border text-[13px] text-muted-foreground">
                        <CreditCard className="h-4 w-4 animate-pulse" aria-hidden="true" />
                        {paying ? "Finalisation du paiement…" : "Chargement du paiement sécurisé…"}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full gap-1.5 text-[13px] text-muted-foreground"
                  onClick={() => setStep("form")}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Modifier mes informations
                </Button>
              </div>
            ) :

            /* ── Étape 1 (PayPal) / formulaire unique (voie démo) ── */
            payPal ? (
              <form onSubmit={goToPayment} className="mt-2 space-y-4">
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
                    {selectedOptions.length > 0
                      ? `Offre de base + ${selectedOptions.length} option${selectedOptions.length > 1 ? "s" : ""} : ${selectedOptions
                          .map((o) => o.name)
                          .join(", ")}`
                      : "Offre de base (ajustements inclus)"}
                  </p>
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 text-[14.5px] font-bold text-white"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Continuer vers le paiement sécurisé
                </Button>
              </form>
            ) : done ? (
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
                    {selectedOptions.length > 0
                      ? `Offre de base + ${selectedOptions.length} option${selectedOptions.length > 1 ? "s" : ""} : ${selectedOptions
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
        {payPal ? (
          <>
            Paiement PayPal — carte bleue ou compte PayPal · le vendeur n'est payé qu'après
            votre validation · remboursement intégral si non conforme
          </>
        ) : (
          <>
            Paiement séquestré · le vendeur n'est payé qu'après votre validation ·
            remboursement intégral si non conforme
          </>
        )}
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

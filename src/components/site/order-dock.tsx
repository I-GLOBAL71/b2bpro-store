"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  Lock,
  LogIn,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { API_ROUTES, type OptionDTO, type PayPalClientConfig } from "@/lib/contracts";
import { useOrderStore } from "@/lib/order-store";
import { SignInDialog } from "@/components/site/auth-menu";

function fmt(n: number) {
  return `${n.toLocaleString("fr-FR")} €`;
}

// ─── Typages minimaux du SDK PayPal JS (chargé dynamiquement) ────────────────

interface PayPalButtonsInstance {
  close(): Promise<void>;
}

interface PayPalButtonsConfig {
  /** height est un NOMBRE de pixels — le SDK PayPal/React rejette "45" (chaîne). */
  style?: Record<string, string | number>;
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

type CheckoutStep = "options" | "form" | "payment" | "done";

export interface OrderDockProps {
  serviceId: string;
  serviceSlug: string;
  serviceTitle: string;
  basePrice: number;
  baseDays: number;
  options: OptionDTO[];
  /** Configuration PayPal (clientId public + devise) — absente = mode démo. */
  payPal?: PayPalClientConfig;
  /** v2.1.0 : la finalisation exige un client connecté (décidé par la page serveur). */
  requireAuth?: boolean;
  /** Méthodes de connexion disponibles (pour le panneau « connexion requise »). */
  googleEnabled?: boolean;
  emailEnabled?: boolean;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  OrderDock — barre de commande PERSISTANTE en bas d'écran (v2.0.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  • `sticky bottom-0` : le bouton « Commander » reste ancré au bas de la
 *    fenêtre pendant tout le défilement de la fiche, puis se range
 *    naturellement au-dessus du footer en fin de page (aucun recouvrement).
 *
 *  • Tunnel de commande intégré, en 3 étapes :
 *      1. « options »  — offre de base + options supplémentaires FACULTATIVES
 *         (cochées ou décochées, total et délais recalculés en direct) ;
 *      2. « form »     — coordonnées (préremplies si le client est connecté
 *         via Google ou lien magique email) + consignes ;
 *      3. « payment »  — PayPal (production) puis confirmation, ou validation
 *         directe (voie démo /api/orders).
 *
 *  • La sélection est partagée avec la carte latérale via src/lib/order-store
 *    (zustand) : une seule source de vérité pour le total affiché partout.
 */
export function OrderDock({
  serviceId,
  serviceSlug,
  serviceTitle,
  basePrice,
  baseDays,
  options,
  payPal,
  requireAuth = false,
  googleEnabled = false,
  emailEnabled = false,
}: OrderDockProps) {
  // ── État partagé (carte latérale ↔ dock ↔ tunnel) ──
  const selectedIds = useOrderStore((s) => s.selectedIds);
  const toggleOption = useOrderStore((s) => s.toggleOption);
  const dialogOpen = useOrderStore((s) => s.dialogOpen);
  const openOrderDialog = useOrderStore((s) => s.openOrderDialog);
  const closeOrderDialog = useOrderStore((s) => s.closeOrderDialog);
  const resetOrder = useOrderStore((s) => s.resetOrder);

  // ── État local du tunnel ──
  const [step, setStep] = useState<CheckoutStep>("options");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // ── Tunnel PayPal ──
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState<{ reference: string; total: number; payerEmail: string | null } | null>(null);
  const paypalContainerRef = useRef<HTMLDivElement>(null);

  // ── Session : préremplissage sans friction (et AUTH exigée si requireAuth) ──
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? null;
  const sessionName = session?.user?.name ?? null;

  // v2.1.0 — Panneau « connexion requise » empilé sur le tunnel (session absente).
  const [authOpen, setAuthOpen] = useState(false);

  /** Gating local : la finalisation est-elle bloquée par l'absence de session ? */
  const authGate = requireAuth && !sessionEmail;

  // Changement de fiche → sélection et tunnel remis à zéro.
  useEffect(() => {
    resetOrder();
  }, [resetOrder, serviceId]);

  // Connecté → email/nom déjà connus, plus rien à saisir.
  useEffect(() => {
    if (sessionEmail) setEmail(sessionEmail);
    if (sessionName) setName(sessionName);
  }, [sessionEmail, sessionName]);

  // ── Totaux (mêmes règles serveur : base + options cochées) ──
  const selected = useMemo(
    () => options.filter((o) => selectedIds.includes(o.id)),
    [options, selectedIds],
  );
  const { total, totalDays } = useMemo(() => {
    let t = basePrice;
    let d = baseDays;
    for (const o of selected) {
      t += o.priceExtra;
      d += o.daysExtra;
    }
    return { total: t, totalDays: d };
  }, [selected, basePrice, baseDays]);

  // Réfs anti-closures-périmées : le SDK PayPal est rendu une fois, les
  // données du formulaire restent fraîches via ces réfs.
  const formRef = useRef({ email, name, brief, selectedIds });
  formRef.current = {
    email: sessionEmail ?? email,
    name: sessionName ?? name,
    brief,
    selectedIds,
  };

  function handleDialogOpen(open: boolean) {
    if (open) openOrderDialog();
    else {
      closeOrderDialog();
      // Fermeture : réinitialiser le tunnel pour une prochaine commande propre.
      setStep("options");
      setPaid(null);
      setPaying(false);
      setDone(false);
    }
  }

  // ── Options → coordonnées (la validation d'autorité reste serveur) ──
  function goToForm() {
    setStep("form");
  }

  // ── Voie démo historique (POST /api/orders) — strictement inchangée, à
  // ceci près que le serveur exige une session quand l'auth est configurée
  // (v2.1.0) : le garde local évite même la tentative. ──
  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (authGate) {
      setAuthOpen(true);
      toast.info("Connectez-vous pour finaliser votre commande — 30 secondes suffisent.");
      return;
    }
    const effEmail = sessionEmail ?? email;
    if (!effEmail || !effEmail.includes("@")) {
      toast.error("Veuillez saisir un email valide pour recevoir votre commande.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API_ROUTES.orders, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: effEmail,
          name: sessionName ?? name,
          brief,
          serviceId,
          serviceSlug,
          serviceTitle,
          optionIds: selectedIds,
          total,
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      setStep("done");
      toast.success("Commande enregistrée ! Le récapitulatif vient de partir vers votre email.");
    } catch {
      toast.error("Une erreur est survenue lors de l'enregistrement. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Étape coordonnées → paiement PayPal ──
  function goToPayment(e: React.FormEvent) {
    e.preventDefault();
    if (authGate) {
      setAuthOpen(true);
      toast.info("Connectez-vous pour finaliser votre paiement — 30 secondes suffisent.");
      return;
    }
    const effEmail = sessionEmail ?? email;
    if (!effEmail || !effEmail.includes("@")) {
      toast.error("Veuillez saisir un email valide pour recevoir votre commande.");
      return;
    }
    setStep("payment");
  }

  // ── Chargement du SDK PayPal JS (une seule balise <script> partagée) ──
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
      style: { layout: "vertical", color: "gold", shape: "pill", label: "paypal", height: 45 },
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
            optionIds: [...f.selectedIds],
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

  const selectedCount = selected.length;
  const elementsCount = 1 + selectedCount;

  const recapLine =
    selectedCount > 0
      ? `Offre de base + ${selectedCount} option${selectedCount > 1 ? "s" : ""} : ${selected.map((o) => o.name).join(", ")}`
      : "Offre de base seule (ajustements inclus) — aucune option imposée";

  // ═══════════════════════════════════════════════════════════════════════
  //  1. Barre persistante (sticky) — total en direct + bouton Commander
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <>
      <div
        className="sticky bottom-0 z-40 -mx-4 mt-8 border-t border-border/80 bg-background/95 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:-mx-6 lg:-mx-8"
        role="region"
        aria-label="Commander ce service"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-tight sm:text-[14px]">
              <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[12px]">
                Total
              </span>{" "}
              <span className="text-[17px] font-extrabold text-primary sm:text-[19px]">{fmt(total)}</span>
              <span className="ml-2 hidden text-[12px] text-muted-foreground sm:inline">
                · livraison {totalDays} jour{totalDays > 1 ? "s" : ""} ouvré{totalDays > 1 ? "s" : ""}
              </span>
            </p>
            <p className="truncate text-[11.5px] text-muted-foreground">
              {elementsCount} élément{elementsCount > 1 ? "s" : ""}
              {selectedCount > 0 && ` · offre de base + ${selectedCount} option${selectedCount > 1 ? "s" : ""}`}
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                paiement séquestré
              </span>
            </p>
          </div>
          <Button
            type="button"
            onClick={() => openOrderDialog()}
            className="h-11 shrink-0 gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 px-5 text-[14px] font-bold text-white shadow-lg shadow-primary/25 hover:shadow-xl sm:px-7 sm:text-[15px]"
          >
            <ShoppingCart className="h-4.5 w-4.5" aria-hidden="true" />
            Commander
            <span className="hidden sm:inline">maintenant</span>
          </Button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          2. Tunnel de commande — options → coordonnées → paiement
         ═════════════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              {step === "options"
                ? "Composez votre commande"
                : step === "form"
                  ? authGate
                    ? "Connexion requise"
                    : payPal
                      ? "Vos coordonnées"
                      : "Finaliser votre commande"
                  : step === "payment"
                    ? "Paiement sécurisé PayPal"
                    : paid
                      ? "Paiement confirmé"
                      : "Commande enregistrée"}
            </DialogTitle>
            <DialogDescription>
              {step === "options" ? (
                <>
                  Offre de base incluse d'office. Ajoutez seulement les options
                  utiles — ou continuez sans aucune :{" "}
                  <span className="font-semibold text-foreground">rien n'est imposé</span>.
                </>
              ) : (
                <>
                  {serviceTitle} :{" "}
                  <span className="font-semibold text-foreground">{fmt(total)}</span> ·
                  livraison {totalDays} j.{" "}
                  {payPal
                    ? "Paiement par carte ou compte PayPal, fonds sécurisés."
                    : "Paiement sécurisé après validation du formulaire."}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* ── Confirmation finale (PayPal payé OU voie démo) ── */}
          {step === "done" && (paid || done) ? (
            <div className="mt-3 rounded-xl border border-primary/30 bg-accent/30 p-5 text-center">
              <p className="text-[15px] font-bold">
                {paid ? "Paiement confirmé ✓" : "Commande enregistrée ✓"}
              </p>
              {paid && (
                <p className="mt-1 text-[13px] font-semibold text-primary">
                  Commande {paid.reference} : {fmt(paid.total)} réglés
                </p>
              )}
              <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
                {paid
                  ? "Le paiement a été encaissé via PayPal"
                  : "Le récapitulatif complet vient d'être envoyé à"}
                {paid && paid.payerEmail ? (
                  <>
                    {" "}({paid.payerEmail})
                  </>
                ) : null}
                {paid
                  ? ". Le récapitulatif complet et le suivi de livraison partent vers "
                  : " "}
                <strong>{formRef.current.email}</strong>
                {paid
                  ? ". Votre expert est notifié et démarre sous 24 h — vos fonds restent protégés jusqu'à validation du livrable."
                  : ". Un conseiller confirme votre commande et le lien de paiement sécurisé dans l'heure. Vos fonds restent séquestrés jusqu'à validation du livrable."}
              </p>
            </div>
          ) : step === "options" ? (
            /* ── Étape 1 : offre de base + options FACULTATIVES ── */
            <div className="mt-3 space-y-4">
              <div className="rounded-xl border-2 border-primary/60 bg-accent/30 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[14px] font-bold">Offre de base — toujours incluse</p>
                      <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">
                        Le livrable complet décrit sur cette page, avec ajustements inclus.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-extrabold text-primary">{fmt(basePrice)}</p>
                    <p className="text-[11.5px] text-muted-foreground">{baseDays} j</p>
                  </div>
                </div>
              </div>

              {options.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Options supplémentaires — facultatives ({options.length})
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
                          "flex w-full items-start justify-between gap-3 rounded-2xl border-2 p-3.5 text-left transition-all",
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
                            <p className="text-[13.5px] font-semibold">{o.name}</p>
                            <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{o.description}</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[13.5px] font-bold text-primary">+{fmt(o.priceExtra)}</p>
                          {o.daysExtra > 0 && (
                            <p className="text-[11px] text-muted-foreground">+{o.daysExtra} j</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
                      Total ({elementsCount} élément{elementsCount > 1 ? "s" : ""})
                    </p>
                    <p className="mt-0.5 text-xl font-extrabold">{fmt(total)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Livraison {totalDays} jour{totalDays > 1 ? "s" : ""} ouvré{totalDays > 1 ? "s" : ""}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={goToForm}
                  className="mt-3 h-11 w-full gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 text-[14.5px] font-bold text-white"
                >
                  {selectedCount > 0 ? (
                    <PackageCheck className="h-4.5 w-4.5" aria-hidden="true" />
                  ) : (
                    <ArrowRight aria-hidden="true" className="h-4.5 w-4.5" />
                  )}
                  {selectedCount > 0
                    ? `Continuer avec ${selectedCount} option${selectedCount > 1 ? "s" : ""}`
                    : "Continuer avec l'offre de base"}
                </Button>
                <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
                  Vous pourrez tout revoir avant de payer.
                </p>
              </div>
            </div>
          ) : step === "payment" && payPal ? (
            /* ── Étape 3 : paiement PayPal ── */
            <div className="mt-2 space-y-4">
              <div className="rounded-xl bg-muted/60 p-3.5 text-[12.5px] leading-5 text-muted-foreground">
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  Récapitulatif : {fmt(total)} · {totalDays} jours
                </p>
                <p className="mt-1">{recapLine}</p>
                <p className="mt-1">
                  Confirmation envoyée à <strong>{formRef.current.email}</strong>
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
                onClick={() => setStep("options")}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Modifier mes options
              </Button>
            </div>
          ) : authGate ? (
            /* ── Étape 2 GELÉE (v2.1.0) : la finalisation exige un client connecté.
               Le formulaire de coordonnées est remplacé par un panneau de
               connexion — le serveur refuse de toute façon un POST invité
               (401) : ce panneau n'est que la face lisible du garde. ── */
            <div className="mt-3 space-y-4">
              <div className="rounded-xl border-2 border-primary/50 bg-accent/30 p-5 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <UserCheck className="h-5.5 w-5.5" aria-hidden="true" />
                </span>
                <p className="mt-2.5 text-[15px] font-bold">
                  Une connexion protège votre commande
                </p>
                <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                  Google ou un simple lien email : 30 secondes. Vos coordonnées
                  seront préremplies, votre paiement séquestré jusqu'à
                  validation du livrable, et votre suivi garanti dans votre
                  espace « Mes commandes ».
                </p>
                <Button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="mt-4 h-11 w-full gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 text-[14.5px] font-bold text-white"
                >
                  <LogIn className="h-4.5 w-4.5" aria-hidden="true" />
                  Se connecter pour finaliser
                </Button>
                <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
                  Votre sélection ({fmt(total)}) est conservée pendant la connexion.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-full gap-1.5 text-[13px] text-muted-foreground"
                onClick={() => setStep("options")}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Revoir mes options
              </Button>
              {/* Dialogue de connexion empilé (composant partagé du header) */}
              <SignInDialog
                open={authOpen}
                onOpenChange={setAuthOpen}
                googleEnabled={googleEnabled}
                emailEnabled={emailEnabled}
              />
            </div>
          ) : (
            /* ── Étape 2 : coordonnées (PayPal) / formulaire unique (démo) ── */
            <form onSubmit={payPal ? goToPayment : placeOrder} className="mt-2 space-y-4">
              {sessionEmail ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-accent/30 p-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <UserCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold leading-tight">
                      Connecté{sessionName ? ` — ${sessionName}` : ""}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      Commande préremplie pour <strong>{sessionEmail}</strong> : rien à ressaisir.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="dock-order-name">Nom / Société</Label>
                    <Input
                      id="dock-order-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex : Durand SAS"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dock-order-email">Email professionnel *</Label>
                    <Input
                      id="dock-order-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@entreprise.com"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="dock-order-brief">Vos consignes (optionnel)</Label>
                <Textarea
                  id="dock-order-brief"
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
                <p className="mt-1">{recapLine}</p>
                {selectedCount > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-[12px] text-primary underline"
                    onClick={() => setStep("options")}
                  >
                    Modifier mes options
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 text-[14.5px] font-bold text-white"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                {payPal
                  ? "Continuer vers le paiement sécurisé"
                  : submitting
                    ? "Enregistrement…"
                    : "Confirmer la commande"}
              </Button>
              {payPal && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full gap-1.5 text-[13px] text-muted-foreground"
                  onClick={() => setStep("options")}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Modifier mes options
                </Button>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

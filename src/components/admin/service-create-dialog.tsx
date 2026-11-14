"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SERVICE CREATE DIALOG — création d'un service depuis le panneau admin (v2.6.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Formulaire complet en sections guidées (identité, tarif, résumé, description
 *  SGA™, mots-clés sourcés, structure, FAQ, options, preuve sociale) avec :
 *   • un PANNEAU DE CONFORMITÉ EN DIRECT qui réplique les contrôles du garde-fou
 *     (src/lib/guard.ts) champ par champ — l'admin voit AVANT soumission
 *     exactement ce que « bun run guard » vérifiera APRÈS ;
 *   • le même miroir côté serveur (adminServiceCreateSchema + validations de
 *     createServiceFromAdmin) : défense en profondeur, jamais une seule barrière ;
 *   • un écran de récapitulatif après création : URL de la fiche, code catalogue,
 *     miniatures générées (téléchargeables si le système de fichiers est
 *     read-only), et lien direct vers la fiche publique.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Sparkles, ShieldCheck, ExternalLink, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POLE_LABELS } from "@/lib/site";
import {
  BUSINESS_RULES,
  SERVICE_EDITORIAL_RULES as R,
  type AdminSellerOption,
  type AdminServiceCreateResponse,
} from "@/lib/contracts";
import { apiGet, apiSend } from "@/components/admin/api";

/* ─── Utilitaires — miroir client des règles du garde-fou ─────────────────── */

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const n2 = (x: string) => norm(x).replace(/['’]/g, "'");

/** Aperçu du permalien (le slug définitif est calculé serveur). */
function slugifyPreview(s: string): string {
  return norm(s)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

const primaryWords = (p: string) => p.trim().split(/\s+/).filter((w) => w.length > 2).length;
const h2Count = (d: string) => (d.match(/^##\s/gm) || []).length;
const hasBullets = (d: string) => /^[✓✔•-]\s/m.test(d);
const primaryHead = (d: string, primary: string) =>
  !!primary &&
  norm(d.slice(0, 250)).includes(norm(primary).slice(0, Math.min(20, primary.length)));
const lines = (t: string) =>
  t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/* ─── Formes locales du formulaire ────────────────────────────────────────── */

interface FaqEntry {
  q: string;
  a: string;
}
interface ProcessEntry {
  title: string;
  detail: string;
}
interface OptionEntry {
  name: string;
  description: string;
  priceExtra: string;
  daysExtra: string;
}

interface CreateForm {
  title: string;
  name: string;
  category: string;
  poleSlug: string;
  sellerSlug: string;
  basePrice: string;
  deliveryDays: string;
  shortDesc: string;
  description: string;
  primary: string;
  secondary: string;
  longTail: string;
  aiQueries: string;
  features: string[];
  deliverables: string[];
  process: ProcessEntry[];
  faq: FaqEntry[];
  options: OptionEntry[];
  rating: string;
  reviewsCount: string;
  salesCount: string;
  views: string;
}

function initialForm(): CreateForm {
  return {
    title: "",
    name: "",
    category: "",
    poleSlug: "",
    sellerSlug: "",
    basePrice: "25",
    deliveryDays: "2",
    shortDesc: "",
    description: "",
    primary: "",
    secondary: "",
    longTail: "",
    aiQueries: "",
    features: ["", "", "", ""],
    deliverables: ["", "", ""],
    process: [
      { title: "", detail: "" },
      { title: "", detail: "" },
      { title: "", detail: "" },
    ],
    faq: [
      { q: "Comment ", a: "" },
      { q: "", a: "" },
      { q: "", a: "" },
      { q: "", a: "" },
    ],
    options: [],
    rating: "4.8",
    reviewsCount: "0",
    salesCount: "0",
    views: "0",
  };
}

/* ─── Conformité SGA™ en direct (miroir du garde-fou) ─────────────────────── */

interface ComplianceCheck {
  label: string;
  ok: boolean;
  hint: string;
}

function computeCompliance(f: CreateForm): { checks: ComplianceCheck[]; ready: boolean; problems: string[] } {
  const num = (v: string) => Number(v.replace(",", "."));
  const price = num(f.basePrice);
  const days = num(f.deliveryDays);
  const rating = num(f.rating);
  const secondary = lines(f.secondary);
  const longTail = lines(f.longTail);
  const aiQueries = lines(f.aiQueries);
  const faq = f.faq.filter((x) => x.q.trim() || x.a.trim());
  const features = f.features.filter((x) => x.trim());
  const deliverables = f.deliverables.filter((x) => x.trim());
  const process = f.process.filter((x) => x.title.trim() && x.detail.trim());
  const pw = primaryWords(f.primary);

  const checks: ComplianceCheck[] = [
    {
      label: `Titre ${R.TITLE_MIN}-${R.TITLE_MAX} car.`,
      ok: f.title.trim().length >= R.TITLE_MIN && f.title.trim().length <= R.TITLE_MAX,
      hint: "Pattern du catalogue : « Je vais … »",
    },
    { label: "Nom long ≥ 10 car.", ok: f.name.trim().length >= 10, hint: "Nom métier complet de la prestation" },
    { label: "Catégorie renseignée", ok: f.category.trim().length >= 3, hint: "Ex. « Prospection > Fichier entreprises »" },
    { label: "Pôle + vendeur choisis", ok: !!f.poleSlug && !!f.sellerSlug, hint: "Le vendeur spécialiste du pôle est mis en avant" },
    {
      label: `Prix ≥ ${R.CREATE_PRICE_MIN} € · délai ${BUSINESS_RULES.MIN_DELIVERY_DAYS}-${R.DELIVERY_MAX} j`,
      ok: Number.isFinite(price) && price >= R.CREATE_PRICE_MIN && Number.isFinite(days) && days >= BUSINESS_RULES.MIN_DELIVERY_DAYS && days <= R.DELIVERY_MAX,
      hint: "Plancher 20 € : promesse « dès 20 € » du catalogue",
    },
    {
      label: `Résumé carte ${R.SHORTDESC_MIN}-${R.SHORTDESC_MAX} car.`,
      ok: f.shortDesc.trim().length >= R.SHORTDESC_MIN && f.shortDesc.trim().length <= R.SHORTDESC_MAX,
      hint: "Prix + délai + note, comme les cartes existantes",
    },
    { label: `Description ≥ ${R.DESC_MIN} car.`, ok: f.description.length >= R.DESC_MIN, hint: "La richesse rédactionnelle porte le SEO" },
    { label: `≥ ${R.H2_MIN} sections H2`, ok: h2Count(f.description) >= R.H2_MIN, hint: "Lignes commençant par « ## »" },
    { label: "Liste à puces présente", ok: hasBullets(f.description), hint: "Ligne commençant par « - » ou « ✓ »" },
    { label: "Answer-first (primaire en tête)", ok: primaryHead(f.description, f.primary), hint: "Le primaire dans les 250 premiers caractères" },
    {
      label: `Primaire ${R.PRIMARY_WORDS_MIN}-${R.PRIMARY_WORDS_MAX} mots`,
      ok: pw >= R.PRIMARY_WORDS_MIN && pw <= R.PRIMARY_WORDS_MAX,
      hint: "Mots de plus de 2 lettres — tête commerciale",
    },
    { label: "Primaire ancré dans le titre", ok: !!f.primary && n2(f.title).includes(n2(f.primary)), hint: "Le H1 doit contenir le primaire" },
    {
      label: `Secondaires / traîne / requêtes IA ≥ ${R.KEYWORDS_ARRAY_MIN}`,
      ok: secondary.length >= R.KEYWORDS_ARRAY_MIN && longTail.length >= R.KEYWORDS_ARRAY_MIN && aiQueries.length >= R.AI_QUERIES_MIN,
      hint: "Une requête par ligne dans chaque zone",
    },
    {
      label: `FAQ : ${R.FAQ_MIN} complètes, 1re en « comment… »`,
      ok:
        faq.length >= R.FAQ_MIN &&
        faq.every((x) => x.q.trim().endsWith("?") && x.a.trim().length >= R.FAQ_ANSWER_MIN) &&
        /^comment/i.test(faq[0]?.q ?? ""),
      hint: "Réponses ≥ 80 caractères, questions en « ? »",
    },
    { label: `Points forts ≥ ${R.FEATURES_MIN}`, ok: features.length >= R.FEATURES_MIN, hint: "Ce que le client reçoit de concret" },
    { label: `Livrables ≥ ${R.DELIVERABLES_MIN}`, ok: deliverables.length >= R.DELIVERABLES_MIN, hint: "Le résultat matériel de la commande" },
    { label: `Étapes ≥ ${R.PROCESS_MIN}`, ok: process.length >= R.PROCESS_MIN, hint: "La méthode, étape par étape" },
    {
      label: `Note ${BUSINESS_RULES.MIN_RATING}-${BUSINESS_RULES.MAX_RATING}`,
      ok: Number.isFinite(rating) && rating >= BUSINESS_RULES.MIN_RATING && rating <= BUSINESS_RULES.MAX_RATING,
      hint: "Bornes du cahier des charges",
    },
  ];

  const problems = checks.filter((c) => !c.ok).map((c) => `${c.label} — ${c.hint}`);
  return { checks, ready: problems.length === 0, problems };
}

/** Résumé carte proposé à partir des champs déjà saisis (pattern du catalogue). */
function generateShortDesc(f: CreateForm): string {
  const base = (f.primary || f.title.replace(/^Je vais\s+/i, "")).trim();
  const cap = base.charAt(0).toUpperCase() + base.slice(1);
  const note = (Number(f.rating.replace(",", ".")) || 4.8).toString().replace(".", ",");
  const avis = Number(f.reviewsCount) || 0;
  const gen = `${cap} : ${f.basePrice || 20} € en offre de base, ${f.deliveryDays || 2} jours ouvrés de livraison, expert noté ${note}/5 sur ${avis} avis.`;
  return gen.slice(0, R.SHORTDESC_MAX);
}

/* ─── Petits composants de mise en page ──────────────────────────────────── */

function SectionTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-3 mt-7 first:mt-1">
      <h3 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[12px] font-extrabold text-primary">
          {n}
        </span>
        {title}
      </h3>
      {hint && <p className="mt-1 pl-8 text-[12.5px] leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CharMeter({ value, min, max }: { value: number; min: number; max: number }) {
  const ok = value >= min && value <= max;
  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        ok ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
      }`}
    >
      {value} / {min}-{max}
    </span>
  );
}

/* ─── Composant principal ────────────────────────────────────────────────── */

export function ServiceCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé après une création réussie (rafraîchit la table parente). */
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateForm>(initialForm);
  const [sellers, setSellers] = useState<AdminSellerOption[] | null>(null);
  const [sellersError, setSellersError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AdminServiceCreateResponse | null>(null);

  const set = useCallback(<K extends keyof CreateForm>(key: K, value: CreateForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* Chargement du référentiel vendeurs à la première ouverture. */
  useEffect(() => {
    if (!open || sellers || sellersError) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await apiGet<{ sellers: AdminSellerOption[] }>("/api/admin/sellers");
        if (!cancelled) setSellers(d.sellers);
      } catch (e) {
        if (!cancelled) setSellersError(e instanceof Error ? e.message : "Vendeurs indisponibles");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sellers, sellersError]);

  const compliance = useMemo(() => computeCompliance(form), [form]);

  /* Vendeurs : spécialistes du pôle choisi en tête. */
  const orderedSellers = useMemo(() => {
    if (!sellers) return [];
    const specialists = sellers.filter((s) => s.specialtyPoles.includes(form.poleSlug));
    const others = sellers.filter((s) => !s.specialtyPoles.includes(form.poleSlug));
    return [...specialists, ...others];
  }, [sellers, form.poleSlug]);

  async function submit() {
    if (submitting || !compliance.ready) return;
    setSubmitting(true);
    try {
      const num = (v: string) => Number(v.replace(",", "."));
      const payload = {
        title: form.title.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        poleSlug: form.poleSlug,
        sellerSlug: form.sellerSlug,
        basePrice: num(form.basePrice),
        deliveryDays: Math.round(num(form.deliveryDays)),
        shortDesc: form.shortDesc.trim(),
        description: form.description,
        keywords: {
          primary: form.primary.trim(),
          secondary: lines(form.secondary),
          longTail: lines(form.longTail),
          aiQueries: lines(form.aiQueries),
        },
        faq: form.faq
          .filter((x) => x.q.trim() && x.a.trim())
          .map((x) => ({ q: x.q.trim(), a: x.a.trim() })),
        features: form.features.map((x) => x.trim()).filter(Boolean),
        deliverables: form.deliverables.map((x) => x.trim()).filter(Boolean),
        process: form.process
          .filter((x) => x.title.trim() && x.detail.trim())
          .map((x) => ({ title: x.title.trim(), detail: x.detail.trim() })),
        options: form.options
          .filter((x) => x.name.trim())
          .map((x) => ({
            name: x.name.trim(),
            description: x.description.trim(),
            priceExtra: num(x.priceExtra) || 0,
            daysExtra: Math.round(num(x.daysExtra) || 0),
            monthly: false,
          })),
        rating: num(form.rating),
        reviewsCount: Math.max(0, Math.round(num(form.reviewsCount) || 0)),
        salesCount: Math.max(0, Math.round(num(form.salesCount) || 0)),
        views: Math.max(0, Math.round(num(form.views) || 0)),
      };
      const res = await apiSend<AdminServiceCreateResponse>("/api/admin/services", "POST", payload);
      setResult(res);
      onCreated();
      toast.success(`Service créé : ${res.service.title}`, {
        description: `${res.service.code} · /services/${res.service.slug}`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible", { duration: 8000 });
    } finally {
      setSubmitting(false);
    }
  }

  function closeDialog(openState: boolean) {
    if (!openState) {
      setResult(null);
      setForm(initialForm());
    }
    onOpenChange(openState);
  }

  function resetForAnother() {
    setResult(null);
    setForm(initialForm());
  }

  /* ── Rendu : récapitulatif après création ───────────────────────────────── */
  if (result) {
    const thumbs = result.thumbs.written
      ? result.thumbs.files.map((f) => f.replace(/^public/, ""))
      : (result.thumbs.dataUrls ?? []);
    return (
      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              </span>
              Service créé et conforme à la garde
            </DialogTitle>
            <DialogDescription>
              La fiche est publiée et référencée immédiatement (sitemap, catalogue, chat IA).
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded-2xl border border-border bg-card p-5">
            <p className="text-[13px] text-muted-foreground">{result.service.code} · pôle {POLE_LABELS[result.service.poleSlug] ?? result.service.poleSlug}</p>
            <p className="mt-1 text-lg font-extrabold leading-tight">{result.service.title}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{result.service.optionsCount} options additionnelles</Badge>
              <Button asChild variant="outline" size="sm" className="h-8">
                <Link href={result.service.url} target="_blank" rel="noreferrer">
                  Ouvrir la fiche publique
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[13px] font-semibold">Miniatures générées (générateur officiel du catalogue)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {thumbs.map((src, i) => (
                <figure key={i} className="overflow-hidden rounded-xl border border-border">
                  <img src={src} alt={`Miniature ${i + 1} de ${result.service.title}`} className="aspect-[8/5] w-full object-cover" />
                </figure>
              ))}
            </div>
            {!result.thumbs.written && (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12.5px] leading-5 text-amber-800">
                Système de fichiers non inscriptible (production Vercel) : les miniatures sont
                embarquées en data URIs pour que la fiche soit illustrée immédiatement.
                Pour la référence du dépôt, téléchargez puis commitez ces fichiers dans{" "}
                <code>public/thumbs/</code> avant le prochain déploiement.
                <div className="mt-2 flex flex-wrap gap-2">
                  {(result.thumbs.dataUrls ?? []).map((d, i) => (
                    <a
                      key={i}
                      href={d}
                      download={`b2bpro-thumb-${result.service.slug}-${i + 1}.svg`}
                      className="rounded-full border border-amber-400 bg-white px-3 py-1 text-[11.5px] font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      SVG {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2.5">
            <Button variant="outline" onClick={resetForAnother}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Créer un autre service
            </Button>
            <Button onClick={() => closeDialog(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* ── Rendu : le formulaire complet ─────────────────────────────────────── */
  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Créer un service</DialogTitle>
          <DialogDescription>
            Fiche complète conforme au standard rédactionnel SGA™ (SEO/GEO/AIO) — la
            conformité est vérifiée en direct ci-dessous, puis à nouveau côté serveur.
          </DialogDescription>
        </DialogHeader>

        {sellersError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
            {sellersError} — rechargez la page ou réessayez dans quelques instants.
          </div>
        )}

        {/* ── 1. Identité ─────────────────────────────────────────────────── */}
        <SectionTitle n={1} title="Identité de la prestation" hint="Le titre suit le pattern du catalogue « Je vais … » et porte le mot-clé primaire." />
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="svc-title">
              Titre commercial (H1)
              <CharMeter value={form.title.trim().length} min={R.TITLE_MIN} max={R.TITLE_MAX} />
            </Label>
            <Input
              id="svc-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Je vais …"
              maxLength={120}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="svc-name">Nom long métier</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Radar des Nouvelles Entreprises Créées (INSEE / Sirene)"
                maxLength={140}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="svc-category">Catégorie fine</Label>
              <Input
                id="svc-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Prospection > Fichier entreprises"
                maxLength={90}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Pôle métier</Label>
              <Select value={form.poleSlug} onValueChange={(v) => set("poleSlug", v)}>
                <SelectTrigger aria-label="Pôle métier">
                  <SelectValue placeholder="Choisir un pôle" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(POLE_LABELS).map(([slug, label]) => (
                    <SelectItem key={slug} value={slug}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Vendeur porteur</Label>
              <Select value={form.sellerSlug} onValueChange={(v) => set("sellerSlug", v)}>
                <SelectTrigger aria-label="Vendeur porteur">
                  <SelectValue placeholder={sellers === null ? "Chargement…" : "Choisir un vendeur"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {orderedSellers.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.name} · {s.countryLabel}
                      {s.specialtyPoles.includes(form.poleSlug) ? " — spécialiste" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Permalien : <code className="rounded bg-muted px-1 py-0.5">/services/{slugifyPreview(form.title) || "…"}</code>{" "}
            (finalisé serveur, unique)
          </p>
        </div>

        {/* ── 2. Tarif ─────────────────────────────────────────────────────── */}
        <SectionTitle n={2} title="Tarif et délai" hint={`Plancher ${R.CREATE_PRICE_MIN} € — promesse « dès 20 € » du catalogue.`} />
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="grid gap-1.5">
            <Label htmlFor="svc-price">Prix de l&apos;offre de base (€)</Label>
            <Input
              id="svc-price"
              inputMode="decimal"
              value={form.basePrice}
              onChange={(e) => set("basePrice", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-days">Délai (jours ouvrés)</Label>
            <Input
              id="svc-days"
              inputMode="numeric"
              value={form.deliveryDays}
              onChange={(e) => set("deliveryDays", e.target.value)}
            />
          </div>
        </div>

        {/* ── 3. Résumé carte ──────────────────────────────────────────────── */}
        <SectionTitle n={3} title="Résumé carte (shortDesc)" hint="Prix + délai + note — le texte des cartes du catalogue et des moteurs de recherche." />
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="svc-short">
              Résumé
              <CharMeter value={form.shortDesc.trim().length} min={R.SHORTDESC_MIN} max={R.SHORTDESC_MAX} />
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[12.5px]"
              onClick={() => set("shortDesc", generateShortDesc(form))}
              disabled={!form.title.trim() && !form.primary.trim()}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Générer
            </Button>
          </div>
          <Textarea
            id="svc-short"
            rows={2}
            value={form.shortDesc}
            onChange={(e) => set("shortDesc", e.target.value)}
            maxLength={280}
          />
        </div>

        {/* ── 4. Description SGA™ ─────────────────────────────────────────── */}
        <SectionTitle
          n={4}
          title="Description complète (markdown SGA™)"
          hint={`≥ ${R.DESC_MIN} caractères, ≥ ${R.H2_MIN} sections « ## », listes à puces, et le primaire dès les premiers mots (answer-first).`}
        />
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
            <Badge variant={form.description.length >= R.DESC_MIN ? "default" : "secondary"} className="tabular-nums">
              {form.description.length} car.
            </Badge>
            <Badge variant={h2Count(form.description) >= R.H2_MIN ? "default" : "secondary"} className="tabular-nums">
              {h2Count(form.description)} H2
            </Badge>
            <Badge variant={hasBullets(form.description) ? "default" : "secondary"}>
              {hasBullets(form.description) ? "puces OK" : "aucune puce"}
            </Badge>
            <Badge variant={primaryHead(form.description, form.primary) ? "default" : "secondary"}>
              {primaryHead(form.description, form.primary) ? "answer-first OK" : "primaire absent des 250 premiers"}
            </Badge>
          </div>
          <Textarea
            aria-label="Description complète markdown"
            rows={14}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={"Premier paragraphe : réponse immédiate qui porte le mot-clé primaire…\n\n## Première section\n- point concret\n\n## Deuxième section…"}
            className="font-mono text-[12.5px]"
          />
        </div>

        {/* ── 5. Mots-clés sourcés ─────────────────────────────────────────── */}
        <SectionTitle n={5} title="Mots-clés sourcés (primaire, secondaires, traîne, IA)" hint="Le primaire est la tête commerciale : 3-5 mots, ancré dans le titre, unique sur tout le catalogue." />
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="svc-primary">
              Primaire
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                  primaryWords(form.primary) >= R.PRIMARY_WORDS_MIN && primaryWords(form.primary) <= R.PRIMARY_WORDS_MAX
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {primaryWords(form.primary)} mots
              </span>
              {form.primary.trim() && !n2(form.title).includes(n2(form.primary)) && (
                <span className="ml-1 text-[11px] font-semibold text-red-600">absent du titre</span>
              )}
            </Label>
            <Input
              id="svc-primary"
              value={form.primary}
              onChange={(e) => set("primary", e.target.value)}
              placeholder="identifier les nouvelles entreprises créées"
              maxLength={100}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="svc-secondary">Secondaires (≥ 3, un par ligne)</Label>
              <Textarea
                id="svc-secondary"
                rows={5}
                value={form.secondary}
                onChange={(e) => set("secondary", e.target.value)}
                placeholder={"génération de prospects\nbase de données d'entreprises france\nintent data B2B"}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="svc-longtail">Longue traîne (≥ 3, un par ligne)</Label>
              <Textarea
                id="svc-longtail"
                rows={5}
                value={form.longTail}
                onChange={(e) => set("longTail", e.target.value)}
                placeholder={"comment … dans votre secteur\ncombien coûte …\n… freelance francophone"}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-ai">Requêtes IA — aiQueries (≥ 3, un par ligne)</Label>
            <Textarea
              id="svc-ai"
              rows={3}
              value={form.aiQueries}
              onChange={(e) => set("aiQueries", e.target.value)}
              placeholder={"quel prestataire pour …\nmeilleur service de … en 2026\n… vaut-il le prix"}
            />
          </div>
        </div>

        {/* ── 6. Points forts / livrables ──────────────────────────────────── */}
        <SectionTitle n={6} title={`Points forts (≥ ${R.FEATURES_MIN}) et livrables (≥ ${R.DELIVERABLES_MIN})`} hint="Le concret : ce que le client reçoit, champ par champ." />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Points forts</Label>
              <Badge variant={form.features.filter((x) => x.trim()).length >= R.FEATURES_MIN ? "default" : "secondary"} className="tabular-nums">
                {form.features.filter((x) => x.trim()).length}/{R.FEATURES_MIN}
              </Badge>
            </div>
            {form.features.map((v, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  value={v}
                  aria-label={`Point fort ${i + 1}`}
                  maxLength={220}
                  onChange={(e) =>
                    set(
                      "features",
                      form.features.map((x, j) => (j === i ? e.target.value : x))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  aria-label={`Supprimer le point fort ${i + 1}`}
                  onClick={() => set("features", form.features.filter((_, j) => j !== i))}
                  disabled={form.features.length <= 1}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set("features", [...form.features, ""])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Ajouter un point fort
            </Button>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Livrables</Label>
              <Badge variant={form.deliverables.filter((x) => x.trim()).length >= R.DELIVERABLES_MIN ? "default" : "secondary"} className="tabular-nums">
                {form.deliverables.filter((x) => x.trim()).length}/{R.DELIVERABLES_MIN}
              </Badge>
            </div>
            {form.deliverables.map((v, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  value={v}
                  aria-label={`Livrable ${i + 1}`}
                  maxLength={420}
                  onChange={(e) =>
                    set(
                      "deliverables",
                      form.deliverables.map((x, j) => (j === i ? e.target.value : x))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  aria-label={`Supprimer le livrable ${i + 1}`}
                  onClick={() => set("deliverables", form.deliverables.filter((_, j) => j !== i))}
                  disabled={form.deliverables.length <= 1}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set("deliverables", [...form.deliverables, ""])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Ajouter un livrable
            </Button>
          </div>
        </div>

        {/* ── 7. Méthode ───────────────────────────────────────────────────── */}
        <SectionTitle n={7} title={`Méthode en étapes (≥ ${R.PROCESS_MIN})`} hint="Le rang de chaque étape est posé automatiquement." />
        <div className="grid gap-3">
          {form.process.map((p, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <Input
                  value={p.title}
                  aria-label={`Titre de l'étape ${i + 1}`}
                  placeholder="Prise de commande et consignes"
                  maxLength={130}
                  onChange={(e) =>
                    set(
                      "process",
                      form.process.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  aria-label={`Supprimer l'étape ${i + 1}`}
                  onClick={() => set("process", form.process.filter((_, j) => j !== i))}
                  disabled={form.process.length <= 1}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <Textarea
                rows={2}
                value={p.detail}
                aria-label={`Détail de l'étape ${i + 1}`}
                placeholder="Ce qui se passe concrètement, avec les engagements mesurables…"
                maxLength={640}
                onChange={(e) =>
                  set(
                    "process",
                    form.process.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x))
                  )
                }
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set("process", [...form.process, { title: "", detail: "" }])}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Ajouter une étape
          </Button>
        </div>

        {/* ── 8. FAQ ───────────────────────────────────────────────────────── */}
        <SectionTitle
          n={8}
          title={`FAQ citable (≥ ${R.FAQ_MIN})`}
          hint="La 1re question doit commencer par « comment… » (activateur GEO) ; chaque réponse ≥ 80 caractères."
        />
        <div className="grid gap-3">
          {form.faq.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  Q{i + 1}
                </span>
                <Input
                  value={f.q}
                  aria-label={`Question ${i + 1}`}
                  placeholder={i === 0 ? "Comment … ?" : "Question… ?"}
                  maxLength={210}
                  onChange={(e) =>
                    set(
                      "faq",
                      form.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  aria-label={`Supprimer la question ${i + 1}`}
                  onClick={() => set("faq", form.faq.filter((_, j) => j !== i))}
                  disabled={form.faq.length <= 1}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <Textarea
                rows={2}
                value={f.a}
                aria-label={`Réponse ${i + 1}`}
                placeholder={`Réponse substantielle (≥ ${R.FAQ_ANSWER_MIN} caractères), reprise telle quelle par les moteurs et les IA…`}
                maxLength={1500}
                onChange={(e) =>
                  set(
                    "faq",
                    form.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x))
                  )
                }
              />
              <p className="text-[11px] text-muted-foreground">
                {f.a.trim().length} car.
                {f.q.trim() && !f.q.trim().endsWith("?") && " — la question doit finir par « ? »"}
                {f.a.trim() && f.a.trim().length < R.FAQ_ANSWER_MIN && ` — réponse trop courte (${R.FAQ_ANSWER_MIN} min)`}
              </p>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set("faq", [...form.faq, { q: "", a: "" }])}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Ajouter une question
          </Button>
        </div>

        {/* ── 9. Options additionnelles ────────────────────────────────────── */}
        <SectionTitle n={9} title={`Options additionnelles (0 à ${R.OPTIONS_MAX})`} hint="Upsell ComeUp : renforts facturés en sus de l'offre de base." />
        <div className="grid gap-3">
          {form.options.map((o, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={o.name}
                  aria-label={`Nom de l'option ${i + 1}`}
                  placeholder="Pack 150 Entreprises"
                  maxLength={90}
                  onChange={(e) =>
                    set(
                      "options",
                      form.options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  aria-label={`Supprimer l'option ${i + 1}`}
                  onClick={() => set("options", form.options.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <Textarea
                rows={2}
                value={o.description}
                aria-label={`Description de l'option ${i + 1}`}
                placeholder="Ce que l'option ajoute concrètement au livrable…"
                maxLength={640}
                onChange={(e) =>
                  set(
                    "options",
                    form.options.map((x, j) => (j === i ? { ...x, description: e.target.value } : x))
                  )
                }
              />
              <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
                <div className="grid gap-1">
                  <Label htmlFor={`opt-price-${i}`} className="text-[12px]">
                    Supplément (€)
                  </Label>
                  <Input
                    id={`opt-price-${i}`}
                    inputMode="decimal"
                    value={o.priceExtra}
                    onChange={(e) =>
                      set(
                        "options",
                        form.options.map((x, j) => (j === i ? { ...x, priceExtra: e.target.value } : x))
                      )
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`opt-days-${i}`} className="text-[12px]">
                    Jours en sus
                  </Label>
                  <Input
                    id={`opt-days-${i}`}
                    inputMode="numeric"
                    value={o.daysExtra}
                    onChange={(e) =>
                      set(
                        "options",
                        form.options.map((x, j) => (j === i ? { ...x, daysExtra: e.target.value } : x))
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          {form.options.length < R.OPTIONS_MAX && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() => set("options", [...form.options, { name: "", description: "", priceExtra: "", daysExtra: "" }])}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Ajouter une option
            </Button>
          )}
        </div>

        {/* ── 10. Preuve sociale initiale ─────────────────────────────────── */}
        <SectionTitle n={10} title="Preuve sociale initiale" hint="Honnête par défaut : aucune note mensongère — note dans les bornes 4,2-5,0, compteurs à 0 tant qu'il n'y a ni avis ni vente réels." />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:max-w-2xl">
          <div className="grid gap-1.5">
            <Label htmlFor="svc-rating">Note (4,2-5,0)</Label>
            <Input id="svc-rating" inputMode="decimal" value={form.rating} onChange={(e) => set("rating", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-reviews">Avis</Label>
            <Input id="svc-reviews" inputMode="numeric" value={form.reviewsCount} onChange={(e) => set("reviewsCount", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-sales">Ventes</Label>
            <Input id="svc-sales" inputMode="numeric" value={form.salesCount} onChange={(e) => set("salesCount", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-views">Vues</Label>
            <Input id="svc-views" inputMode="numeric" value={form.views} onChange={(e) => set("views", e.target.value)} />
          </div>
        </div>

        {/* ── Panneau de conformité + actions ─────────────────────────────── */}
        <div className="sticky bottom-0 z-10 mt-8 rounded-2xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-bold">
            <ShieldCheck className={`h-4 w-4 ${compliance.ready ? "text-emerald-600" : "text-amber-600"}`} aria-hidden="true" />
            Conformité SGA™ (miroir de la garde d&apos;intégrité)
            <Badge variant={compliance.ready ? "default" : "secondary"} className="ml-auto">
              {compliance.checks.filter((c) => c.ok).length}/{compliance.checks.length} contrôles
            </Badge>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {compliance.checks.map((c) => (
              <span
                key={c.label}
                title={`${c.label} — ${c.hint}`}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  c.ok ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"
                }`}
              >
                {c.ok ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
                {c.label}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] leading-4 text-muted-foreground" role="status">
              {compliance.ready
                ? "Fiche conforme : elle passera la garde d'intégrité (l'unicité du primaire reste vérifiée serveur)."
                : `Complétez : ${compliance.problems.slice(0, 2).join(" ; ")}${compliance.problems.length > 2 ? "…" : ""}`}
            </p>
            <Button type="button" onClick={() => void submit()} disabled={submitting || !compliance.ready} className="shrink-0">
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
              Créer le service
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

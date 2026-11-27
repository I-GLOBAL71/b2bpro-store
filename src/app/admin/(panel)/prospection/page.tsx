"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FlaskConical,
  Globe,
  Mail,
  Plus,
  Rocket,
  Save,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiSend } from "@/components/admin/api";
import { AdminPageHeader, NumberField, SwitchField, TextField } from "@/components/admin/fields";
import type {
  ProspectRecord,
  ProspectingConfig,
  SocialKitPost,
  SocialSyndicationRecord,
  WaveRunSummary,
} from "@/lib/prospecting/types";

interface DashboardPayload {
  config: ProspectingConfig;
  stats: {
    emailsSentToday: number;
    dailyEmailCap: number;
    totalAudited: number;
    totalEmailed: number;
    totalFollowedUp: number;
    totalOptouts: number;
    devtoPublishedCount: number;
  };
  brevo: {
    configured: boolean;
    ok: boolean;
    creditsRemaining: number;
    senderEmail: string;
    error?: string;
  };
  ledger: ProspectRecord[];
  optouts: string[];
  social: {
    posts: SocialSyndicationRecord[];
    kit: SocialKitPost[];
  };
  rssUrls: {
    pinterest: string;
    syndication: string;
  };
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  emailed: { label: "E-mail envoyé", cls: "bg-emerald-500/15 text-emerald-700" },
  followed_up: { label: "Relancé (J+3)", cls: "bg-sky-500/15 text-sky-700" },
  audited: { label: "Analysé", cls: "bg-amber-500/15 text-amber-700" },
  optout: { label: "Ne plus écrire", cls: "bg-stone-200 text-stone-700" },
  bounced: { label: "Adresse refusée", cls: "bg-red-500/15 text-red-700" },
  error: { label: "Erreur envoi", cls: "bg-red-500/15 text-red-700" },
};

function formatShortDate(iso?: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function AdminProspectionPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configDraft, setConfigDraft] = useState<ProspectingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<"live" | "dry" | null>(null);
  const [lastWave, setLastWave] = useState<WaveRunSummary | null>(null);

  const [manualUrl, setManualUrl] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [addingSite, setAddingSite] = useState(false);

  const load = useCallback(async () => {
    try {
      const payload = await apiGet<DashboardPayload>("/api/admin/prospecting");
      setData(payload);
      setConfigDraft(payload.config);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les données");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const payload = await apiGet<DashboardPayload>("/api/admin/prospecting");
        if (!alive) return;
        setData(payload);
        setConfigDraft(payload.config);
        setError(null);
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : "Impossible de charger les données");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handleRunWave(dryRun: boolean) {
    setRunning(dryRun ? "dry" : "live");
    try {
      const res = await apiSend<{ ok: true; summary: WaveRunSummary }>(
        "/api/admin/prospecting/run",
        "POST",
        {
          wave: dryRun ? "test-admin" : "admin",
          emailLimit: dryRun ? 3 : 5,
          dryRun,
          skipSocial: false,
        },
      );
      setLastWave(res.summary);
      toast.success(
        dryRun
          ? `Test terminé : ${res.summary.newAudited} entreprise(s) analysée(s), aucun e-mail envoyé.`
          : `Envoi terminé : ${res.summary.initialSent + res.summary.followupsSent} e-mail(s) envoyé(s).`,
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le lancement a échoué");
    } finally {
      setRunning(null);
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!configDraft) return;
    setSaving(true);
    try {
      await apiSend("/api/admin/prospecting", "PATCH", {
        enabled: configDraft.enabled,
        dailyEmailCap: configDraft.dailyEmailCap,
        dailyDevtoCap: configDraft.dailyDevtoCap,
        followupDelayDays: configDraft.followupDelayDays,
        senderFullName: configDraft.senderFullName,
        senderRole: configDraft.senderRole,
        senderCity: configDraft.senderCity,
      });
      toast.success("Vos réglages sont bien enregistrés !");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    setAddingSite(true);
    try {
      await apiSend("/api/admin/prospecting", "POST", {
        action: "add_prospect",
        websiteUrl: manualUrl.trim(),
        ...(manualEmail.trim() ? { email: manualEmail.trim() } : {}),
      });
      toast.success("Site analysé et ajouté à la liste !");
      setManualUrl("");
      setManualEmail("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analyse impossible");
    } finally {
      setAddingSite(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié !`);
    } catch {
      toast.error("Copie impossible sur ce navigateur");
    }
  }

  if (error) {
    return (
      <div className="w-full min-w-0 rounded-2xl border border-red-200 bg-red-50 p-5 text-[15px] text-red-700">
        {error}
      </div>
    );
  }

  if (!data || !configDraft) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-8 break-words">
      <AdminPageHeader
        title="Prospection Automatique"
        description="Trouve des entreprises en France, analyse leur site, envoie un message personnalisé et publie sur vos réseaux automatiquement."
        icon={<Rocket className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      {/* Boutons d'action principaux — grands et évidents */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Envoyer maintenant</h2>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Envoi e-mail B2B (1-à-1) :{" "}
              <span className="font-semibold text-foreground">
                {data.brevo.ok ? `Prêt ✓ (${data.brevo.senderEmail})` : "En pause (configuration requise)"}
              </span>
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              disabled={running !== null}
              onClick={() => void handleRunWave(false)}
              className="flex min-h-[60px] items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Rocket className="h-5 w-5 shrink-0" aria-hidden="true" />
              {running === "live" ? "Envoi en cours..." : "Lancer l'envoi maintenant"}
            </button>

            <button
              type="button"
              disabled={running !== null}
              onClick={() => void handleRunWave(true)}
              className="flex min-h-[60px] items-center justify-center gap-2.5 rounded-2xl border border-border bg-background px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted disabled:opacity-50"
            >
              <FlaskConical className="h-5 w-5 shrink-0" aria-hidden="true" />
              {running === "dry" ? "Test en cours..." : "Tester sans rien envoyer"}
            </button>
          </div>
        </div>

        {!data.brevo.ok && data.brevo.error && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[14px] leading-6 text-amber-950">
            <p className="font-bold">Envoi d&apos;e-mails B2B en pause (les articles Dev.to restent actifs)</p>
            <p className="mt-1">{data.brevo.error}</p>
          </div>
        )}

        {lastWave && (
          <div className="mt-5 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-[14px] text-stone-900">
            <p className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              {lastWave.dryRun ? "Résultat du test à blanc" : "Résultat du dernier envoi"}
            </p>
            <p>
              Entreprises analysées : <strong>{lastWave.newAudited}</strong> · Premiers e-mails :{" "}
              <strong>{lastWave.initialSent}</strong> · Relances :{" "}
              <strong>{lastWave.followupsSent}</strong>
              {lastWave.devtoPublished && (
                <>
                  {" "}
                  · Article Dev.to :{" "}
                  <a
                    href={lastWave.devtoPublished.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-emerald-700 underline"
                  >
                    Voir l&apos;article
                  </a>
                </>
              )}
            </p>
            {lastWave.previewSamples.slice(0, 2).map((s) => (
              <div key={s.email} className="rounded-xl border border-emerald-200 bg-white p-3">
                <p className="font-bold">
                  {s.companyName} ({s.email})
                </p>
                <p className="text-[13px] text-muted-foreground">Objet : {s.subject}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4 chiffres simples */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            Envoyés aujourd&apos;hui
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">
            {data.stats.emailsSentToday} / {data.stats.dailyEmailCap}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
            <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
            Entreprises trouvées
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">
            {data.stats.totalAudited}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
            <Share2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Articles Dev.to publiés
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">
            {data.stats.devtoPublishedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Désinscriptions respectées
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums">
            {data.stats.totalOptouts}
          </p>
        </div>
      </section>

      {/* Réglages simples */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold">Mes réglages</h2>
        <form onSubmit={handleSaveConfig} className="space-y-5">
          <SwitchField
            label="Envois automatiques activés"
            description="Si décoché, aucun message ne part tout seul."
            checked={configDraft.enabled}
            onChange={(checked) => setConfigDraft({ ...configDraft, enabled: checked })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Maximum d'e-mails par jour"
              description="Recommandé : entre 20 et 60 par jour."
              value={configDraft.dailyEmailCap}
              min={1}
              max={280}
              onChange={(v) => setConfigDraft({ ...configDraft, dailyEmailCap: v })}
            />
            <NumberField
              label="Relance polie après combien de jours ?"
              description="Une seule relance envoyée automatiquement."
              value={configDraft.followupDelayDays}
              min={1}
              max={14}
              onChange={(v) => setConfigDraft({ ...configDraft, followupDelayDays: v })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Prénom et nom de l'expéditeur"
              value={configDraft.senderFullName}
              onChange={(s) => setConfigDraft({ ...configDraft, senderFullName: s })}
            />
            <TextField
              label="Ville et pays affichés"
              value={configDraft.senderCity}
              onChange={(s) => setConfigDraft({ ...configDraft, senderCity: s })}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            <Save className="h-5 w-5" aria-hidden="true" />
            {saving ? "Enregistrement..." : "Enregistrer mes réglages"}
          </button>
        </form>
      </section>

      {/* Analyser un site précis à la demande */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">Ajouter une entreprise précise</h2>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Collez l&apos;adresse du site d&apos;une entreprise pour l&apos;analyser tout de suite.
        </p>
        <form onSubmit={handleAddSite} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="exemple-entreprise.fr"
            required
            className="min-h-[56px] rounded-2xl border border-input bg-background px-4 text-[15px]"
          />
          <input
            type="email"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            placeholder="E-mail (facultatif)"
            className="min-h-[56px] rounded-2xl border border-input bg-background px-4 text-[15px]"
          />
          <button
            type="submit"
            disabled={addingSite}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            {addingSite ? "Analyse..." : "Analyser ce site"}
          </button>
        </form>
      </section>

      {/* Réseaux sociaux & flux RSS gratuits */}
      <section className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Réseaux sociaux et flux automatiques</h2>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Copiez ces textes prêts à publier ou collez les liens RSS gratuits dans Pinterest et Hashnode.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-[13px] font-bold">Flux RSS Pinterest Business</p>
            <p className="mt-1 break-all text-[12.5px] text-muted-foreground">
              {data.rssUrls.pinterest}
            </p>
            <button
              type="button"
              onClick={() => void copyText(data.rssUrls.pinterest, "Lien RSS Pinterest")}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold hover:bg-muted"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copier le lien Pinterest
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-[13px] font-bold">Flux RSS Hashnode &amp; Medium</p>
            <p className="mt-1 break-all text-[12.5px] text-muted-foreground">
              {data.rssUrls.syndication}
            </p>
            <button
              type="button"
              onClick={() => void copyText(data.rssUrls.syndication, "Lien RSS articles")}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold hover:bg-muted"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copier le lien articles
            </button>
          </div>
        </div>

        {data.social.posts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[15px] font-bold">Derniers articles publiés sur Dev.to</h3>
            <ul className="space-y-2">
              {data.social.posts.slice(0, 6).map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-[14px]"
                >
                  <span className="min-w-0 flex-1 font-medium">{p.title}</span>
                  <a
                    href={p.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 text-[13px] font-bold text-primary hover:bg-primary/20"
                  >
                    Ouvrir
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {data.social.kit.map((post) => (
            <div key={post.id} className="flex flex-col justify-between rounded-2xl border border-border p-4">
              <div>
                <p className="text-[14px] font-bold text-primary">{post.label}</p>
                <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[13px] leading-5 text-foreground">
                  {post.content}
                </pre>
              </div>
              <button
                type="button"
                onClick={() => void copyText(post.content, post.label)}
                className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[14px] font-bold text-primary-foreground hover:opacity-90"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copier ce message
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Tableau des entreprises contactées */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">Dernières entreprises contactées</h2>
        {data.ledger.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted-foreground">
            Aucune entreprise enregistrée pour le moment. Appuyez sur « Lancer l&apos;envoi maintenant » ci-dessus pour démarrer.
          </p>
        ) : (
          <div className="mt-4 w-full min-w-0 max-w-full overflow-x-auto touch-pan-x rounded-2xl border border-border">
            <table className="w-full min-w-[680px] text-left text-[13.5px]">
              <thead className="bg-muted/60 text-[12px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Entreprise</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Service proposé</th>
                  <th className="px-4 py-3">État</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.ledger.map((row) => {
                  const badge = STATUS_BADGES[row.status] ?? {
                    label: row.status,
                    cls: "bg-muted text-foreground",
                  };
                  return (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <p className="font-bold">{row.companyName}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {row.domain} · {row.city}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12.5px]">{row.email}</td>
                      <td className="px-4 py-3">
                        <p className="line-clamp-1 font-medium">{row.serviceTitle}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {row.findings?.summaryLine}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[12px] text-muted-foreground">
                        {formatShortDate(row.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

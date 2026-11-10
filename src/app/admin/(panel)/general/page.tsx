"use client";

import { useState } from "react";
import { Settings2, Search, Wrench, ShieldCheck, TriangleAlert } from "lucide-react";
import { useSettingsGroup } from "@/components/admin/use-settings";
import { apiGet } from "@/components/admin/api";
import { AdminPageHeader, SaveBar, SwitchField, TextAreaField, TextField } from "@/components/admin/fields";

export default function AdminGeneralPage() {
  const { value, loading, error, dirty, saving, patch, save, reset } = useSettingsGroup("seo");
  const maintenance = useSettingsGroup("maintenance");
  const [usingDefaultPassword, setUsingDefaultPassword] = useState<boolean | null>(null);

  if (loading || maintenance.loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (error || !value || !maintenance.value) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">Erreur de chargement de la configuration</div>;
  }

  // Sonde unique de l'état du mot de passe (l'admin voit une alerte si défaut).
  if (usingDefaultPassword === null) {
    void apiGet<{ usingDefaultPassword: boolean }>("/api/admin/session")
      .then((s) => setUsingDefaultPassword(s.usingDefaultPassword))
      .catch(() => setUsingDefaultPassword(false));
  }

  const dirtyAll = dirty || maintenance.dirty;
  const savingAll = saving || maintenance.saving;

  async function saveAll() {
    await Promise.all([dirty && save(), maintenance.dirty && maintenance.save()]);
  }
  function resetAll() {
    reset();
    maintenance.reset();
  }

  return (
    <div>
      <AdminPageHeader
        title="Général & SEO"
        description="Métadonnées de la page d'accueil, mode maintenance et sécurité de l'accès administrateur."
        icon={<Settings2 className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void saveAll();
        }}
      >
        {/* ── SEO ── */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 flex items-center gap-2 text-[14px] font-bold">
            <Search className="h-4 w-4 text-primary" aria-hidden="true" />
            SEO de la page d&apos;accueil
          </p>
          <div className="space-y-4">
            <TextField
              label="Balise titre (title)"
              description="Laisser vide pour conserver le titre optimisé par défaut. 60-65 caractères idéalement."
              value={value.homeTitle}
              onChange={(s) => patch("homeTitle", s)}
              maxLength={120}
              placeholder="b2bpro.store : services digitaux B2B francophones dès 20 €…"
              id="seo-title"
            />
            <TextAreaField
              label="Méta description"
              description="Laisser vide pour conserver la description par défaut (optimisée AIO)."
              value={value.homeDescription}
              onChange={(s) => patch("homeDescription", s)}
              rows={3}
              maxLength={320}
              id="seo-description"
            />
          </div>
        </section>

        {/* ── Maintenance ── */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 flex items-center gap-2 text-[14px] font-bold">
            <Wrench className="h-4 w-4 text-primary" aria-hidden="true" />
            Mode maintenance
          </p>
          <div className="space-y-4">
            <SwitchField
              label="Fermer le site aux visiteurs"
              description="Les visiteurs voient l'écran de maintenance. Vous, connecté admin, continuez à naviguer normalement (bandeau de rappel visible) — /admin reste toujours accessible."
              checked={maintenance.value!.enabled}
              onChange={(b) => maintenance.patch("enabled", b)}
            />
            <TextAreaField
              label="Message affiché"
              value={maintenance.value!.message}
              onChange={(s) => maintenance.patch("message", s)}
              rows={2}
              maxLength={500}
              id="maintenance-message"
            />
          </div>
        </section>

        {/* ── Sécurité ── */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 flex items-center gap-2 text-[14px] font-bold">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Sécurité de l&apos;accès administrateur
          </p>
          {usingDefaultPassword ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-[13px] leading-6 text-amber-800" role="alert">
              <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
              <p>
                <strong>Mot de passe par défaut actif.</strong> Définissez{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[12px]">ADMIN_PASSWORD</code>{" "}
                dans les variables d&apos;environnement (Vercel), puis redéployez. Optionnellement{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[12px]">ADMIN_SESSION_SECRET</code>{" "}
                pour signer les sessions avec un secret dédié.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-muted/60 p-4 text-[13px] leading-6 text-muted-foreground">
              Mot de passe personnalisé détecté via <code className="font-mono">ADMIN_PASSWORD</code> —
              sessions signées HMAC-SHA256 valables 8 h, tentatives limitées à 5 / 10 min par IP.
            </p>
          )}
        </section>

        <SaveBar dirty={dirtyAll} saving={savingAll} onSave={() => void saveAll()} onReset={resetAll} />
      </form>
    </div>
  );
}

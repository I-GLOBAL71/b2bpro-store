"use client";

import { Recycle, Info } from "lucide-react";
import type { VitrineSettings } from "@/lib/contracts";
import { ROTATION_RULES } from "@/lib/contracts";
import { useSettingsGroup } from "@/components/admin/use-settings";
import {
  AdminPageHeader,
  SaveBar,
  SliderField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { RotationLive } from "@/components/admin/rotation-live";

export default function AdminVitrinePage() {
  const { value, loading, error, dirty, saving, patch, save, reset } =
    useSettingsGroup<"vitrine">("vitrine");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (error || !value) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{error}</div>;
  }

  const v: VitrineSettings = value;

  return (
    <div>
      <AdminPageHeader
        title="Vitrine & Rotation"
        description="Rotation équitable de la page d'accueil : chaque service s'y affiche à tour de rôle, aucune fiche ne monopolise la première place."
        icon={<Recycle className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      <RotationLive />

      <form
        className="mt-6 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <SwitchField
          label="Rotation équitable active"
          description="Désactivée : retour au comportement historique (best-sellers « mis en avant » figés, triés par ventes)."
          checked={v.enabled}
          onChange={(b) => patch("enabled", b)}
        />

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-[14px] font-bold">Cadence de rotation</p>
          <div className="grid gap-5 md:grid-cols-2">
            <SliderField
              label="Fenêtre par service en 1ère place"
              description="Durée maximale consécutive en tête de vitrine — l'exigence produit est de 10 minutes."
              value={v.windowMinutes}
              onChange={(n) => patch("windowMinutes", n)}
              min={ROTATION_RULES.WINDOW_MIN_MINUTES}
              max={ROTATION_RULES.WINDOW_MAX_MINUTES}
              formatValue={(n) => (n >= 60 ? `${(n / 60).toString().replace(".", ",")} h` : `${n} min`)}
              id="vitrine-window"
            />
            <SliderField
              label="Cartes affichées"
              description="Nombre de services simultanément en vitrine sur la page d'accueil."
              value={v.slotCount}
              onChange={(n) => patch("slotCount", n)}
              min={ROTATION_RULES.SLOTS_MIN}
              max={ROTATION_RULES.SLOTS_MAX}
              formatValue={(n) => `${n} cartes`}
              id="vitrine-slots"
            />
            <SliderField
              label="Note minimale d'éligibilité"
              description="4,0 = tout le catalogue participe à la rotation (équité maximale)."
              value={v.minRating}
              onChange={(n) => patch("minRating", Math.round(n * 10) / 10)}
              min={ROTATION_RULES.MIN_RATING_FLOOR}
              max={5}
              step={0.1}
              formatValue={(n) => `${n.toString().replace(".", ",")} ★`}
              id="vitrine-minrating"
            />
            <div className="rounded-xl bg-muted/60 p-3.5 text-[12.5px] leading-5 text-muted-foreground">
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Garantie mathématique
              </p>
              <p className="mt-1">
                Le pas de rotation est choisi copremier au nombre de services : la 1ère position
                parcourt <strong>l'intégralité du catalogue</strong> à chaque cycle — chaque service
                passe en tête exactement une fois par cycle complet.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-[14px] font-bold">Textes de la section vitrine</p>
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Badge (petit intitulé)"
              value={v.badge}
              onChange={(s) => patch("badge", s)}
              maxLength={40}
              id="vitrine-badge"
            />
            <TextField
              label="Titre de la section"
              value={v.title}
              onChange={(s) => patch("title", s)}
              maxLength={90}
              id="vitrine-title"
            />
            <TextAreaField
              label="Sous-titre"
              value={v.subtitle}
              onChange={(s) => patch("subtitle", s)}
              maxLength={220}
              className="md:col-span-2"
              id="vitrine-subtitle"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <SwitchField
            label="Compte à rebours visible"
            description="Affiche « Rotation dans 9:42 » sur la page d'accueil."
            checked={v.showCountdown}
            onChange={(b) => patch("showCountdown", b)}
          />
          <SwitchField
            label="Rafraîchissement automatique"
            description="À la fin de chaque fenêtre, la vitrine se met à jour sans rechargement."
            checked={v.autoRefresh}
            onChange={(b) => patch("autoRefresh", b)}
          />
        </div>

        <SaveBar dirty={dirty} saving={saving} onSave={() => void save()} onReset={reset} />
      </form>
    </div>
  );
}

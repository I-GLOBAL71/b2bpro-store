"use client";

import { Home, Megaphone } from "lucide-react";
import { useSettingsGroup } from "@/components/admin/use-settings";
import {
  AdminPageHeader,
  Field,
  NumberField,
  SaveBar,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";

export default function AdminHomePage() {
  const { value, loading, error, dirty, saving, patch, save, reset } = useSettingsGroup("hero");
  const announcement = useSettingsGroup("announcement");
  const sections = useSettingsGroup("sections");

  if (loading || announcement.loading || sections.loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (error || !value || !announcement.value || !sections.value) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">Erreur de chargement de la configuration</div>;
  }

  const dirtyAll = dirty || announcement.dirty || sections.dirty;
  const savingAll = saving || announcement.saving || sections.saving;

  async function saveAll() {
    // Trois groupes distincts : on sauvegarde ceux qui ont réellement changé.
    await Promise.all([
      dirty && save(),
      announcement.dirty && announcement.save(),
      sections.dirty && sections.save(),
    ]);
  }

  function resetAll() {
    reset();
    announcement.reset();
    sections.reset();
  }

  return (
    <div>
      <AdminPageHeader
        title="Page d'accueil"
        description="Bandeau d'annonce, héros et visibilité des sections — tout ce que voit un visiteur qui arrive sur b2bpro.store."
        icon={<Home className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void saveAll();
        }}
      >
        {/* ── Annonce ── */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 flex items-center gap-2 text-[14px] font-bold">
            <Megaphone className="h-4 w-4 text-primary" aria-hidden="true" />
            Bandeau d'annonce
          </p>
          <div className="space-y-4">
            <SwitchField
              label="Afficher le bandeau d'annonce"
              description="Bandeau vert en haut de toutes les pages publiques, rejetable par visiteur (le modifier le fait réapparaître)."
              checked={announcement.value!.enabled}
              onChange={(b) => announcement.patch("enabled", b)}
            />
            <TextAreaField
              label="Message"
              value={announcement.value!.message}
              onChange={(s) => announcement.patch("message", s)}
              rows={2}
              maxLength={220}
              id="annonce-message"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Lien (URL interne)"
                description="Ex. : /services, /blog, /categories/seo-geo-medias"
                value={announcement.value!.linkUrl}
                onChange={(s) => announcement.patch("linkUrl", s)}
                maxLength={300}
                id="annonce-url"
              />
              <TextField
                label="Libellé du lien"
                value={announcement.value!.linkLabel}
                onChange={(s) => announcement.patch("linkLabel", s)}
                maxLength={60}
                id="annonce-label"
              />
            </div>
          </div>
        </section>

        {/* ── Héros ── */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-[14px] font-bold">Héros (zone d'en-tête sombre)</p>
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Badge au-dessus du titre"
              description="Le jeton {services} est remplacé par le nombre réel de services."
              value={value.badge}
              onChange={(s) => patch("badge", s)}
              maxLength={120}
              id="hero-badge"
            />
            <div />
            <TextField
              label="Titre — début"
              value={value.titleStart}
              onChange={(s) => patch("titleStart", s)}
              maxLength={90}
              id="hero-title-start"
            />
            <TextField
              label="Titre — partie en vert"
              value={value.titleHighlight}
              onChange={(s) => patch("titleHighlight", s)}
              maxLength={60}
              id="hero-title-highlight"
            />
            <TextAreaField
              label="Paragraphe d'introduction"
              value={value.subtitle}
              onChange={(s) => patch("subtitle", s)}
              rows={4}
              maxLength={400}
              className="md:col-span-2"
              id="hero-subtitle"
            />
            <TextField
              label="Placeholder de la recherche"
              value={value.searchPlaceholder}
              onChange={(s) => patch("searchPlaceholder", s)}
              maxLength={90}
              id="hero-placeholder"
            />
            <TextField
              label="Statistique « livrés à l'heure »"
              value={value.onTimeRate}
              onChange={(s) => patch("onTimeRate", s)}
              maxLength={12}
              id="hero-ontime"
            />
            <Field
              label="Mots-clés populaires"
              description="Proposés en raccourci de recherche sous le champ (un par ligne, 6 max)."
              htmlFor="hero-keywords"
              className="md:col-span-2"
            >
              <textarea
                id="hero-keywords"
                value={value.popularKeywords.join("\n")}
                onChange={(e) =>
                  patch(
                    "popularKeywords",
                    e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 6)
                  )
                }
                rows={4}
                maxLength={320}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-[13.5px] shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>
          </div>
        </section>

        {/* ── Sections ── */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-[14px] font-bold">Sections de la page d'accueil</p>
          <div className="grid gap-3 md:grid-cols-2">
            <SwitchField
              label="Pôles & catégories"
              checked={sections.value!.categories}
              onChange={(b) => sections.patch("categories", b)}
            />
            <SwitchField
              label="Comment ça marche ?"
              checked={sections.value!.howItWorks}
              onChange={(b) => sections.patch("howItWorks", b)}
            />
            <SwitchField
              label="Témoignages clients"
              checked={sections.value!.testimonials}
              onChange={(b) => sections.patch("testimonials", b)}
            />
            <SwitchField
              label="Francophonie"
              checked={sections.value!.francophonie}
              onChange={(b) => sections.patch("francophonie", b)}
            />
            <SwitchField
              label="Aperçu du blog"
              checked={sections.value!.blogTeaser}
              onChange={(b) => sections.patch("blogTeaser", b)}
            />
            <SwitchField
              label="Appel à l'action Support IA"
              checked={sections.value!.supportCta}
              onChange={(b) => sections.patch("supportCta", b)}
            />
            <NumberField
              label="Nombre de témoignages"
              value={sections.value!.testimonialsCount}
              onChange={(n) => sections.patch("testimonialsCount", n)}
              min={1}
              max={12}
              id="sections-testimonials-count"
            />
            <NumberField
              label="Note minimale des témoignages"
              description="4,8 par défaut — seuls les avis très élogieux sont montrés."
              value={sections.value!.testimonialsMinRating}
              onChange={(n) => sections.patch("testimonialsMinRating", n)}
              min={4.2}
              max={5}
              step={0.1}
              suffix="★"
              id="sections-testimonials-rating"
            />
            <NumberField
              label="Articles de blog affichés"
              value={sections.value!.blogTeaserCount}
              onChange={(n) => sections.patch("blogTeaserCount", n)}
              min={1}
              max={6}
              id="sections-blog-count"
            />
          </div>
        </section>

        <SaveBar dirty={dirtyAll} saving={savingAll} onSave={() => void saveAll()} onReset={resetAll} />
      </form>
    </div>
  );
}

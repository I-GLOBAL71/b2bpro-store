import Link from "next/link";
import { ArrowRight, ShieldCheck, CreditCard, SearchCheck, PackageCheck, Recycle } from "lucide-react";
import { ServiceCard } from "@/components/site/service-card";
import { parseThumbUrls } from "@/lib/contracts";
import { RatingStars } from "@/components/site/rating-stars";
import { VitrineTimer } from "@/components/home/vitrine-timer";
import type { RotationInfoDTO } from "@/lib/contracts";

/** Titres par défaut du mode historique (rotation désactivée). */
const LEGACY_TITLE = "Nos best-sellers plébiscités par les clients";
const LEGACY_SUBTITLE =
  "Les services les plus commandés du catalogue, avec les notes les plus élevées de leurs catégories respectives.";

export function BestSellersSection({
  services,
  rotation,
  title,
  subtitle,
  badge,
  showCountdown,
  autoRefresh,
}: {
  services: {
    slug: string;
    title: string;
    shortDesc: string;
    poleSlug: string;
    category: string;
    basePrice: number;
    deliveryDays: number;
    rating: number;
    reviewsCount: number;
    salesCount: number;
    thumbUrls: string | null;
    seller: { name: string; countryLabel: string };
  }[];
  rotation: RotationInfoDTO | null;
  title?: string;
  subtitle?: string;
  badge?: string;
  showCountdown?: boolean;
  autoRefresh?: boolean;
}) {
  const rotating = rotation !== null;
  const heading = rotating ? title || "La vitrine qui tourne pour tous les talents" : LEGACY_TITLE;
  const sub = rotating ? subtitle || "" : LEGACY_SUBTITLE;

  return (
    <section className="border-y border-border/70 bg-muted/40 py-16 lg:py-20" aria-labelledby="bestsellers-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {rotating ? (
              <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold uppercase tracking-wider text-primary">
                <Recycle className="h-4 w-4" aria-hidden="true" />
                {badge || "Rotation équitable"}
              </p>
            ) : (
              <p className="text-[12.5px] font-semibold uppercase tracking-wider text-primary">Les plus commandés</p>
            )}
            <h2 id="bestsellers-title" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {heading}
            </h2>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-7 text-muted-foreground">{sub}</p>
            {rotating && rotation.totalEligible > 0 && (
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                {rotation.totalEligible} services éligibles se relaient — chacun passe en tête à tour
                de rôle, un cycle complet en{" "}
                {rotation.fullCycleMinutes >= 60
                  ? `${Math.round((rotation.fullCycleMinutes / 60) * 10) / 10} h`
                  : `${rotation.fullCycleMinutes} min`}
                .
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            {rotating && showCountdown && (
              <VitrineTimer
                rotatesAt={rotation.rotatesAt}
                autoRefresh={Boolean(autoRefresh)}
                windowMinutes={rotation.windowMinutes}
              />
            )}
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary hover:underline"
            >
              Voir tous les services
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <ServiceCard
              key={s.slug}
              service={{
                ...s,
                thumbUrls: parseThumbUrls(s.thumbUrls),
                sellerName: s.seller.name,
                sellerCountry: s.seller.countryLabel,
                variant: i % 3,
              }}
              className="animate-fade-up"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    {
      icon: SearchCheck,
      title: "1. Choisissez votre service",
      detail:
        "Un catalogue détaillé et filtrable par pôle, prix et note. Le support IA vous conseille gratuitement le service exact adapté à votre besoin.",
    },
    {
      icon: CreditCard,
      title: "2. Commandez & payez en sécurité",
      detail:
        "Sélectionnez l'offre de base et vos options : le total s'affiche en direct. Votre paiement est placé en séquestre — le vendeur n'est payé qu'après votre validation.",
    },
    {
      icon: PackageCheck,
      title: "3. Recevez votre livrable",
      detail:
        "Livraison en 2-3 jours ouvrés (98,6 % de ponctualité) : tableaux Excel/Sheets, rapports ou fichiers prêts à l'emploi, avec guide de lecture et ajustements inclus.",
    },
    {
      icon: ShieldCheck,
      title: "4. Validez quand c'est parfait",
      detail:
        "Vous contrôlez le livrable, demandez des retouches gratuites si besoin, puis validez. En cas de non-conformité persistante, remboursement intégral garanti.",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="how-title">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[12.5px] font-semibold uppercase tracking-wider text-primary">Simple et sécurisé</p>
        <h2 id="how-title" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Comment ça marche ?
        </h2>
        <p className="mt-3 text-[14.5px] leading-7 text-muted-foreground">
          Quatre étapes, zéro friction, un risque nul : votre argent ne bouge qu'une fois le
          livrable validé entre vos mains.
        </p>
      </div>
      <ol className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="animate-fade-up relative rounded-2xl border border-border bg-card p-6"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <s.icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-[15.5px] font-bold">{s.title}</h3>
            <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">{s.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TestimonialsSection({
  reviews,
}: {
  reviews: {
    id: string;
    authorName: string;
    country: string;
    rating: number;
    comment: string;
    orderLabel: string;
    service: { title: string; slug: string };
  }[];
}) {
  return (
    <section className="border-y border-border/70 bg-muted/40 py-16 lg:py-20" aria-labelledby="testimonials-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12.5px] font-semibold uppercase tracking-wider text-primary">Ils nous font confiance</p>
          <h2 id="testimonials-title" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Ce que disent les clients de la francophonie
          </h2>
          <div className="mt-4 flex items-center justify-center gap-3">
            <RatingStars rating={4.8} size={5} />
            <span className="text-[14px] font-semibold">4,8/5 de moyenne</span>
            <span className="text-[13px] text-muted-foreground">sur 1 300+ avis vérifiés</span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 6).map((r, i) => (
            <figure
              key={r.id}
              className="animate-fade-up card-hover rounded-2xl border border-border bg-card p-6"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <RatingStars rating={r.rating} size={3.5} />
              <blockquote className="mt-3 text-[13.5px] leading-6 text-foreground/90">
                « {r.comment} »
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                  {r.authorName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold">{r.authorName}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    à propos de{" "}
                    <Link href={`/services/${r.service.slug}`} className="font-medium text-primary hover:underline">
                      {r.service.title}
                    </Link>
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ServiceCard } from "@/components/site/service-card";
import { parseThumbUrls } from "@/lib/contracts";
import { PoleIcon } from "@/components/site/pole-icon";
import { getServices } from "@/lib/queries";
import { POLE_LABELS, POLE_DESCRIPTIONS, POLE_ICONS, POLE_ACCENTS, POLE_DESCRIPTIONS as POLE_DESC, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const label = POLE_LABELS[slug];
  if (!label) return {};
  return {
    title: `${label} : services experts dès 20 €`,
    description: `${POLE_DESC[slug]} Notes de 4,2 à 5,0 ★, livraison 2-3 jours, paiement sécurisé.`,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!POLE_LABELS[slug]) notFound();

  const { items, total } = await getServices({ pole: slug, sort: "popularity", perPage: 60 });
  const accent = POLE_ACCENTS[slug];

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${POLE_LABELS[slug]} | b2bpro.store`,
    description: POLE_DESCRIPTIONS[slug],
    url: `${SITE.url}/categories/${slug}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.title,
        url: `${SITE.url}/services/${s.slug}`,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />

      {/* En-tête de catégorie */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: `linear-gradient(130deg, ${accent.hue[0]}, ${accent.hue[1]})` }}
      >
        <div className="hero-grid-bg absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'ariane" className="flex items-center gap-1.5 text-[13px] text-white/80">
            <Link href="/" className="hover:underline">Accueil</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link href="/services" className="hover:underline">Services</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium text-white">{POLE_LABELS[slug]}</span>
          </nav>
          <div className="mt-4 flex items-start gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <PoleIcon icon={POLE_ICONS[slug]} className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{POLE_LABELS[slug]}</h1>
              <p className="mt-3 max-w-2xl text-[14.5px] leading-7 text-white/90">
                {POLE_DESCRIPTIONS[slug]}
              </p>
              <p className="mt-3 text-[13px] text-white/75">
                {total} services experts · notes de 4,2 à 5,0 ★ · livraison en 2 à 3 jours · dès 20 €
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grille de services */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground">Aucun service dans ce pôle pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((s, i) => (
              <ServiceCard
                key={s.slug}
                service={{
                  slug: s.slug,
                  title: s.title,
                  shortDesc: s.shortDesc,
                  poleSlug: s.poleSlug,
                  category: s.category,
                  basePrice: s.basePrice,
                  deliveryDays: s.deliveryDays,
                  rating: s.rating,
                  reviewsCount: s.reviewsCount,
                  salesCount: s.salesCount,
                  thumbUrls: parseThumbUrls(s.thumbUrls),
                  sellerName: s.seller.name,
                  sellerCountry: s.seller.countryLabel,
                  variant: i % 3,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

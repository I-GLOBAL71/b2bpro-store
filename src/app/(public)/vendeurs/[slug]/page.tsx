import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Clock, Award, Languages, ChevronRight } from "lucide-react";
import { getSellerBySlug } from "@/lib/queries";
import { ServiceCard } from "@/components/site/service-card";
import { parseThumbUrls } from "@/lib/contracts";
import { RatingStars } from "@/components/site/rating-stars";
import { formatCompact, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const seller = await getSellerBySlug(slug);
  if (!seller) return {};
  return {
    title: `${seller.name} : ${seller.title}`.slice(0, 68),
    description: `${seller.name}, ${seller.countryLabel} : ${seller.title}. Note ${seller.rating.toString().replace(".", ",")}/5, ${seller.totalSales} livraisons, ${seller.responseTime}. Découvrez ses services sur b2bpro.store.`,
    alternates: { canonical: `/vendeurs/${seller.slug}` },
  };
}

export default async function SellerPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const seller = await getSellerBySlug(slug);
  if (!seller) notFound();

  const skills = JSON.parse(seller.skills) as string[];
  const languages = JSON.parse(seller.languages) as string[];

  // Note GSC « Extraits d'avis » : `@type: "Person"` n'est pas un parent valide
  // pour `aggregateRating` (ni dans Google Rich Results, ni dans Schema.org).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: seller.name,
    jobTitle: seller.title,
    description: seller.bio,
    url: `${SITE.url}/vendeurs/${seller.slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: seller.city,
      addressCountry: seller.country,
    },
    knowsLanguage: languages,
    knowsAbout: skills,
    worksFor: { "@type": "Organization", name: "b2bpro.store", url: SITE.url },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'ariane" className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-primary hover:underline">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium text-foreground">{seller.name}</span>
        </nav>

        {/* En-tête profil */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
          <div className="h-28 bg-gradient-to-r from-primary via-emerald-500 to-emerald-400 sm:h-32" aria-hidden="true" />
          <div className="relative px-6 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-wrap items-end gap-5 sm:-mt-14">
              <Image
                src={seller.avatarUrl ?? `/avatars/${seller.slug}.svg`}
                alt={`Avatar de ${seller.name}`}
                width={112}
                height={112}
                className="h-24 w-24 rounded-3xl border-4 border-card shadow-lg sm:h-28 sm:w-28"
              />
              <div className="flex-1 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{seller.name}</h1>
                  {seller.isTop && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-emerald-500 px-3 py-1 text-[11.5px] font-bold text-white">
                      <Award className="h-3.5 w-3.5" aria-hidden="true" />
                      Vendeur {seller.level}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[14.5px] font-medium text-muted-foreground">{seller.title}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <RatingStars rating={seller.rating} size={3.5} />
                <span className="font-semibold text-foreground">{seller.rating.toString().replace(".", ",")}</span>
                ({seller.reviewsCount.toLocaleString("fr-FR")} avis)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {seller.city}, {seller.countryLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {seller.responseTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-4 w-4" aria-hidden="true" />
                {languages.join(", ")}
              </span>
              <span>Membre depuis {seller.memberSince}</span>
            </div>

            {/* Stats */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { v: formatCompact(seller.totalSales), l: "services vendus" },
                { v: seller.reviewsCount.toLocaleString("fr-FR"), l: "avis clients" },
                { v: seller.services.length.toString(), l: "services actifs" },
                { v: seller.level, l: "niveau vendeur" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center">
                  <p className="text-lg font-extrabold text-primary">{s.v}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Bio */}
            <div className="mt-6">
              <h2 className="text-[15px] font-bold">Présentation</h2>
              <p className="mt-2 max-w-3xl text-[14px] leading-7 text-foreground/90">{seller.bio}</p>
            </div>

            {/* Compétences */}
            <div className="mt-5">
              <h2 className="text-[15px] font-bold">Compétences</h2>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="rounded-full bg-accent px-3 py-1 text-[12.5px] font-medium text-accent-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="mt-10" aria-labelledby="seller-services">
          <h2 id="seller-services" className="text-xl font-bold tracking-tight">
            Les services de {seller.name.split(" ")[0]} ({seller.services.length})
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {seller.services.map((s, i) => (
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
                  variant: i % 3,
                }}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

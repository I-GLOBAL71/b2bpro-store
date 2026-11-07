import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Clock,
  Eye,
  ShoppingCart,
  ShieldCheck,
  CheckCircle2,
  PackageCheck,
  MapPin,
  MessageCircle,
  ChevronRight,
  ListChecks,
  FileText,
  Workflow,
  HelpCircle,
  Quote,
} from "lucide-react";
import { db } from "@/lib/db";
import { getServiceBySlug, getRelatedServices } from "@/lib/queries";
import { ServiceGallery } from "@/components/site/service-gallery";
import { OptionSelector } from "@/components/site/option-selector";
import { ReviewForm } from "@/components/site/review-form";
import { ServiceCard } from "@/components/site/service-card";
import { RatingStars } from "@/components/site/rating-stars";
import { Markdown } from "@/components/site/markdown";
import { PoleIcon } from "@/components/site/pole-icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { POLE_ACCENTS, POLE_LABELS, formatPrice, formatCompact, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const svc = await db.service.findUnique({ where: { slug } });
  if (!svc) return {};
  const kw = JSON.parse(svc.keywords) as { primary: string; secondary: string[] };
  return {
    title: `${svc.title.replace(/^Je vais\s+/i, "")} dès ${svc.basePrice} €`.slice(0, 68),
    description: `${svc.shortDesc.slice(0, 140)} Livré en ${svc.deliveryDays} jours, note ${svc.rating.toString().replace(".", ",")}/5, paiement sécurisé.`.slice(0, 165),
    keywords: [kw.primary, ...kw.secondary.slice(0, 4), "service B2B", "freelance francophone"],
    alternates: { canonical: `/services/${svc.slug}` },
    openGraph: {
      title: svc.title,
      description: svc.shortDesc.slice(0, 200),
      type: "website",
      images: [{ url: `/thumbs/${svc.slug}-1.svg`, width: 1200, height: 750 }],
    },
  };
}

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const svc = await getServiceBySlug(slug);
  if (!svc) notFound();

  const related = await getRelatedServices(svc.poleSlug, svc.id, 4);
  const features = JSON.parse(svc.features) as string[];
  const deliverables = JSON.parse(svc.deliverables) as string[];
  const process = JSON.parse(svc.process) as { step: number; title: string; detail: string }[];
  const faq = JSON.parse(svc.faq) as { q: string; a: string }[];
  const keywords = JSON.parse(svc.keywords) as { primary: string; secondary: string[]; longTail: string[] };
  const sellerSkills = JSON.parse(svc.seller.skills) as string[];

  const accent = POLE_ACCENTS[svc.poleSlug];

  // Répartition des notes
  const dist = [5, 4.5, 4, 3.5, 3].map((star) => {
    const count = svc.reviews.filter((r) => (star === 5 ? r.rating >= 4.9 : star === 4.5 ? r.rating >= 4.5 && r.rating < 4.9 : star === 4 ? r.rating >= 4 && r.rating < 4.5 : star === 3.5 ? r.rating >= 3.5 && r.rating < 4 : r.rating < 3.5)).length;
    return { star, count };
  });

  // JSON-LD enrichi (Service + Offer + AggregateRating + FAQPage + Breadcrumb)
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: svc.title,
      description: svc.shortDesc,
      serviceType: svc.category,
      provider: {
        "@type": "Organization",
        name: svc.seller.name,
        address: { "@type": "PostalAddress", addressLocality: svc.seller.city, addressCountry: svc.seller.country },
      },
      areaServed: "Francophonie",
      availableChannel: {
        "@type": "ServiceChannel",
        serviceUrl: `${SITE.url}/services/${svc.slug}`,
      },
      offers: {
        "@type": "Offer",
        price: svc.basePrice,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${SITE.url}/services/${svc.slug}`,
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: svc.rating,
        reviewCount: svc.reviewsCount,
        bestRating: 5,
        worstRating: 1,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: svc.title,
      description: svc.shortDesc,
      image: `${SITE.url}/thumbs/${svc.slug}-1.svg`,
      brand: { "@type": "Brand", name: "b2bpro.store" },
      offers: {
        "@type": "Offer",
        price: svc.basePrice,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: svc.rating,
        reviewCount: svc.reviewsCount,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Services", item: `${SITE.url}/services` },
        { "@type": "ListItem", position: 3, name: POLE_LABELS[svc.poleSlug] || "Catalogue", item: `${SITE.url}/categories/${svc.poleSlug}` },
        { "@type": "ListItem", position: 4, name: svc.title, item: `${SITE.url}/services/${svc.slug}` },
      ],
    },
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Fil d'Ariane */}
        <nav aria-label="Fil d'ariane" className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-primary hover:underline">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href="/services" className="hover:text-primary hover:underline">Services</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href={`/categories/${svc.poleSlug}`} className="hover:text-primary hover:underline">
            {POLE_LABELS[svc.poleSlug]}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium text-foreground">{svc.title.slice(0, 60)}…</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-12">
          {/* Colonne principale */}
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/categories/${svc.poleSlug}`}>
                <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1 text-[12px]">
                  <PoleIcon icon={svc.poleIcon} className="h-3.5 w-3.5" />
                  {POLE_LABELS[svc.poleSlug]}
                </Badge>
              </Link>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[12px] text-muted-foreground">
                {svc.category}
              </Badge>
              {svc.isFounder && (
                <Badge className="rounded-full bg-gradient-to-r from-primary to-emerald-500 px-3 py-1 text-[12px] text-white">
                  Best-seller historique
                </Badge>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">
              {svc.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <RatingStars rating={svc.rating} size={3.75} />
                <span className="font-semibold text-foreground">{svc.rating.toString().replace(".", ",")}</span>
                ({svc.reviewsCount.toLocaleString("fr-FR")} avis)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                {svc.salesCount.toLocaleString("fr-FR")} commandes réalisées
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4" aria-hidden="true" />
                {formatCompact(svc.views)} vues
              </span>
            </div>

            <div className="mt-6">
              <ServiceGallery slug={svc.slug} alt={svc.title} />
            </div>

            {/* Réponse directe AIO (answer-first) */}
            <div className="mt-8 rounded-2xl border border-primary/15 bg-accent/30 p-5">
              <p className="text-[14.5px] leading-7">
                <strong>{svc.title.replace(/^Je vais\s+/i, "")}</strong> : service professionnel
                livré par <strong>{svc.seller.name}</strong> ({svc.seller.countryLabel}) sur
                b2bpro.store. Offre de base à <strong>{formatPrice(svc.basePrice)}</strong>, livrée
                en <strong>{svc.deliveryDays} jour{svc.deliveryDays > 1 ? "s" : ""} ouvré{svc.deliveryDays > 1 ? "s" : ""}</strong>,
                noté <strong>{svc.rating.toString().replace(".", ",")}/5</strong> par{" "}
                {svc.reviewsCount.toLocaleString("fr-FR")} clients. Paiement séquestré, ajustements
                inclus, support IA 7 j/7.
              </p>
            </div>

            {/* Description */}
            <section className="mt-10" aria-labelledby="desc-title">
              <h2 id="desc-title" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                Description du service
              </h2>
              <div className="mt-4">
                <Markdown content={svc.description} />
              </div>
            </section>

            {/* Points forts */}
            <section className="mt-10" aria-labelledby="features-title">
              <h2 id="features-title" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
                Ce qui est inclus
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3.5 text-[13.5px] leading-6"
                  >
                    <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>

            {/* Livrables */}
            <section className="mt-10" aria-labelledby="deliv-title">
              <h2 id="deliv-title" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <PackageCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                Vos livrables concrets
              </h2>
              <ol className="mt-4 space-y-3">
                {deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] leading-6">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {d}
                  </li>
                ))}
              </ol>
            </section>

            {/* Méthode */}
            <section className="mt-10" aria-labelledby="process-title">
              <h2 id="process-title" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Workflow className="h-5 w-5 text-primary" aria-hidden="true" />
                Comment se déroule votre commande
              </h2>
              <ol className="mt-4 space-y-4">
                {process.map((p) => (
                  <li key={p.step} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-400 text-[14px] font-bold text-white">
                      {p.step}
                    </span>
                    <div>
                      <p className="text-[14.5px] font-semibold">{p.title}</p>
                      <p className="mt-1 text-[13.5px] leading-6 text-muted-foreground">{p.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* FAQ (AIO) */}
            <section className="mt-10" aria-labelledby="faq-title">
              <h2 id="faq-title" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                Questions fréquentes
              </h2>
              <Accordion type="single" collapsible className="mt-4">
                {faq.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-[14.5px] font-semibold">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-[13.5px] leading-6 text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {/* Avis */}
            <section className="mt-12" aria-labelledby="reviews-title">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 id="reviews-title" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                  <Quote className="h-5 w-5 text-primary" aria-hidden="true" />
                  Avis clients ({svc.reviewsCount.toLocaleString("fr-FR")})
                </h2>
                <ReviewForm serviceId={svc.id} />
              </div>

              {/* Répartition */}
              <div className="mt-5 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
                <div className="flex flex-col items-center justify-center gap-2 border-border sm:border-r sm:pr-5">
                  <p className="text-4xl font-extrabold">{svc.rating.toString().replace(".", ",")}</p>
                  <RatingStars rating={svc.rating} size={4.5} />
                  <p className="text-[12.5px] text-muted-foreground">
                    {svc.reviewsCount.toLocaleString("fr-FR")} avis vérifiés
                  </p>
                </div>
                <div className="space-y-1.5">
                  {dist.map((d) => {
                    const pct = svc.reviews.length ? Math.round((d.count / svc.reviews.length) * 100) : 0;
                    return (
                      <div key={d.star} className="flex items-center gap-2 text-[12px]">
                        <span className="w-12 shrink-0 text-muted-foreground">{d.star.toString().replace(".", ",")} ★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-muted-foreground">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Liste d'avis */}
              <div className="mt-5 max-h-[560px] space-y-4 overflow-y-auto pr-1" role="feed" aria-label="Avis clients">
                {svc.reviews.slice(0, 12).map((r) => (
                  <article key={r.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                        {r.authorName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <div>
                        <p className="text-[13.5px] font-semibold">{r.authorName}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {r.country} · {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(r.createdAt)}
                          {r.orderLabel && ` · ${r.orderLabel}`}
                        </p>
                      </div>
                      <span className="ml-auto"><RatingStars rating={r.rating} size={3.5} /></span>
                    </div>
                    <p className="mt-3 text-[13.5px] leading-6 text-foreground/90">{r.comment}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* Mots-clés (maillage interne + SEO) */}
            <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
              <span className="text-[12.5px] font-semibold text-muted-foreground">Recherches associées :</span>
              {[keywords.primary, ...keywords.secondary.slice(0, 5)].map((k) => (
                <Link
                  key={k}
                  href={`/services?q=${encodeURIComponent(k)}`}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {k}
                </Link>
              ))}
            </div>
          </div>

          {/* Colonne latérale sticky */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-5">
              {/* Vendeur */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Votre expert
                </p>
                <div className="mt-3 flex items-start gap-3.5">
                  <Image
                    src={`/avatars/${svc.seller.slug}.svg`}
                    alt={`Avatar de ${svc.seller.name}`}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full border border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/vendeurs/${svc.seller.slug}`} className="text-[15px] font-bold hover:text-primary hover:underline">
                      {svc.seller.name}
                    </Link>
                    <p className="text-[12.5px] leading-5 text-muted-foreground">{svc.seller.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <RatingStars rating={svc.seller.rating} size={3} />
                        {svc.seller.rating.toString().replace(".", ",")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {svc.seller.city}, {svc.seller.countryLabel}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sellerSkills.slice(0, 4).map((s) => (
                    <span key={s} className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3.5 text-center">
                  <div>
                    <p className="text-[15px] font-bold">{formatCompact(svc.seller.totalSales)}</p>
                    <p className="text-[10.5px] text-muted-foreground">ventes</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-primary">{svc.seller.level}</p>
                    <p className="text-[10.5px] text-muted-foreground">niveau</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold">{svc.seller.responseTime.replace("répond en ", "")}</p>
                    <p className="text-[10.5px] text-muted-foreground">réponse</p>
                  </div>
                </div>
              </div>

              {/* Sélecteur d'options */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <OptionSelector
                  serviceId={svc.id}
                  serviceSlug={svc.slug}
                  serviceTitle={svc.title}
                  basePrice={svc.basePrice}
                  baseDays={svc.deliveryDays}
                  options={svc.options.map((o) => ({
                    id: o.id,
                    name: o.name,
                    description: o.description,
                    priceExtra: o.priceExtra,
                    daysExtra: o.daysExtra,
                    monthly: o.monthly,
                  }))}
                />
              </div>

              {/* Garanties */}
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-accent/50 to-card p-5">
                <p className="flex items-center gap-2 text-[14px] font-bold">
                  <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                  Vos garanties b2bpro.store
                </p>
                <ul className="mt-3 space-y-2.5 text-[13px] leading-5.5 text-muted-foreground">
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    Paiement séquestré — validé avant libération des fonds
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    Ajustements gratuits jusqu'à validation du livrable
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    Remboursement intégral si non conforme à la fiche
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    Support IA en français, 7 j/7, avant et après commande
                  </li>
                </ul>
                <Button asChild variant="outline" className="mt-4 w-full gap-2 rounded-full border-primary/40 text-primary hover:bg-accent">
                  <Link href="/support">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Une question ? Support IA
                  </Link>
                </Button>
              </div>
            </div>
          </aside>
        </div>

        {/* Services associés */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-border pt-10" aria-labelledby="related-title">
            <h2 id="related-title" className="text-xl font-bold tracking-tight">
              Services complémentaires dans « {POLE_LABELS[svc.poleSlug]} »
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r, i) => (
                <ServiceCard
                  key={r.slug}
                  service={{
                    slug: r.slug,
                    title: r.title,
                    shortDesc: r.shortDesc,
                    poleSlug: r.poleSlug,
                    category: r.category,
                    basePrice: r.basePrice,
                    deliveryDays: r.deliveryDays,
                    rating: r.rating,
                    reviewsCount: r.reviewsCount,
                    salesCount: r.salesCount,
                    sellerName: r.seller.name,
                    sellerCountry: r.seller.countryLabel,
                    variant: i % 3,
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

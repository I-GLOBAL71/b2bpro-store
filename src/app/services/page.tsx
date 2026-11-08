import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, PackageSearch } from "lucide-react";
import { ServiceCard } from "@/components/site/service-card";
import { PoleIcon } from "@/components/site/pole-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getServices, getPolesWithCounts } from "@/lib/queries";
import { POLE_LABELS, POLE_ICONS, POLE_ACCENTS } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Catalogue complet des services digitaux B2B — dès 25 €",
  description:
    "Explorez tous les services B2B de b2bpro.store : veille concurrentielle, génération de leads, IA & RAG, SEO local, immobilier, e-commerce… Filtrez par pôle, prix et note. Livraison 2-3 jours, paiement sécurisé.",
  alternates: { canonical: "/services" },
};

export const dynamic = "force-dynamic";

const SORTS = [
  { value: "popularity", label: "Popularité" },
  { value: "rating", label: "Mieux notés" },
  { value: "reviews", label: "Plus commentés" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
];

interface SearchParams {
  q?: string;
  pole?: string;
  sort?: string;
  page?: string;
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const { total, items, pages } = await getServices({
    q: sp.q,
    pole: sp.pole,
    sort: sp.sort || "popularity",
    page,
    perPage: 24,
  });
  const poleCounts = await getPolesWithCounts();

  const buildUrl = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) {
      if (v && k !== "page") params.set(k, v);
    }
    return `/services${params.size ? `?${params.toString()}` : ""}`;
  };

  const pageUrl = (p: number) => {
    const params = new URLSearchParams();
    const merged = { ...sp, page: String(p) };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/services${params.size ? `?${params.toString()}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Fil d'ariane" className="text-[13px] text-muted-foreground">
        <Link href="/" className="hover:text-primary hover:underline">Accueil</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-foreground">Services</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {sp.pole ? POLE_LABELS[sp.pole] || "Catalogue" : "Catalogue des services"}
        </h1>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-7 text-muted-foreground">
          {sp.pole
            ? `${poleCounts.get(sp.pole) ?? 0} services experts prêts à être commandés, livrés en 2-3 jours ouvrés avec paiement sécurisé et ajustements inclus.`
            : `${total} services digitaux B2B prêts à l'emploi, répartis en 14 pôles d'expertise. Chaque service est livré par un expert vérifié, noté de 4,2 à 5,0 ★, avec paiement séquestré et ajustements inclus.`}
        </p>
      </header>

      {/* Barre de recherche + tri */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action="/services" role="search" className="relative flex-1">
          {sp.pole && <input type="hidden" name="pole" value={sp.pole} />}
          {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
          <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            name="q"
            defaultValue={sp.q || ""}
            placeholder="Rechercher : veille prix, prospection, chatbot IA…"
            aria-label="Rechercher dans le catalogue"
            className="h-11 rounded-full pl-10 pr-4"
          />
        </form>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={buildUrl({ sort: s.value, page: undefined })}
              className={cn(
                "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                (sp.sort || "popularity") === s.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Filtres par pôle */}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par pôle">
        <Link
          href={buildUrl({ pole: undefined, page: undefined })}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            !sp.pole
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          Tous les pôles ({[...poleCounts.values()].reduce((a, b) => a + b, 0)})
        </Link>
        {Object.entries(POLE_LABELS).map(([slug, label]) => {
          const active = sp.pole === slug;
          return (
            <Link
              key={slug}
              href={buildUrl({ pole: slug, page: undefined })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <PoleIcon icon={POLE_ICONS[slug]} className="h-3.5 w-3.5" />
              {label}
              <span className={cn("text-[11.5px]", active ? "text-primary-foreground/80" : "text-muted-foreground/70")}>
                {poleCounts.get(slug) ?? 0}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Résultats */}
      <p className="mt-6 text-[13.5px] text-muted-foreground" role="status">
        {total} service{total > 1 ? "s" : ""} trouvé{total > 1 ? "s" : ""}
        {sp.q ? ` pour « ${sp.q} »` : ""}
      </p>

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <PackageSearch className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-[15px] font-semibold">Aucun service ne correspond à votre recherche</p>
          <p className="max-w-md text-[13.5px] text-muted-foreground">
            Essayez un autre mot-clé, ou demandez conseil à notre support IA : il connaît tout le
            catalogue et trouvera celui qui résout votre besoin.
          </p>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/services">Réinitialiser les filtres</Link>
            </Button>
            <Button asChild className="rounded-full bg-gradient-to-r from-primary to-emerald-500 text-white">
              <Link href="/support">Demander au support IA</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                sellerName: s.seller.name,
                sellerCountry: s.seller.countryLabel,
                variant: i % 3,
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={pageUrl(page - 1)} rel="prev">Précédent</Link>
            </Button>
          )}
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 3, pages - 6));
            return start + i;
          })
            .filter((p) => p >= 1 && p <= pages)
            .map((p) => (
              <Button
                key={p}
                asChild
                size="sm"
                variant={p === page ? "default" : "outline"}
                className="rounded-full"
              >
                <Link href={pageUrl(p)} aria-current={p === page ? "page" : undefined}>
                  {p}
                </Link>
              </Button>
            ))}
          {page < pages && (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={pageUrl(page + 1)} rel="next">Suivant</Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}

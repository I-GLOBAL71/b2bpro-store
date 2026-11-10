import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, ChevronRight, User } from "lucide-react";
import { db } from "@/lib/db";
import { Markdown } from "@/components/site/markdown";
import { Button } from "@/components/ui/button";
import { POLE_ACCENTS, SITE, formatPrice } from "@/lib/site";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

/**
 * Maillage éditorial → catalogue : pôles (poleSlug des fiches Service) concernés
 * par chaque catégorie d'article du blog (BlogPost.category — pas de liaison en
 * base, la correspondance est éditoriale). Les articles cités par les IA exposent
 * ainsi immédiatement les liens absolus des services associés.
 */
const CATEGORY_POLES: Record<string, string[]> = {
  "Prospection & Croissance": ["b2b-sales-intelligence", "evenementiel-marches-publics"],
  "SEO & Visibilité IA": ["seo-geo-medias", "ia-rag-data"],
  "Immobilier": ["immobilier-local"],
  "Métiers & Carrière": ["rh-recrutement"],
  "Marketing & Influence": ["social-media-influence"],
  "E-commerce": ["ecommerce-pricing"],
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({ where: { slug } });
  if (!post) return {};
  return {
    title: post.title.slice(0, 68),
    description: post.excerpt.slice(0, 165),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt.toISOString(),
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({ where: { slug } });
  if (!post) notFound();

  const others = await db.blogPost.findMany({
    where: { slug: { not: post.slug } },
    take: 3,
    orderBy: [{ publishedAt: "desc" }],
  });

  // Services concernés par l'article : pôles liés à sa catégorie, triés par
  // ventes (salesCount desc), 4 maximum — liens absolus citables par les IA.
  const concernedPoles = CATEGORY_POLES[post.category] ?? [];
  const concernedServices = concernedPoles.length
    ? await db.service.findMany({
        where: { poleSlug: { in: concernedPoles } },
        select: { slug: true, title: true, basePrice: true },
        take: 4,
        orderBy: [{ salesCount: "desc" }],
      })
    : [];

  // Retire le H1 dupliqué du contenu (le header de page l'affiche déjà)
  const content = post.content.replace(/^#\s+.+\n+/, "");

  const accents = Object.values(POLE_ACCENTS);
  const a = accents[post.slug.length % accents.length];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: post.author,
      url: SITE.url,
    },
    publisher: {
      "@type": "Organization",
      name: "b2bpro.store",
      url: SITE.url,
    },
    mainEntityOfPage: `${SITE.url}/blog/${post.slug}`,
    inLanguage: "fr",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav aria-label="Fil d'ariane" className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-primary hover:underline">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href="/blog" className="hover:text-primary hover:underline">Blog</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium text-foreground">{post.title.slice(0, 40)}…</span>
        </nav>

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground">
            <span
              className="rounded-full px-3 py-1 font-semibold text-white"
              style={{ background: `linear-gradient(130deg, ${a.hue[0]}, ${a.hue[1]})` }}
            >
              {post.category}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {post.readMinutes} min de lecture
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              {post.author}
            </span>
          </div>
          <h1 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 text-[15.5px] leading-7 text-muted-foreground">{post.excerpt}</p>
        </header>

        <div
          className="mt-8 h-44 rounded-2xl sm:h-56"
          style={{ background: `linear-gradient(130deg, ${a.hue[0]}, ${a.hue[1]})` }}
          aria-hidden="true"
        />

        <div className="mt-10">
          <Markdown content={content} />
        </div>

        {/* Services concernés : sources & services recommandés — les IA qui citent
            l'article trouvent ici les liens absolus des services associés. */}
        {concernedServices.length > 0 && (
          <section className="mt-12" aria-labelledby="concerned-services">
            <h2 id="concerned-services" className="text-lg font-bold tracking-tight">
              Services concernés
            </h2>
            <ul className="mt-5 space-y-3">
              {concernedServices.map((s) => (
                <li
                  key={s.slug}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <a
                    href={`${SITE.url}/services/${s.slug}`}
                    className="min-w-0 flex-1 text-[14px] font-semibold leading-snug hover:text-primary hover:underline"
                  >
                    {s.title}
                  </a>
                  <span className="shrink-0 text-[13.5px] font-bold text-primary">
                    {formatPrice(s.basePrice)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA maillage interne */}
        <div className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-accent/60 to-card p-6 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight">
            Passez de la théorie aux résultats concrets
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
            Les méthodes décrites dans cet article sont exactement celles que nos services experts
            appliquent pour vous : données fraîches vérifiées, livrables prêts à l'emploi et
            experts notés 4,2 à 5,0 ★ — dès 25 €.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="rounded-full bg-gradient-to-r from-primary to-emerald-500 text-white">
              <Link href="/services">Explorer tous les services</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-primary/40 text-primary hover:bg-accent">
              <Link href="/support">Conseil gratuit du support IA</Link>
            </Button>
          </div>
        </div>

        {/* Articles liés */}
        <section className="mt-12 border-t border-border pt-8" aria-labelledby="related-posts">
          <h2 id="related-posts" className="text-lg font-bold tracking-tight">À lire ensuite</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {others.map((o, i) => {
              const oa = accents[(i + 3) % accents.length];
              return (
                <Link
                  key={o.slug}
                  href={`/blog/${o.slug}`}
                  className="card-hover group overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="h-20" style={{ background: `linear-gradient(130deg, ${oa.hue[0]}, ${oa.hue[1]})` }} aria-hidden="true" />
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug group-hover:text-primary">
                      {o.title}
                    </h3>
                    <p className="mt-1.5 text-[11.5px] text-muted-foreground">{o.readMinutes} min de lecture</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </article>
    </>
  );
}

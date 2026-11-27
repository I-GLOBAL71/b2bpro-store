import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, ChevronRight, User } from "lucide-react";
import { db } from "@/lib/db";
import { Markdown } from "@/components/site/markdown";
import { Button } from "@/components/ui/button";
import { POLE_ACCENTS, SITE, formatPrice } from "@/lib/site";
import { getBlogCoverUrl } from "@/lib/blog-image";

export const dynamic = "force-dynamic";

interface Params {
  slug: string;
}

/**
 * Extrait les Q/R d'une section FAQ markdown (`## FAQ` / `## Questions fréquentes` /
 * `## Foire aux questions`) pour alimenter le schéma JSON-LD `FAQPage`.
 */
function extractMarkdownFaq(md: string): { question: string; answer: string }[] {
  const faqMatch = md.match(/^##\s+(?:FAQ|Questions\s+fréquentes|Foire\s+aux\s+questions)[^\n]*\n([\s\S]*)$/im);
  if (!faqMatch) return [];
  const afterFaq = faqMatch[1].split(/\n##\s+/)[0] ?? "";
  const items: { question: string; answer: string }[] = [];
  const blocks = afterFaq.split(/\n###\s+/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const firstNl = trimmed.indexOf("\n");
    if (firstNl === -1) continue;
    const question = trimmed.slice(0, firstNl).replace(/^###\s+/, "").trim();
    const answer = trimmed
      .slice(firstNl + 1)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    if (question.endsWith("?") && answer.length >= 20) {
      items.push({ question, answer });
    }
  }
  return items.slice(0, 8);
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
  "Grandes Entreprises & Finance": ["grandes-entreprises"],
  "Tourisme & Hôtellerie": ["hotellerie-tourisme"],
  "Formation & Santé": ["formation-sante"],
  "Logistique & Franchises": ["logistique-franchises"],
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({ where: { slug } });
  if (!post) return {};
  const imageUrl = getBlogCoverUrl(post.slug);
  return {
    title: post.title.slice(0, 68),
    description: post.excerpt.slice(0, 165),
    authors: [{ name: post.author }],
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      section: post.category,
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.publishedAt.toISOString(),
      authors: [post.author],
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [imageUrl],
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
  const faqItems = extractMarkdownFaq(post.content);

  const accents = Object.values(POLE_ACCENTS);
  const a = accents[post.slug.length % accents.length];

  const pageUrl = `${SITE.url}/blog/${post.slug}`;
  const significantLinks = [
    ...concernedServices.map((s) => `${SITE.url}/services/${s.slug}`),
    ...others.map((o) => `${SITE.url}/blog/${o.slug}`),
  ];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: getBlogCoverUrl(post.slug),
    url: pageUrl,
    articleSection: post.category,
    isAccessibleForFree: true,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.publishedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: post.author,
      url: SITE.url,
    },
    publisher: {
      "@type": "Organization",
      name: "b2bpro.store",
      url: SITE.url,
      logo: {
        "@type": "ImageObject",
        url: `${SITE.url}/apple-touch-icon.png`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    ...(significantLinks.length ? { significantLink: significantLinks } : {}),
    inLanguage: "fr-FR",
  };

  const faqJsonLd = faqItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE.url}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: pageUrl },
    ],
  };

  const structuredData = [
    articleJsonLd,
    ...(faqJsonLd ? [faqJsonLd] : []),
    breadcrumbJsonLd,
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <article className="mx-auto w-full min-w-0 max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <nav aria-label="Fil d'ariane" className="flex flex-wrap items-center gap-1.5 text-[12px] sm:text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-primary hover:underline shrink-0">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <Link href="/blog" className="hover:text-primary hover:underline shrink-0">Blog</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium text-foreground truncate max-w-[170px] xs:max-w-[220px] sm:max-w-xs">{post.title}</span>
        </nav>

        <header className="mt-5 sm:mt-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11.5px] sm:text-[12.5px] text-muted-foreground">
            <span
              className="rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-[12px] font-semibold text-white shadow-xs"
              style={{ background: `linear-gradient(130deg, ${a.hue[0]}, ${a.hue[1]})` }}
            >
              {post.category}
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {post.readMinutes} min de lecture
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              {post.author}
            </span>
          </div>
          <h1 className="mt-4 text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl break-words">
            {post.title}
          </h1>
          <p className="mt-3 sm:mt-4 text-[14.5px] sm:text-[15.5px] leading-6 sm:leading-7 text-muted-foreground break-words">
            {post.excerpt}
          </p>
        </header>

        <div className="mt-6 sm:mt-8 w-full overflow-hidden rounded-2xl border border-border bg-slate-900 shadow-md">
          <img
            src={getBlogCoverUrl(post.slug)}
            alt={post.title}
            width={1200}
            height={630}
            className="w-full h-auto object-cover aspect-[1200/630]"
            loading="eager"
          />
        </div>

        <div className="mt-8 sm:mt-10 w-full min-w-0 max-w-full">
          <Markdown content={content} />
        </div>

        {/* Services concernés : sources & services recommandés — les IA qui citent
            l'article trouvent ici les liens absolus des services associés. */}
        {concernedServices.length > 0 && (
          <section className="mt-10 sm:mt-12 w-full min-w-0" aria-labelledby="concerned-services">
            <h2 id="concerned-services" className="text-lg sm:text-xl font-bold tracking-tight">
              Services concernés
            </h2>
            <ul className="mt-4 sm:mt-5 space-y-3">
              {concernedServices.map((s) => (
                <li
                  key={s.slug}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 rounded-xl border border-border bg-card p-3.5 sm:p-4"
                >
                  <a
                    href={`${SITE.url}/services/${s.slug}`}
                    className="min-w-0 flex-1 text-[13.5px] sm:text-[14px] font-semibold leading-snug hover:text-primary hover:underline break-words"
                  >
                    {s.title}
                  </a>
                  <span className="shrink-0 self-start sm:self-auto text-[13px] sm:text-[13.5px] font-bold text-primary">
                    {formatPrice(s.basePrice)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA maillage interne */}
        <div className="mt-10 sm:mt-12 w-full min-w-0 rounded-2xl border border-primary/20 bg-gradient-to-br from-accent/60 to-card p-5 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">
            Passez de la théorie aux résultats concrets
          </h2>
          <p className="mt-2 text-[13.5px] sm:text-[14px] leading-6 text-muted-foreground break-words">
            Les méthodes décrites dans cet article sont exactement celles que nos services experts
            appliquent pour vous : données fraîches vérifiées, livrables prêts à l&apos;emploi et
            experts notés de 4,2 à 5,0 étoiles, dès 20 €.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-3">
            <Button asChild className="w-full sm:w-auto rounded-full bg-gradient-to-r from-primary to-emerald-500 text-white min-h-[44px]">
              <Link href="/services">Explorer tous les services</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto rounded-full border-primary/40 text-primary hover:bg-accent min-h-[44px]">
              <Link href="/support">Conseil gratuit du support IA</Link>
            </Button>
          </div>
        </div>

        {/* Articles liés */}
        <section className="mt-10 sm:mt-12 border-t border-border pt-8 w-full min-w-0" aria-labelledby="related-posts">
          <h2 id="related-posts" className="text-lg sm:text-xl font-bold tracking-tight">À lire ensuite</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {others.map((o, i) => {
              const oa = accents[(i + 3) % accents.length];
              return (
                <Link
                  key={o.slug}
                  href={`/blog/${o.slug}`}
                  className="card-hover group flex flex-col overflow-hidden rounded-xl border border-border bg-card w-full min-w-0"
                >
                  <div className="h-20 w-full" style={{ background: `linear-gradient(130deg, ${oa.hue[0]}, ${oa.hue[1]})` }} aria-hidden="true" />
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug group-hover:text-primary break-words">
                      {o.title}
                    </h3>
                    <p className="mt-auto pt-2 text-[11.5px] text-muted-foreground">{o.readMinutes} min de lecture</p>
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

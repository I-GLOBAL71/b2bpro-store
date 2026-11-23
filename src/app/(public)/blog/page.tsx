import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ArrowRight, Newspaper } from "lucide-react";
import { db } from "@/lib/db";
import { POLE_ACCENTS } from "@/lib/site";
import { getBlogCoverUrl } from "@/lib/blog-image";

export const metadata: Metadata = {
  title: "Blog B2B : méthodes data, SEO/GEO/AIO et croissance",
  description:
    "Le blog b2bpro.store : guides complets SEO/GEO/AIO, veille concurrentielle, génération de leads B2B, immobilier data et influence marketing pour les décideurs francophones.",
  alternates: { canonical: "/blog" },
};

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default async function BlogPage() {
  const posts = await db.blogPost.findMany({ orderBy: [{ publishedAt: "desc" }] });

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <nav aria-label="Fil d'ariane" className="text-[12px] sm:text-[13px] text-muted-foreground">
        <Link href="/" className="hover:text-primary hover:underline">Accueil</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-foreground">Blog</span>
      </nav>

      <header className="mt-4 max-w-2xl">
        <p className="inline-flex items-center gap-1.5 text-[12px] sm:text-[12.5px] font-semibold uppercase tracking-wider text-primary">
          <Newspaper className="h-4 w-4" aria-hidden="true" />
          {posts.length} guides d'experts
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight break-words">
          Le blog des décideurs francophones
        </h1>
        <p className="mt-3 text-[14px] sm:text-[14.5px] leading-6 sm:leading-7 text-muted-foreground break-words">
          Méthodes data appliquées, benchmarks chiffrés et stratégies SEO/GEO/AIO : tout ce
          qu'il faut savoir pour garder une longueur d'avance, écrit par nos experts et
          enrichi chaque semaine.
        </p>
      </header>

      <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => {
          const accents = Object.values(POLE_ACCENTS);
          const a = accents[i % accents.length];
          return (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                <img
                  src={getBlogCoverUrl(p.slug)}
                  alt={p.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10">
                  {p.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-[16px] font-bold leading-snug group-hover:text-primary">{p.title}</h2>
                <p className="mt-2 line-clamp-3 text-[13.5px] leading-6 text-muted-foreground">{p.excerpt}</p>
                <div className="mt-auto flex items-center justify-between pt-4 text-[12px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(p.publishedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    {p.readMinutes} min
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

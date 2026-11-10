import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { POLE_ACCENTS } from "@/lib/site";

interface BlogTeaser {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
  publishedAt: Date;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function BlogTeaserSection({ posts }: { posts: BlogTeaser[] }) {
  return (
    <section className="border-t border-border/70 bg-muted/40 py-16 lg:py-20" aria-labelledby="blog-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-primary">Le blog des décideurs</p>
            <h2 id="blog-title" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Méthodes, benchmarks et veille, pour rester en avance
            </h2>
          </div>
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary hover:underline">
            Tous les articles
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {posts.map((p, i) => {
            const accents = Object.values(POLE_ACCENTS);
            const a = accents[(i * 3 + 2) % accents.length];
            return (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div
                  className="relative flex h-36 items-end p-5"
                  style={{ background: `linear-gradient(130deg, ${a.hue[0]}, ${a.hue[1]})` }}
                >
                  <span className="rounded-full bg-black/30 px-3 py-1 text-[11.5px] font-semibold text-white backdrop-blur-sm">
                    {p.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="line-clamp-2 text-[15.5px] font-bold leading-snug group-hover:text-primary">
                    {p.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-[13.5px] leading-6 text-muted-foreground">{p.excerpt}</p>
                  <div className="mt-auto flex items-center gap-4 pt-4 text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDate(p.publishedAt)}
                    </span>
                    <span>{p.readMinutes} min de lecture</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

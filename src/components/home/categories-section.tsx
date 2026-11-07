import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PoleIcon } from "@/components/site/pole-icon";
import { POLE_LABELS, POLE_DESCRIPTIONS, POLE_ICONS, POLE_ACCENTS } from "@/lib/site";

export function CategoriesSection({ counts }: { counts: Map<string, number> }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="categories-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-wider text-primary">14 pôles d'expertise</p>
          <h2 id="categories-title" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Toute l'intelligence data dont votre business a besoin
          </h2>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-7 text-muted-foreground">
            Chaque pôle réunit des services conçus pour les marchés francophones, avec leurs
            sources de données locales et leurs experts dédiés.
          </p>
        </div>
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary hover:underline"
        >
          Explorer tout le catalogue
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Object.keys(POLE_LABELS).map((slug, i) => {
          const accent = POLE_ACCENTS[slug];
          const count = counts.get(slug) ?? 0;
          return (
            <Link
              key={slug}
              href={`/categories/${slug}`}
              className="card-hover group relative overflow-hidden rounded-2xl border border-border bg-card p-5"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div
                className="absolute inset-x-0 top-0 h-0.5 opacity-70"
                style={{ background: `linear-gradient(90deg, ${accent.hue[0]}, ${accent.hue[1]})` }}
                aria-hidden="true"
              />
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${accent.hue[0]}14`, color: accent.hue[0] }}
                >
                  <PoleIcon icon={POLE_ICONS[slug]} className="h-5.5 w-5.5" />
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground">
                  {count} services
                </span>
              </div>
              <h3 className="mt-3.5 text-[15px] font-bold tracking-tight group-hover:text-primary">
                {POLE_LABELS[slug]}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-5.5 text-muted-foreground">
                {POLE_DESCRIPTIONS[slug]}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

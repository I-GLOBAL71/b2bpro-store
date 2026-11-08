import Link from "next/link";
import Image from "next/image";
import { Search, MessageCircle, ShieldCheck, Clock, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeroStats {
  services: number;
  sellers: number;
  avgRating: number;
  reviews: number;
}

export function HeroSection({ stats }: { stats: HeroStats }) {
  return (
    <section className="relative overflow-hidden bg-stone-950 text-white">
      {/* décor */}
      <div className="hero-grid-bg absolute inset-0" aria-hidden="true" />
      <div
        className="absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-emerald-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -right-32 -top-24 h-[380px] w-[380px] rounded-full bg-emerald-400/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:gap-8 lg:px-8">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1.5 text-[12.5px] font-medium text-emerald-300">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {stats.services} services experts · 14 pôles · 100 % francophone
          </div>

          <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Les services digitaux B2B qui font{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              croître votre business
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-[15.5px] leading-7 text-stone-300">
            Veille concurrentielle, génération de leads, bases de connaissances IA, SEO local…
            Des experts vérifiés livrent vos données prêtes à l'emploi en 2-3 jours, dès 25 €.
            Paiement sécurisé : vous ne payez qu'après validation du livrable.
          </p>

          <form action="/services" role="search" className="mt-7 flex max-w-lg gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-500"
                aria-hidden="true"
              />
              <Input
                type="search"
                name="q"
                placeholder="Ex : surveiller les prix de mes concurrents…"
                aria-label="Rechercher un service"
                className="h-12 rounded-full border-stone-800 bg-stone-900/80 pl-11 pr-4 text-[14.5px] text-white placeholder:text-stone-500"
              />
            </div>
            <Button
              type="submit"
              className="h-12 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 text-[14.5px] font-bold text-stone-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-300"
            >
              Rechercher
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-stone-400">
            <span>Populaires :</span>
            {["veille concurrentielle", "fichier de prospection B2B", "base de connaissances IA", "SEO local"].map(
              (k) => (
                <Link
                  key={k}
                  href={`/services?q=${encodeURIComponent(k)}`}
                  className="rounded-full border border-stone-800 bg-stone-900/60 px-3 py-1 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                >
                  {k}
                </Link>
              )
            )}
          </div>

          <div className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {[
              { v: stats.services.toString(), l: "services experts" },
              { v: stats.sellers.toString(), l: "vendeurs vérifiés" },
              { v: `${stats.avgRating.toString().replace(".", ",")}/5`, l: "note moyenne" },
              { v: "98,6 %", l: "livrés à l'heure" },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-2xl font-extrabold text-white">{s.v}</p>
                <p className="mt-0.5 text-[12px] text-stone-400">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-fade-up delay-200">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-emerald-500/25 via-transparent to-emerald-300/15 blur-xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-3xl border border-stone-800 shadow-2xl">
            <Image
              src="/img/hero.png"
              alt="Illustration d'intelligence des données et tableaux de bord business connectés"
              width={1344}
              height={768}
              priority
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="absolute -bottom-5 left-5 hidden items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900/95 px-4 py-3 shadow-xl backdrop-blur md:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Clock className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-white">Livraison express 24 h</p>
              <p className="text-[11.5px] text-stone-400">en option sur la plupart des services</p>
            </div>
          </div>

          <div className="absolute -top-5 right-5 hidden items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900/95 px-4 py-3 shadow-xl backdrop-blur md:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-white">Paiement séquestré</p>
              <p className="text-[11.5px] text-stone-400">validé avant de libérer les fonds</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-stone-800/70 bg-stone-900/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-4 text-[12.5px] font-medium text-stone-400 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            Support IA gratuit 7 j/7
          </span>
          <span>France · Québec · Belgique · Suisse · Afrique francophone</span>
          <span>Avis clients réels : 4,2 à 5,0 ★</span>
          <span>Options à la carte, sans engagement</span>
        </div>
      </div>
    </section>
  );
}

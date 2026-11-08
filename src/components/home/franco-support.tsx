import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageCircle, Globe2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FrancophonieSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="franco-title">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative order-2 lg:order-1">
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-primary/15 via-transparent to-emerald-300/10 blur-lg" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-3xl border border-border shadow-xl">
            <Image
              src="/img/francophonie.png"
              alt="Carte stylisée du monde francophone : Europe, Canada et Afrique reliés par des connexions lumineuses"
              width={1344}
              height={768}
              className="h-auto w-full object-cover"
            />
          </div>
          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border/60 bg-card/90 px-5 py-3.5 text-[12.5px] font-medium text-muted-foreground backdrop-blur">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
              16 pays couverts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
              Fuseaux horaires maîtrisés
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
              100 % en français
            </span>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-[12.5px] font-semibold uppercase tracking-wider text-primary">Pensé pour la francophonie</p>
          <h2 id="franco-title" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Une plateforme taillée pour tous les pays francophones
          </h2>
          <p className="mt-4 text-[14.5px] leading-7 text-muted-foreground">
            b2bpro.store n'est pas une traduction de plateforme anglo-saxonne : c'est une place de
            marché pensée en français, pour le français. Nos vendeurs maîtrisent les sources de
            données locales — INSEE et BODACC en France, registres du réseau des chambres de
            commerce en Afrique de l'Ouest, registres québécois — et livrent dans les fuseaux
            horaires de vos marchés.
          </p>
          <ul className="mt-6 space-y-3.5">
            {[
              "Données locales : chaque service s'appuie sur les sources officielles de votre pays",
              "Paiement sécurisé compatible cartes bancaires internationales et PayPal",
              "Support IA en français 7 j/7, quelle que soit votre zone horaire",
              "Vendeurs en France, au Québec et dans 11 pays d'Afrique francophone",
            ].map((li) => (
              <li key={li} className="flex items-start gap-3 text-[14px] leading-6">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {li}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {["France", "Québec", "Belgique", "Suisse", "Sénégal", "Côte d'Ivoire", "Cameroun", "Maroc", "Tunisie", "RDC", "Bénin", "Togo", "Gabon", "Burkina Faso", "Mali", "Guinée"].map(
              (c) => (
                <span
                  key={c}
                  className="rounded-full border border-border bg-muted/60 px-3 py-1 text-[12.5px] font-medium text-muted-foreground"
                >
                  {c}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SupportCtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20" aria-labelledby="support-cta-title">
      <div className="relative overflow-hidden rounded-3xl bg-stone-950 px-6 py-12 text-white sm:px-10 lg:px-16 lg:py-16">
        <div className="hero-grid-bg absolute inset-0" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />

        <div className="relative grid items-center gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-emerald-300">
              Un conseiller IA, gratuit, 7 j/7
            </p>
            <h2 id="support-cta-title" className="mt-2 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              Une question avant de commander ? Notre support IA y répond instantanément.
            </h2>
            <p className="mt-4 max-w-2xl text-[14.5px] leading-7 text-stone-300">
              Quel service choisir pour votre besoin exact ? Quel volume prévoir ? Comment
              fonctionnent les options ? Notre intelligence artificielle connaît les 112 services
              par cœur et vous oriente vers la meilleure décision — avec le sourire et en français.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 px-7 text-[15px] font-bold text-stone-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-300"
              >
                <Link href="/support">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Parler au support IA
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="gap-2 rounded-full border-stone-700 bg-stone-900/60 px-6 text-[15px] font-semibold text-white hover:bg-stone-800"
              >
                <Link href="/services">
                  Explorer le catalogue
                  <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative hidden lg:col-span-2 lg:block">
            <div className="absolute -inset-3 rounded-full bg-emerald-500/15 blur-2xl" aria-hidden="true" />
            <Image
              src="/img/support-ia.png"
              alt="Illustration du support IA : bulles de conversation autour d'un cœur lumineux"
              width={1024}
              height={1024}
              className="relative mx-auto h-auto w-64 rounded-3xl border border-stone-800 shadow-2xl xl:w-72"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

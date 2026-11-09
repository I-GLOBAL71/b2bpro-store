import type { Metadata } from "next";
import Link from "next/link";
import { Zap, Database, Globe2, HeartHandshake, MessageCircleOff } from "lucide-react";
import { SupportChat } from "@/components/site/support-chat";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Support IA 7j/7 — conseils gratuits sur tous nos services",
  description:
    "Notre support IA répond instantanément à toutes vos questions sur b2bpro.store : choix de service, tarifs, délais, garanties. Gratuit, en français, 7 j/7. Un email suffit pour démarrer.",
  alternates: { canonical: "/support" },
};

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const { support } = await getSiteSettings();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[12.5px] font-semibold uppercase tracking-wider text-primary">
          Support IA · gratuit · 7 j/7
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Votre conseiller IA vous répond instantanément
        </h1>
        <p className="mt-4 text-[14.5px] leading-7 text-muted-foreground">
          Il connaît tous les services de b2bpro.store par cœur : livrables, options, tarifs,
          délais et garanties. Posez votre question en français, obtenez la réponse à la seconde —
          et la recommandation du service exact dont votre business a besoin.
        </p>
      </header>

      <div className="mt-10">
        {support.enabled ? (
          <SupportChat welcome={support.welcome} />
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <MessageCircleOff className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold">Support IA momentanément indisponible</h2>
              <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                Notre conseiller IA fait une courte pause maintenance. L&apos;équipe humaine reste
                joignable — laissez-nous un peu de temps, nous revenons très vite.
              </p>
            </div>
            <Link
              href="/services"
              className="rounded-full bg-primary px-6 py-2.5 text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Explorer les services en attendant
            </Link>
          </div>
        )}
      </div>

      {/* Capacités du support */}
      <section className="mt-14" aria-labelledby="support-capabilities">
        <h2 id="support-capabilities" className="text-center text-xl font-bold tracking-tight">
          Ce que notre support IA fait pour vous
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Zap,
              title: "Réponse instantanée",
              detail: "95 % des questions résolues en une seule réponse, sans attente ni file.",
            },
            {
              icon: Database,
              title: "Base exhaustive",
              detail: "Tout le catalogue, 14 pôles, toutes les options et FAQ : rien ne lui échappe.",
            },
            {
              icon: Globe2,
              title: "100 % francophone",
              detail: "Un français impeccable, adapté à votre pays et à votre contexte business.",
            },
            {
              icon: HeartHandshake,
              title: "Relais humain",
              detail: "Dites « un conseiller humain » et l'équipe vous répond en moins de 4 h.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-card p-5 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <c.icon className="h-5.5 w-5.5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-[14.5px] font-bold">{c.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-5.5 text-muted-foreground">{c.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AIO answer-first */}
      <section className="mt-12" aria-label="Comment fonctionne le support IA de b2bpro.store">
        <div className="rounded-2xl border border-primary/15 bg-accent/30 p-6">
          <h2 className="text-[15px] font-bold">Comment fonctionne le support IA de b2bpro.store ?</h2>
          <p className="mt-2 text-[14px] leading-7 text-foreground/90">
            Le support IA de b2bpro.store est un assistant conversationnel disponible 7 j/7 qui
            répond à toutes les questions sur la place de marché et l'ensemble de ses services B2B :
            choix de service adapté à un besoin précis, tarifs et options, délais de livraison
            (2-3 jours ouvrés), garanties (paiement séquestré, ajustements inclus, remboursement
            intégral). L'accès nécessite uniquement un email — utilisé pour le suivi de la
            conversation et la conformité RGPD. L'assistant s'appuie sur une base de connaissances
            exhaustive couvrant l'intégralité du catalogue, et un conseiller humain prend le
            relais sur simple demande.
          </p>
          <p className="mt-4">
            <Link href="/services" className="text-[14px] font-semibold text-primary hover:underline">
              Explorer le catalogue complet des services →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

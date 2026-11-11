/**
 * Page 404 (voir docs/REGRESSION-GUARD.md).
 *
 * RÔLE ANTI-RÉGRESSION : toute URL inconnue ou service supprimé atterrit ici
 * avec des sorties de secours utiles (catalogue, catégories populaires, blog,
 * support IA) au lieu d&apos;une erreur brute — le SEO et l&apos;expérience
 * restent préservés.
 *
 * ZONE PROTÉGÉE — évolution additive uniquement.
 */

import Link from "next/link";
import { Compass, LayoutGrid, Newspaper, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-accent/40">
        <Compass className="h-8 w-8 text-primary" aria-hidden="true" />
      </span>
      <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.2em] text-primary">
        Erreur 404
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
        Cette page n&apos;existe pas (ou plus)
      </h1>
      <p className="mt-3 max-w-md text-[14.5px] leading-7 text-muted-foreground">
        Le lien a peut-être changé ou le service a été retiré du catalogue.
        Explorez tous les services de nos experts vérifiés, ou demandez
        directement à notre conseiller IA.
      </p>

      {/* Recherche de sortie de secours */}
      <form
        action="/services"
        method="get"
        className="mt-8 flex w-full max-w-md items-center gap-2"
        role="search"
      >
        <label htmlFor="fallback-search" className="sr-only">
          Rechercher un service
        </label>
        <Input
          id="fallback-search"
          name="q"
          type="search"
          placeholder="Rechercher un service, un pôle d'expertise…"
          className="h-11 rounded-full"
        />
        <Button
          type="submit"
          className="h-11 shrink-0 gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 px-5 text-white"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Chercher</span>
        </Button>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="outline" className="h-11 gap-2 rounded-full px-6">
          <Link href="/">
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Accueil
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 gap-2 rounded-full px-6">
          <Link href="/services">
            <Compass className="h-4 w-4" aria-hidden="true" />
            Catalogue complet
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 gap-2 rounded-full px-6">
          <Link href="/blog">
            <Newspaper className="h-4 w-4" aria-hidden="true" />
            Blog
          </Link>
        </Button>
        <Button asChild variant="ghost" className="h-11 gap-2 rounded-full px-6 text-primary">
          <Link href="/support">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Support IA
          </Link>
        </Button>
      </div>
    </div>
  );
}

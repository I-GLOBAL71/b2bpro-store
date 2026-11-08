"use client";

/**
 * Frontière d'erreur du segment racine (voir docs/REGRESSION-GUARD.md).
 *
 * RÔLE ANTI-RÉGRESSION : si une future implémentation fait planter le rendu
 * d'une page, l'utilisateur voit cette page de secours élégante (header et
 * footer du layout restent visibles) au lieu d'un écran blanc. Le site reste
 * navigable : réessayer, accueil, catalogue, support IA.
 *
 * ZONE PROTÉGÉE — ne pas retirer ; évolution additive uniquement.
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, LayoutGrid, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Journalisation serveur/Console — précieuse pour diagnostiquer une régression.
    console.error("[b2bpro] Frontière d'erreur déclenchée :", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:py-32"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/60 bg-amber-100/60">
        <AlertTriangle className="h-8 w-8 text-amber-600" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
        Cette page a rencontré un souci technique
      </h1>
      <p className="mt-3 max-w-md text-[14.5px] leading-7 text-muted-foreground">
        Rien n&apos;est perdu : le reste de la marketplace fonctionne normalement.
        Vous pouvez réessayer l&apos;affichage ou reprendre votre navigation —
        nos {`112`} services restent à un clic.
      </p>
      {error.digest && (
        <p className="mt-2 rounded-full bg-muted px-3 py-1 text-[11.5px] font-medium text-muted-foreground">
          Référence technique : {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={reset}
          className="h-11 gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-500 px-6 text-[14.5px] font-bold text-white"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Réessayer
        </Button>
        <Button asChild variant="outline" className="h-11 gap-2 rounded-full px-6">
          <Link href="/">
            <Home className="h-4 w-4" aria-hidden="true" />
            Accueil
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 gap-2 rounded-full px-6">
          <Link href="/services">
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Tous les services
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

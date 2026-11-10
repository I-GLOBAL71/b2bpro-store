import Link from "next/link";
import { Wrench, TriangleAlert } from "lucide-react";

/**
 * Écran de maintenance (configurable : panneau admin → Général & SEO).
 * Rendu côté serveur dans (public)/layout — aucune donnée du catalogue
 * n'est exposée. Les administrateurs connectés ne le voient jamais.
 */
export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Wrench className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
        Maintenance en cours
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">
        {message || "b2bpro.store revient très vite — merci de votre patience."}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-border bg-card px-5 py-2.5 text-[14px] font-semibold transition-colors hover:border-primary/40"
        >
          Réessayer
        </Link>
        <Link
          href="/support"
          className="rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Contacter le support
        </Link>
      </div>
      <p className="mt-10 text-[12px] text-muted-foreground">
        Les commandes et livraisons en cours ne sont pas affectées.
      </p>
    </div>
  );
}

/**
 * Bandeau réservé aux administrateurs connectés pendant une maintenance :
 * rappelle que le site est fermé aux visiteurs (aperçu avant réouverture).
 */
export function AdminMaintenanceNotice() {
  return (
    <div
      role="alert"
      className="bg-amber-500/95 text-amber-950"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2.5 px-4 py-2 text-center text-[13px] font-semibold sm:px-6 lg:px-8">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Mode maintenance ACTIF : les visiteurs voient l'écran de maintenance — vous
          seul explorez le site.{" "}
          <Link href="/admin/general" className="underline underline-offset-2">
            Désactiver dans l&apos;admin
          </Link>
        </p>
      </div>
    </div>
  );
}

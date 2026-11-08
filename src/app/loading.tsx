/**
 * Skeleton de chargement racine (voir docs/REGRESSION-GUARD.md).
 *
 * RÔLE ANTI-RÉGRESSION : pendant les navigation et revalidations, l'utilisateur
 * voit une structure stable (héro + grille de cartes) au lieu d'un blanc —
 * évite les « flash » de contenu et les Layout Shift pendant que les requêtes
 * Prisma se résolvent.
 *
 * ZONE PROTÉGÉE — évolution additive uniquement.
 */

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Chargement du contenu"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      {/* Héro */}
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded-full bg-muted" />
        <div className="mx-auto h-10 w-full max-w-xl animate-pulse rounded-2xl bg-muted" />
        <div className="mx-auto h-10 w-3/4 max-w-md animate-pulse rounded-2xl bg-muted" />
        <div className="mx-auto h-12 w-full max-w-lg animate-pulse rounded-full bg-muted" />
      </div>

      {/* Statistiques */}
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-muted/50" />
        ))}
      </div>

      {/* Grille de services */}
      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[16/10] animate-pulse rounded-2xl bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}

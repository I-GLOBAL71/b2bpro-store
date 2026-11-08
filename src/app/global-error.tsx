"use client";

/**
 * Frontière d'erreur GLOBALE (dernier rempart — voir docs/REGRESSION-GUARD.md).
 *
 * RÔLE ANTI-RÉGRESSION : si le layout racine lui-même est cassé par une future
 * implémentation (import cassé, provider manquant, hydration fatale), cette
 * page remplace TOUT le document. Styles autonomes (pas de dépendance au
 * layout) pour garantir un rendu correct en toutes circonstances.
 *
 * ZONE PROTÉGÉE — ne pas retirer ; évolution additive uniquement.
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[b2bpro] Erreur globale (layout racine) :", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#faf9f6",
          color: "#1c1917",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "560px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              backgroundColor: "#fef3c7",
              fontSize: "30px",
            }}
            aria-hidden="true"
          >
            ⚠️
          </div>
          <p
            style={{
              marginTop: "20px",
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            b2bpro.store — incident technique temporaire
          </p>
          <p
            style={{
              marginTop: "10px",
              fontSize: "15px",
              lineHeight: 1.7,
              color: "#57534e",
            }}
          >
            La plateforme rencontre une difficulté passagère. Nos équipes
            sont alertées automatiquement — réessayez dans quelques instants,
            tout rentre généralement dans l&apos;ordre très vite.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: "12px",
                fontSize: "12px",
                color: "#78716c",
                fontFamily: "monospace",
              }}
            >
              Réf. : {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "26px",
              padding: "13px 30px",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#047857",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Réessayer maintenant
          </button>
        </div>
      </body>
    </html>
  );
}

import { NextResponse } from "next/server";
import { runIntegrityChecks } from "@/lib/guard";

/**
 * GET /api/integrity — Rapport d'intégrité anti-régression (voir docs/REGRESSION-GUARD.md).
 *
 * ZONE PROTÉGÉE — contrat de réponse :
 *   { ok, contractVersion, generatedAt, counts, checks[] }  (HTTP 200)
 *   Un contrôle en échec ⇒ ok:false et HTTP 503.
 * Évolutions autorisées : AJOUT de champs/contrôles uniquement.
 *
 * Usage : vérifier avant/après chaque implémentation, ou brancher un monitoring
 * externe (uptime) sur ce endpoint (HTTP 503 = alarme immédiate).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await runIntegrityChecks();
    return NextResponse.json(report, {
      status: report.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    // Le guard lui-même ne doit jamais faire tomber ce endpoint.
    console.error("GET /api/integrity", e);
    return NextResponse.json(
      {
        ok: false,
        contractVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        counts: null,
        checks: [
          {
            id: "guard-engine",
            label: "Moteur de garde d'intégrité",
            status: "fail",
            details: `Le moteur lui-même a échoué : ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

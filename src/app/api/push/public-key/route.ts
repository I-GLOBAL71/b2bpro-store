import { NextResponse } from "next/server";
import { pushConfigured } from "@/lib/push";

/**
 * GET /api/push/public-key — clé publique VAPID pour l'abonnement Web Push.
 * Le client ne peut RIEN faire de cette clé sans le serveur : la publier ici
 * est la convention Web Push (l'API push du navigateur la demande en clair).
 * VAPID absent → { publicKey: null } : l'invite active alors uniquement les
 * notifications locales du service worker, sans jamais échouer.
 */
export async function GET() {
  return NextResponse.json(
    { publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

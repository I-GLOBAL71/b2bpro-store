import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/push/subscribe — enregistre l'abonnement Web Push du navigateur.
 *
 * Corps : JSON PushSubscription sérialisé par le navigateur :
 *   { endpoint, expirationTime?, keys: { p256dh, auth } }
 *
 * Idempotent (upsert sur l'endpoint) : réactiver les notifications ou changer
 * d'onglet ne crée jamais de doublon. Les endpoints morts sont purgés côté
 * envoi (404/410), jamais ici : un abonnement déposé est présumé vivant.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
    const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";
    const userAgent =
      typeof req.headers.get("user-agent") === "string"
        ? req.headers.get("user-agent")!.slice(0, 250)
        : null;

    if (!endpoint.startsWith("https://") || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Abonnement push incomplet (endpoint, p256dh et auth requis)." },
        { status: 400 },
      );
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, userAgent },
      create: { endpoint, p256dh, auth, userAgent },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Enregistrement impossible pour le moment." },
      { status: 500 },
    );
  }
}

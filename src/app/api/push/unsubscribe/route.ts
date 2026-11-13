import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/push/unsubscribe — retire l'abonnement Web Push (désactivation
 * dans les réglages du navigateur, ou purge demandée par l'app). Idempotent :
 * l'absence de la ligne est un succès, pas une erreur.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    if (!endpoint.startsWith("https://")) {
      return NextResponse.json({ error: "endpoint requis" }, { status: 400 });
    }
    await db.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Désinscription impossible pour le moment." },
      { status: 500 },
    );
  }
}

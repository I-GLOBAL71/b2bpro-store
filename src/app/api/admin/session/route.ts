import { NextResponse } from "next/server";
import { API_ROUTES } from "@/lib/contracts";
import { isAdminSession, isUsingDefaultPassword } from "@/lib/admin-auth";

/**
 * GET /api/admin/session — état de session courant.
 * Expose `usingDefaultPassword` pour alerter le panneau (mot de passe par
 * défaut encore actif) — jamais le mot de passe lui-même.
 */
export async function GET() {
  try {
    const authenticated = await isAdminSession();
    return NextResponse.json({
      authenticated,
      usingDefaultPassword: isUsingDefaultPassword(),
    });
  } catch (e) {
    console.error(`${API_ROUTES.adminSession}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

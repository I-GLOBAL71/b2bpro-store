import { NextRequest, NextResponse } from "next/server";
import { adminConfigPatchSchema, ADMIN_LOG_ACTIONS, API_ROUTES } from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { ConfigValidationError, getSiteSettings, logAdminAction, saveSettingsGroup } from "@/lib/settings";

/**
 * GET /api/admin/config — réglages effectifs complets (défauts ← base).
 * PATCH /api/admin/config — patch partiel d'un groupe, validé par zod :
 * { group: "vitrine", patch: { windowMinutes: 15 } }
 */
export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json(await getSiteSettings());
  } catch (e) {
    console.error(`${API_ROUTES.adminConfig} GET`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => null);
    const parsed = adminConfigPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Requête invalide : ${parsed.error.issues[0]?.message ?? "forme inattendue"}` },
        { status: 400 }
      );
    }
    const { group, patch } = parsed.data;

    const updated = await saveSettingsGroup(group, patch);
    await logAdminAction(
      ADMIN_LOG_ACTIONS.CONFIG_UPDATE,
      `Réglages « ${group} » mis à jour : ${Object.keys(patch).join(", ")}`
    );
    return NextResponse.json({ ok: true, group, value: updated });
  } catch (e) {
    if (e instanceof ConfigValidationError) {
      return NextResponse.json({ error: e.message, issues: e.issues }, { status: 422 });
    }
    console.error(`${API_ROUTES.adminConfig} PATCH`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

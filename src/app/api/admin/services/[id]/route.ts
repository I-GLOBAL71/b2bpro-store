import { NextRequest, NextResponse } from "next/server";
import { ADMIN_LOG_ACTIONS, adminServicePatchSchema, API_ROUTES } from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/settings";

/**
 * PATCH /api/admin/services/[id] — mise à jour pilotée d'un service.
 * v1.5.0 : bascule `featured` (utilisée par le repli best-sellers et
 * la mise en avant éditoriale). Les autres champs restent gérés par le
 * pipeline de contenu (skills rédactionnels + guard) — jamais ici.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await ensureAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = adminServicePatchSchema.safeParse(body);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Requête invalide : champ modifiable requis" }, { status: 400 });
    }

    const existing = await db.service.findUnique({
      where: { id },
      select: { id: true, slug: true, title: true, featured: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
    }

    const updated = await db.service.update({
      where: { id },
      data: parsed.data,
      select: { id: true, slug: true, featured: true },
    });

    if (parsed.data.featured !== undefined) {
      await logAdminAction(
        ADMIN_LOG_ACTIONS.SERVICE_UPDATE,
        `Service « ${existing.title} » (${existing.slug}) : featured ${existing.featured ? "ON" : "OFF"} → ${updated.featured ? "ON" : "OFF"}`
      );
    }
    return NextResponse.json({ ok: true, service: updated });
  } catch (e) {
    console.error(`${API_ROUTES.adminServices}/[id] PATCH`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

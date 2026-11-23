import { NextRequest, NextResponse } from "next/server";
import { ADMIN_LOG_ACTIONS, adminServicePatchSchema, API_ROUTES } from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/settings";
import { submitNewOrUpdatedContent } from "@/lib/gsc";

/**
 * PATCH /api/admin/services/[id] — mise à jour pilotée d'un service.
 * v1.5.0 : bascule `featured` (repli best-sellers, mise en avant éditoriale).
 * v2.2.0 : `basePrice` — le tarif de base devient modifiable depuis le panneau
 * (le tunnel de commande recalcule TOUJOURS le total serveur depuis la base,
 * donc un tarif changé ici s'applique immédiatement et partout). Le reste du
 * contenu demeure géré par le pipeline éditorial (skills + guard) — jamais ici.
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
      select: { id: true, slug: true, title: true, featured: true, basePrice: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
    }

    const updated = await db.service.update({
      where: { id },
      data: parsed.data,
      select: { id: true, slug: true, featured: true, basePrice: true },
    });

    if (parsed.data.basePrice !== undefined) {
      const eurFmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
      await logAdminAction(
        ADMIN_LOG_ACTIONS.SERVICE_UPDATE,
        `Service « ${existing.title} » (${existing.slug}) : tarif ${eurFmt(existing.basePrice)} € → ${eurFmt(updated.basePrice)} €`
      );
    }
    if (parsed.data.featured !== undefined) {
      await logAdminAction(
        ADMIN_LOG_ACTIONS.SERVICE_UPDATE,
        `Service « ${existing.title} » (${existing.slug}) : featured ${existing.featured ? "ON" : "OFF"} → ${updated.featured ? "ON" : "OFF"}`
      );
    }

    // Soumission automatique Google Search Console (mise à jour)
    void submitNewOrUpdatedContent({
      type: "service",
      slug: existing.slug,
      title: existing.title,
    }).catch((err) => {
      console.warn(`⚠️ [GSC] Erreur soumission automatique /services/${existing.slug}:`, err);
    });

    return NextResponse.json({ ok: true, service: updated });
  } catch (e) {
    console.error(`${API_ROUTES.adminServices}/[id] PATCH`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

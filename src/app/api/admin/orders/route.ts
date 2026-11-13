import { NextResponse } from "next/server";
import { API_ROUTES } from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import type { AdminOrderRow } from "@/lib/contracts";

/**
 * GET /api/admin/orders — commandes récentes pour le pilotage support
 * (page /admin/commandes, v2.5.0) : 100 dernières, client inclus, dernière
 * demande de modification et présence d'avis. Le panneau décide ensuite de
 * marquer « livré » (POST /api/admin/orders/[reference]/deliver) quand le
 * prestataire a rendu le travail — c'est ce qui déclenche chez le client le
 * compte à rebours « validez la livraison » puis, après validation, l'avis.
 */
export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const orders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        lead: { select: { email: true, name: true } },
        revisions: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { revisions: true } },
        review: { select: { id: true } },
      },
    });

    const rows: AdminOrderRow[] = orders.map((o) => {
      const lastRevision = o.revisions[0];
      return {
        id: o.id,
        reference: o.reference,
        serviceTitle: o.serviceTitle,
        serviceSlug: o.serviceSlug,
        total: o.total,
        currency: o.currency,
        paymentStatus: o.paymentStatus,
        paymentProvider: o.paymentProvider,
        stage: o.stage,
        createdAt: o.createdAt.toISOString(),
        paidAt: o.paidAt?.toISOString() ?? null,
        deliveredAt: o.deliveredAt?.toISOString() ?? null,
        releasedAt: o.releasedAt?.toISOString() ?? null,
        deliveryDays: o.deliveryDays,
        clientEmail: o.lead.email,
        clientName: o.lead.name,
        revisionCount: o._count.revisions,
        lastRevision: lastRevision
          ? {
              reason: lastRevision.reason,
              status: lastRevision.status,
              createdAt: lastRevision.createdAt.toISOString(),
            }
          : null,
        hasReview: Boolean(o.review),
      };
    });

    return NextResponse.json(
      {
        orders: rows,
        counts: {
          total: rows.length,
          paid: rows.filter((r) => r.paymentStatus === "PAID").length,
          inProduction: rows.filter(
            (r) => r.paymentStatus === "PAID" && r.stage === "production",
          ).length,
          inRevision: rows.filter(
            (r) => r.paymentStatus === "PAID" && r.stage === "revision",
          ).length,
          delivered: rows.filter(
            (r) => r.paymentStatus === "PAID" && r.stage === "delivered",
          ).length,
          completed: rows.filter(
            (r) => r.paymentStatus === "PAID" && r.stage === "completed",
          ).length,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(`${API_ROUTES.adminSupport.replace("/support", "/orders")} GET`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

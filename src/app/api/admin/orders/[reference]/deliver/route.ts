import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_LOG_ACTIONS,
  ORDER_PAYMENT_STATUS,
  ORDER_STAGES,
} from "@/lib/contracts";
import { ensureAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/settings";
import { sendClientOrderDelivered } from "@/lib/mailer";

/**
 * POST /api/admin/orders/[reference]/deliver — le support déclare le livrable
 * PRÊT (v2.5.0) : la commande (payée) passe en étape « delivered ».
 *
 * C'est ce geste qui ouvre chez le client la phase décisive : le compte à
 * rebours devient « validez la livraison » (email envoyé immédiatement au
 * client + badge dans son espace) ; sa validation libèrera ensuite les fonds
 * au prestataire. Les demandes de modification pendantes sont closes (elles
 * ont été traitées dans le livrable remis).
 *
 * Garde : session administrateur (ensureAdmin). Conditions : PAID et étape
 * production/revision. Idempotent par la garde d'étape (409 sinon).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    const { reference } = await params;
    const order = await db.order.findUnique({
      where: { reference },
      include: { lead: { select: { email: true, name: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    if (order.paymentStatus !== ORDER_PAYMENT_STATUS.PAID) {
      return NextResponse.json(
        { error: "Seule une commande payée (fonds séquestrés) peut être livrée." },
        { status: 409 }
      );
    }
    if (order.stage !== ORDER_STAGES.PRODUCTION && order.stage !== ORDER_STAGES.REVISION) {
      return NextResponse.json(
        { error: "Commande déjà livrée ou validée — aucune action possible ici." },
        { status: 409 }
      );
    }

    const deliveredAt = new Date();
    await db.order.update({
      where: { id: order.id },
      data: { stage: ORDER_STAGES.DELIVERED, deliveredAt },
    });
    // Les demandes de modification ont été couvertes par ce livrable.
    await db.orderRevision.updateMany({
      where: { orderId: order.id, status: "pending" },
      data: { status: "resolved" },
    });

    // Email au client : « votre livrable est prêt — validez la livraison »
    // (jamais bloquant ; trace console en développement).
    const emailSent = await sendClientOrderDelivered({
      to: order.lead.email,
      clientName: order.lead.name,
      reference: order.reference,
      serviceTitle: order.serviceTitle,
      total: order.total,
    });
    await logAdminAction(
      ADMIN_LOG_ACTIONS.ORDER_DELIVERED,
      `Commande ${order.reference} (${order.serviceTitle}) marquée livrée pour ${order.lead.email}${emailSent ? " — email de validation envoyé au client" : ""}`
    );

    return NextResponse.json({
      ok: true,
      reference: order.reference,
      stage: ORDER_STAGES.DELIVERED,
      deliveredAt: deliveredAt.toISOString(),
      emailSent,
    });
  } catch (e) {
    console.error("POST /api/admin/orders/[reference]/deliver", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ADMIN_LOG_ACTIONS,
  ORDER_PAYMENT_STATUS,
  ORDER_STAGES,
} from "@/lib/contracts";
import { logAdminAction } from "@/lib/settings";
import { notifyOwnerOrderValidated } from "@/lib/mailer";

/**
 * POST /api/orders/[reference]/validate — le client VALIDE la livraison
 * (v2.5.0) : geste décisif qui libère les fonds séquestrés au prestataire.
 *
 * Garde d'identité SERVEUR (commande rattachée au Lead de l'email de
 * session). Conditions : paiement PAID et étape « delivered » (livrable
 * déclaré prêt par le support) — impossible de valider un travail non livré,
 * la demande de modification reste la voie prévue avant validation.
 *
 * Effets : étape « completed » + releasedAt (horodatage de libération),
 * demandes de modification pendantes closes, notification au support
 * (versement à opérer) + trace d'audit. L'avis public devient possible.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const email =
      typeof session?.user?.email === "string"
        ? session.user.email.toLowerCase().trim()
        : null;
    if (!email) {
      return NextResponse.json(
        {
          error:
            "Connexion requise pour valider la livraison. Identifiez-vous puis reprenez depuis votre espace commandes.",
        },
        { status: 401 }
      );
    }

    const { reference } = await params;
    const order = await db.order.findUnique({
      where: { reference },
      include: { lead: { select: { email: true } } },
    });
    if (!order || order.lead.email !== email) {
      return NextResponse.json(
        { error: "Commande introuvable dans votre espace." },
        { status: 404 }
      );
    }
    if (order.paymentStatus !== ORDER_PAYMENT_STATUS.PAID) {
      return NextResponse.json(
        { error: "Seule une commande payée peut être validée." },
        { status: 409 }
      );
    }
    if (order.stage !== ORDER_STAGES.DELIVERED) {
      return NextResponse.json(
        {
          error:
            "Le livrable doit d'abord être déclaré prêt. En cas de besoin d'ajustement, utilisez « Demander une modification ».",
        },
        { status: 409 }
      );
    }

    // Validation : fonds libérés (releasedAt), demandes pendantes closes.
    const releasedAt = new Date();
    await db.order.update({
      where: { id: order.id },
      data: { stage: ORDER_STAGES.COMPLETED, releasedAt },
    });
    await db.orderRevision.updateMany({
      where: { orderId: order.id, status: "pending" },
      data: { status: "resolved" },
    });

    // Notification au support (versement à opérer) + trace d'audit.
    await notifyOwnerOrderValidated({
      reference: order.reference,
      serviceTitle: order.serviceTitle,
      total: order.total,
      clientEmail: order.lead.email,
      deliveredAt: order.deliveredAt,
    });
    await logAdminAction(
      ADMIN_LOG_ACTIONS.ORDER_VALIDATED,
      `Commande ${order.reference} validée par le client (${order.lead.email}) — ${order.total} € à libérer au prestataire.`
    );

    return NextResponse.json({
      ok: true,
      reference: order.reference,
      stage: ORDER_STAGES.COMPLETED,
      releasedAt: releasedAt.toISOString(),
    });
  } catch (e) {
    console.error("POST /api/orders/[reference]/validate", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

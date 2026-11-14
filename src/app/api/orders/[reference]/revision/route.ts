import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ADMIN_LOG_ACTIONS,
  ORDER_PAYMENT_STATUS,
  ORDER_STAGES,
  orderRevisionRequestSchema,
} from "@/lib/contracts";
import { logAdminAction } from "@/lib/settings";
import { notifyOwnerRevisionRequested } from "@/lib/mailer";

/**
 * POST /api/orders/[reference]/revision — le client demande une modification
 * sur un travail en cours ou livré-non-validé (v2.5.0).
 *
 * Garde d'identité SERVEUR : la commande doit appartenir au Lead de l'email
 * de SESSION (jamais de confiance au corps de requête). Conditions :
 * paiement PAID (fonds séquestrés) et étape non terminée — une commande
 * validée (fonds libérés) ne rouvre pas par cette voie (support à contacter).
 *
 * Effets : création d'une demande motivée (OrderRevision), passage en étape
 * « revision », notification URGENTE au support + trace d'audit. Jamais de
 * suppression : l'historique des demandes reste lisible par le client.
 */
export async function POST(
  req: NextRequest,
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
            "Connexion requise pour demander une modification. Identifiez-vous puis reprenez depuis votre espace commandes.",
        },
        { status: 401 }
      );
    }

    const { reference } = await params;
    const parsed = orderRevisionRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Demande invalide" },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: { reference },
      include: { lead: { select: { email: true } }, _count: { select: { revisions: true } } },
    });
    if (!order || order.lead.email !== email) {
      return NextResponse.json(
        { error: "Commande introuvable dans votre espace." },
        { status: 404 }
      );
    }
    if (order.paymentStatus !== ORDER_PAYMENT_STATUS.PAID) {
      return NextResponse.json(
        { error: "La modification ne concerne qu'une commande payée (fonds séquestrés)." },
        { status: 409 }
      );
    }
    if (order.stage === ORDER_STAGES.COMPLETED) {
      return NextResponse.json(
        {
          error:
            "Commande déjà validée : les fonds ont été libérés. Contactez le support humain depuis votre espace pour toute réclamation.",
        },
        { status: 409 }
      );
    }

    // Dépôt de la demande + passage en étape « revision » (idempotent sur
    // l'étape : une demande supplémentaire reste possible pour préciser).
    const revision = await db.orderRevision.create({
      data: { orderId: order.id, reason: parsed.data.reason },
    });
    await db.order.update({
      where: { id: order.id },
      data: { stage: ORDER_STAGES.REVISION },
    });

    const revisionCount = order._count.revisions + 1;

    // Alerte URGENTE au support + trace d'audit (jamais bloquantes).
    await notifyOwnerRevisionRequested({
      reference: order.reference,
      serviceTitle: order.serviceTitle,
      reason: parsed.data.reason,
      clientEmail: order.lead.email,
      revisionCount,
    });
    await logAdminAction(
      ADMIN_LOG_ACTIONS.ORDER_REVISION,
      `Demande de modification n°${revisionCount} sur ${order.reference} (${order.serviceTitle}) : « ${parsed.data.reason.slice(0, 140)}${parsed.data.reason.length > 140 ? "…" : ""} »`
    );

    return NextResponse.json({
      ok: true,
      reference: order.reference,
      stage: ORDER_STAGES.REVISION,
      revisionId: revision.id,
      revisionCount,
    });
  } catch (e) {
    console.error("POST /api/orders/[reference]/revision", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

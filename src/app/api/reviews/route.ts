import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderReviewRequestSchema, ORDER_PAYMENT_STATUS, ORDER_STAGES } from "@/lib/contracts";

/**
 * POST /api/reviews — publication d'un avis client.
 *
 * v2.5.0 — avis LIÉ à une commande validée : quand `orderReference` est
 * présent, la commande doit appartenir à l'email de SESSION du client, être
 * payée ET validée (stage completed, fonds libérés) — l'avis est alors la
 * conclusion du cycle (un seul avis possible par commande, unicité orderId).
 * Sans `orderReference` : comportement public historique inchangé.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = orderReviewRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Avis invalide" },
        { status: 400 }
      );
    }
    const { serviceId, authorName, country, rating, comment, orderReference } = parsed.data;

    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) return NextResponse.json({ error: "Service introuvable" }, { status: 404 });

    // ── Voie « avis lié à une commande » : garde d'identité serveur ──────────
    let orderId: string | null = null;
    let orderLabel = "Offre de base";
    if (orderReference) {
      const session = await getServerSession(authOptions);
      const email =
        typeof session?.user?.email === "string"
          ? session.user.email.toLowerCase().trim()
          : null;
      if (!email) {
        return NextResponse.json(
          {
            error:
              "Connexion requise pour l'avis lié à votre commande — identifiez-vous puis reprenez depuis votre espace.",
          },
          { status: 401 }
        );
      }
      const order = await db.order.findUnique({
        where: { reference: orderReference },
        include: { lead: { select: { email: true } }, review: { select: { id: true } } },
      });
      if (!order || order.lead.email !== email) {
        return NextResponse.json(
          { error: "Commande introuvable dans votre espace." },
          { status: 404 }
        );
      }
      if (order.paymentStatus !== ORDER_PAYMENT_STATUS.PAID || order.stage !== ORDER_STAGES.COMPLETED) {
        return NextResponse.json(
          {
            error:
              "L'avis se débloque après la validation de la livraison (fonds libérés au prestataire).",
          },
          { status: 409 }
        );
      }
      if (order.review) {
        return NextResponse.json(
          { error: "Un avis est déjà publié pour cette commande." },
          { status: 409 }
        );
      }
      orderId = order.id;
      orderLabel = `Commande ${order.reference}`;
    }

    const review = await db.review.create({
      data: {
        serviceId,
        authorName: authorName.trim(),
        country: country && country.trim() ? country.trim() : "France",
        rating: Math.round(rating * 10) / 10,
        comment: comment.trim(),
        orderLabel,
        orderId,
      },
    });

    // Recalcule la moyenne du service
    const agg = await db.review.aggregate({
      where: { serviceId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await db.service.update({
      where: { id: serviceId },
      data: {
        rating: Math.round((agg._avg.rating ?? rating) * 10) / 10,
        reviewsCount: agg._count._all,
      },
    });

    return NextResponse.json({ ok: true, reviewId: review.id });
  } catch (e) {
    console.error("POST /api/reviews", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

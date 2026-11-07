import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Publication d'un avis client — notation interne intuitive. */
export async function POST(req: NextRequest) {
  try {
    const { serviceId, authorName, country, rating, comment } = await req.json();

    if (!serviceId || typeof serviceId !== "string") {
      return NextResponse.json({ error: "Service manquant" }, { status: 400 });
    }
    if (typeof authorName !== "string" || authorName.trim().length < 2 || authorName.length > 60) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }
    if (typeof comment !== "string" || comment.trim().length < 15 || comment.length > 1200) {
      return NextResponse.json({ error: "Commentaire invalide (15 à 1200 caractères)" }, { status: 400 });
    }
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: "Note invalide" }, { status: 400 });
    }

    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) return NextResponse.json({ error: "Service introuvable" }, { status: 404 });

    const review = await db.review.create({
      data: {
        serviceId,
        authorName: authorName.trim(),
        country: typeof country === "string" && country.trim() ? country.trim() : "France",
        rating: Math.round(r * 10) / 10,
        comment: comment.trim(),
        orderLabel: "Offre de base",
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
        rating: Math.round((agg._avg.rating ?? r) * 10) / 10,
        reviewsCount: agg._count._all,
      },
    });

    return NextResponse.json({ ok: true, reviewId: review.id });
  } catch (e) {
    console.error("POST /api/reviews", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

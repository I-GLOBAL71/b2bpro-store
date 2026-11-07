import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Enregistre une commande (lead + récapitulatif). Le paiement réel est simulé côté front. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      name,
      brief,
      serviceId,
      serviceSlug,
      serviceTitle,
      optionIds = [],
      total,
    } = body;

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: { options: true },
    });
    if (!service) {
      return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
    }
    const chosen = service.options.filter((o) => optionIds.includes(o.id));
    const computedTotal =
      service.basePrice + chosen.reduce((sum, o) => sum + o.priceExtra, 0);
    if (Math.abs(computedTotal - total) > 0.01) {
      return NextResponse.json({ error: "Total incohérent" }, { status: 400 });
    }

    const lead = await db.lead.upsert({
      where: { email: email.toLowerCase().trim() },
      update: name ? { name } : {},
      create: {
        email: email.toLowerCase().trim(),
        name: typeof name === "string" && name ? name : null,
        source: "commande",
      },
    });

    const summary = [
      `Commande : ${serviceTitle}`,
      `Service : /services/${serviceSlug}`,
      `Offre de base : ${service.basePrice} € (${service.deliveryDays} j)`,
      ...chosen.map((o) => `Option : ${o.name} (+${o.priceExtra} €, +${o.daysExtra} j${o.monthly ? ", mensuel" : ""})`),
      `TOTAL : ${computedTotal} € · livraison ${service.deliveryDays + chosen.reduce((s, o) => s + o.daysExtra, 0)} jours`,
      brief ? `Consignes : ${brief}` : "",
      `Lead : ${lead.id}`,
    ]
      .filter(Boolean)
      .join("\n");

    await db.chatMessage.create({
      data: {
        leadId: lead.id,
        role: "assistant",
        content: summary,
      },
    });

    return NextResponse.json({ ok: true, orderId: `CMD-${Date.now().toString(36).toUpperCase()}`, total: computedTotal });
  } catch (e) {
    console.error("POST /api/orders", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAuthRequiredForOrders } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Enregistre une commande (lead + récapitulatif). Le paiement réel est simulé côté front.
 *
 * v2.1.0 — Gating d'authentification : dès que l'auth est configurée (Google/
 * lien magique) sur cet environnement, la finalisation EXIGE une session ;
 * l'email du lead est alors l'email de SESSION (identité vérifiée, serveur-
 * autoritaire — le champ email du corps est ignoré). Sans session → 401.
 * Escape hatch : ORDER_ALLOW_GUEST=true (env) rétablit les commandes invité.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth exigée ? Identité serveur-autoritaire (v2.1.0) — garde serveur ────
    const requireAuth = isAuthRequiredForOrders();
    const session = requireAuth ? await getServerSession(authOptions) : null;
    const sessionEmail =
      (typeof session?.user?.email === "string"
        ? session.user.email.toLowerCase().trim()
        : "") || null;
    if (requireAuth && !sessionEmail) {
      return NextResponse.json(
        {
          error:
            "Connexion requise pour finaliser une commande. Identifiez-vous (Google ou lien email) puis reprenez votre panier — votre sélection est conservée.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, brief, serviceId, serviceSlug, serviceTitle, optionIds = [], total } = body;

    // Email du lead : identité de session si commande connectée ; sinon email
    // saisi (mode invité explicite — ORDER_ALLOW_GUEST=true uniquement).
    const email = sessionEmail ?? (typeof body.email === "string" ? body.email : "");
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
      update: {},
      create: {
        email: email.toLowerCase().trim(),
        name: typeof name === "string" && name ? name : null,
        source: "commande",
      },
    });

    // v2.0.0 : persister AUSSI une ligne Order (voie démo, non payée) pour
    // que le client connecté retrouve sa commande dans /account. La voie
    // PayPal crée déjà ses propres lignes (paymentProvider "paypal").
    const reference = `CMD-${Date.now().toString(36).toUpperCase()}`;
    const computedDays = service.deliveryDays + chosen.reduce((s, o) => s + o.daysExtra, 0);
    await db.order.create({
      data: {
        reference,
        leadId: lead.id,
        serviceId: service.id,
        serviceSlug,
        serviceTitle,
        optionIds: JSON.stringify(chosen.map((o) => o.id)),
        brief: typeof brief === "string" && brief ? brief : null,
        total: computedTotal,
        deliveryDays: computedDays,
        currency: "EUR",
        paymentProvider: "demo",
        paymentStatus: "CREATED",
      },
    });

    const summary = [
      `Commande : ${serviceTitle}`,
      `Service : /services/${serviceSlug}`,
      `Offre de base : ${service.basePrice} € (${service.deliveryDays} j)`,
      ...chosen.map((o) => `Option : ${o.name} (+${o.priceExtra} €, +${o.daysExtra} j${o.monthly ? ", mensuel" : ""})`),
      `TOTAL : ${computedTotal} € · livraison ${computedDays} jours`,
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

    return NextResponse.json({ ok: true, orderId: reference, total: computedTotal });
  } catch (e) {
    console.error("POST /api/orders", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

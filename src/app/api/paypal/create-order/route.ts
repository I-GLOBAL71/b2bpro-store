import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPayPalConfig } from "@/lib/env";
import { createPayPalOrder, PayPalError } from "@/lib/paypal";
import {
  API_ROUTES,
  paypalCreateOrderRequestSchema,
} from "@/lib/contracts";

/**
 * POST /api/paypal/create-order
 *
 * Crée la commande PayPal (intent CAPTURE) pour un service + options choisies.
 *   • Le montant est TOUJOURS recalculé serveur depuis la base — le client ne
 *     transmet AUCUN total (différence assumée avec /api/orders, qui vérifie
 *     un total transmis : ici, source d'autorité unique = serveur).
 *   • Persiste une commande locale `Order` (paymentStatus CREATED) reliée au
 *     lead, avec slugs/titres dénormalisés (traçabilité SEO).
 *   • Réponses : 200 {paypalOrderId, reference, total, currency} · 400 payload
 *     invalide · 404 service inconnu · 503 PayPal non configuré · 502 erreur
 *     API PayPal · 500 erreur serveur.
 */
export async function POST(req: NextRequest) {
  const cfg = getPayPalConfig();
  if (!cfg.enabled) {
    return NextResponse.json(
      { error: "Paiement PayPal non configuré sur cet environnement (PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET)." },
      { status: 503 }
    );
  }

  try {
    const parsed = paypalCreateOrderRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    const { email, name, brief, serviceId, optionIds } = parsed.data;

    // ── Autorité serveur : service + options + total recalculé ──────────────
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
    const computedDays =
      service.deliveryDays + chosen.reduce((s, o) => s + o.daysExtra, 0);

    // ── Lead (même logique que /api/orders : upsert par email) ─────────────
    const lead = await db.lead.upsert({
      where: { email: email.toLowerCase().trim() },
      update: name ? { name } : {},
      create: {
        email: email.toLowerCase().trim(),
        name: typeof name === "string" && name ? name : null,
        source: "commande",
      },
    });

    const reference = `CMD-${Date.now().toString(36).toUpperCase()}`;

    // ── Commande PayPal (montant serveur uniquement) ────────────────────────
    const ppOrder = await createPayPalOrder({
      total: computedTotal,
      currency: cfg.currency,
      reference,
      description: `${service.title} — b2bpro.store`,
    });

    // ── Commande locale CREATED (liée au lead + service, slugs dénormalisés) ─
    await db.order.create({
      data: {
        reference,
        leadId: lead.id,
        serviceId: service.id,
        serviceSlug: service.slug,
        serviceTitle: service.title,
        optionIds: JSON.stringify(chosen.map((o) => o.id)),
        brief: typeof brief === "string" && brief ? brief : null,
        total: computedTotal,
        deliveryDays: computedDays,
        currency: cfg.currency,
        paymentProvider: "paypal",
        paymentStatus: "CREATED",
        paypalOrderId: ppOrder.id,
      },
    });

    return NextResponse.json({
      paypalOrderId: ppOrder.id,
      reference,
      total: computedTotal,
      currency: cfg.currency,
    });
  } catch (e) {
    if (e instanceof PayPalError) {
      console.error(`POST ${API_ROUTES.paypalCreateOrder} — PayPal:`, e.message, e.detail ?? "");
      return NextResponse.json({ error: e.message }, { status: e.status === 503 ? 503 : 502 });
    }
    console.error(`POST ${API_ROUTES.paypalCreateOrder}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPayPalConfig } from "@/lib/env";
import { capturePayPalOrder, PayPalError } from "@/lib/paypal";
import {
  API_ROUTES,
  ORDER_PAYMENT_STATUS,
  paypalCaptureOrderRequestSchema,
  safeJsonParse,
} from "@/lib/contracts";

/**
 * POST /api/paypal/capture-order
 *
 * Capture les fonds de la commande PayPal approuvée par l'acheteur :
 *   1. retrouve la commande locale `Order` par paypalOrderId (404 sinon) ;
 *   2. capture via l'API PayPal (idempotent si déjà PAID) ;
 *   3. marque la commande PAID + paidAt + captureId + infos payeur ;
 *   4. écrit le récapitulatif client en ChatMessage du lead (même format que
 *      la voie démo /api/orders, enrichi de la transaction PayPal).
 *
 * Réponses : 200 {ok, reference, total, currency, payerEmail} · 400 payload
 * invalide ou capture refusée · 404 commande inconnue · 503 PayPal non
 * configuré · 502 erreur API PayPal · 500 erreur serveur.
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
    const parsed = paypalCaptureOrderRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    const { paypalOrderId } = parsed.data;

    const order = await db.order.findUnique({ where: { paypalOrderId } });
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    // Idempotence : capture déjà enregistrée → renvoyer le succès tel quel.
    if (order.paymentStatus === ORDER_PAYMENT_STATUS.PAID) {
      return NextResponse.json({
        ok: true,
        reference: order.reference,
        total: order.total,
        currency: order.currency as "EUR",
        payerEmail: order.payerEmail,
      });
    }

    // ── Capture côté PayPal ─────────────────────────────────────────────────
    let capture;
    try {
      capture = await capturePayPalOrder(paypalOrderId);
    } catch (e) {
      // Échec de capture → la commande locale passe en FAILED (traçabilité),
      // l'erreur remonte au client avec son statut d'origine.
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: ORDER_PAYMENT_STATUS.FAILED },
      }).catch(() => undefined);
      if (e instanceof PayPalError) {
        console.error(`POST ${API_ROUTES.paypalCaptureOrder} — PayPal:`, e.message, e.detail ?? "");
        return NextResponse.json({ error: e.message }, { status: e.status === 503 ? 503 : 400 });
      }
      throw e;
    }

    if (capture.status !== "COMPLETED") {
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: ORDER_PAYMENT_STATUS.FAILED },
      }).catch(() => undefined);
      return NextResponse.json(
        { error: `Paiement non complété (statut PayPal : ${capture.status}).` },
        { status: 400 }
      );
    }

    // ── Commande locale → PAID ──────────────────────────────────────────────
    const paid = await db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: ORDER_PAYMENT_STATUS.PAID,
        paidAt: new Date(),
        paypalCaptureId: capture.captureId,
        payerEmail: capture.payerEmail,
        payerName: capture.payerName,
      },
    });

    // ── Récapitulatif client attaché au lead (parité avec /api/orders) ──────
    const service = await db.service.findUnique({
      where: { id: order.serviceId },
      include: { options: true },
    });
    const chosenIds = safeJsonParse<string[]>(order.optionIds, []);
    const chosen = service?.options.filter((o) => chosenIds.includes(o.id)) ?? [];

    const summary = [
      `Commande payée : ${order.serviceTitle}`,
      `Service : /services/${order.serviceSlug}`,
      `Offre de base : ${service?.basePrice ?? "—"} € (${service?.deliveryDays ?? "—"} j)`,
      ...chosen.map(
        (o) => `Option : ${o.name} (+${o.priceExtra} €, +${o.daysExtra} j${o.monthly ? ", mensuel" : ""})`
      ),
      `TOTAL RÉGLÉ : ${paid.total} € · livraison ${paid.deliveryDays} jours`,
      `Paiement PayPal confirmé — transaction ${paid.paypalCaptureId ?? paypalOrderId}`,
      `Référence : ${paid.reference}`,
      order.brief ? `Consignes : ${order.brief}` : "",
      `Lead : ${paid.leadId}`,
    ]
      .filter(Boolean)
      .join("\n");

    await db.chatMessage.create({
      data: {
        leadId: paid.leadId,
        role: "assistant",
        content: summary,
      },
    });

    return NextResponse.json({
      ok: true,
      reference: paid.reference,
      total: paid.total,
      currency: paid.currency as "EUR",
      payerEmail: paid.payerEmail,
    });
  } catch (e) {
    if (e instanceof PayPalError) {
      console.error(`POST ${API_ROUTES.paypalCaptureOrder} — PayPal:`, e.message, e.detail ?? "");
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    console.error(`POST ${API_ROUTES.paypalCaptureOrder}`, e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

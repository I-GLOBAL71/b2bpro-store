/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Client PayPal REST v2 (côté serveur uniquement) — b2bpro.store
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Endpoints consommés :
 *    • POST /v1/oauth2/token         — obtention du jeton d'accès (Basic auth)
 *    • POST /v2/checkout/orders      — création de commande (intent CAPTURE)
 *    • POST /v2/checkout/orders/{id}/capture — capture des fonds
 *
 *  Sécurité :
 *    - PAYPAL_CLIENT_SECRET ne quitte JAMAIS ce module (aucune route ne le
 *      renvoie, aucun composant client ne le reçoit).
 *    - Les montants sont TOUJOURS recalculés côté serveur à partir de la base
 *      (routes /api/paypal/*), le client ne transmet que les identifiants.
 *
 *  Activation : PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET (+ PAYPAL_ENV).
 *  Absents → getPayPalConfig().enabled = false → les routes répondent 503
 *  explicite et le front bascule sur le mode démo existant.
 */

import { getPayPalConfig, PayPalRuntimeConfig } from "@/lib/env";

/** Erreur PayPal typée — message exploitables côté route (jamais la stack). */
export class PayPalError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: string
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

// ─── Jeton d'accès (mis en cache jusqu'à son expiration) ─────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

function basicAuthHeader(cfg: PayPalRuntimeConfig): string {
  return `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`;
}

async function getAccessToken(cfg: PayPalRuntimeConfig): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const res = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(cfg),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PayPalError(
      "Authentification PayPal refusée (vérifiez PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENV).",
      res.status,
      text.slice(0, 400)
    );
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Marge de sécurité de 60 s avant expiration réelle.
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

// ─── Création de commande ────────────────────────────────────────────────────

export interface CreatePayPalOrderInput {
  /** Montant total recalculé côté serveur (EUR). */
  total: number;
  currency: string;
  /** Référence interne « CMD-XXXXXXXX » (custom_id + reference_id). */
  reference: string;
  /** Description visible dans la fenêtre PayPal (≤ 127 caractères). */
  description: string;
}

export interface PayPalOrderResult {
  id: string;
  status: string;
}

export async function createPayPalOrder(input: CreatePayPalOrderInput): Promise<PayPalOrderResult> {
  const cfg = getPayPalConfig();
  if (!cfg.enabled) {
    throw new PayPalError("Paiement PayPal non configuré sur cet environnement.", 503);
  }
  const token = await getAccessToken(cfg);

  const res = await fetch(`${cfg.apiBase}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.reference,
          custom_id: input.reference,
          description: input.description.slice(0, 127),
          amount: {
            currency_code: input.currency,
            value: input.total.toFixed(2), // PayPal exige strictement 2 décimales
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PayPalError("Création de la commande PayPal refusée.", res.status, text.slice(0, 400));
  }

  const data = (await res.json()) as { id: string; status: string };
  return { id: data.id, status: data.status };
}

// ─── Capture des fonds ───────────────────────────────────────────────────────

export interface CapturePayPalOrderResult {
  status: string;
  captureId: string | null;
  payerEmail: string | null;
  payerName: string | null;
}

interface CaptureResponse {
  status?: string;
  payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id?: string; status?: string }>;
    };
  }>;
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<CapturePayPalOrderResult> {
  const cfg = getPayPalConfig();
  if (!cfg.enabled) {
    throw new PayPalError("Paiement PayPal non configuré sur cet environnement.", 503);
  }
  const token = await getAccessToken(cfg);

  const res = await fetch(`${cfg.apiBase}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

  // 422 : capture impossible (commande déjà capturée, approuvée par un autre
  // acheteur, expirée…). Le détail remonte tel quel pour diagnostic.
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PayPalError("Capture du paiement PayPal refusée.", res.status, text.slice(0, 400));
  }

  const data = (await res.json()) as CaptureResponse;
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const payer = data.payer;
  const payerName =
    payer?.name && (payer.name.given_name || payer.name.surname)
      ? [payer.name.given_name, payer.name.surname].filter(Boolean).join(" ")
      : null;

  return {
    status: data.status ?? "UNKNOWN",
    captureId: capture?.id ?? null,
    payerEmail: payer?.email_address ?? null,
    payerName,
  };
}

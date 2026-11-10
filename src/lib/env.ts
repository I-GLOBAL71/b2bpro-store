/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Accès typé aux variables d'environnement — b2bpro.store
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  RÈGLES :
 *   - Ce module est réservé au code SERVEUR (pages serveur, routes API,
 *     scripts). Les composants client reçoivent la configuration via des
 *     props explicites — jamais `process.env` dans le bundle client.
 *   - Toute lecture d'environnement passe par ici (source unique), en
 *     cohérence avec src/lib/contracts.ts et .env.example.
 *   - Toutes les fonctions sont tolérantes : environnement absent = retour
 *     à la valeur par défaut (jamais d'exception au démarrage).
 *
 *  Références : docs/DEPLOIEMENT-VERCEL.md (runbook), .env.example (catalogue).
 */

/**
 * URL publique canonique du site (trailing slash retiré, préfixe www neutralisé).
 *
 * Le canonique de b2bpro.store est **l'apex** (`https://b2bpro.store`, sans www) :
 * c'est lui qui porte la propriété GSC, les canonicals, le sitemap, les JSON-LD et
 * llms.txt — les www redirigent en 308 vers l'apex. Une variable d'environnement
 * configurée avec `www.` (ex. `NEXT_PUBLIC_SITE_URL=https://www.b2bpro.store`)
 * produirait des URLs canoniques contraires au sens de la redirection : toute
 * valeur est donc ramenée à l'apex ici (source unique, `src/lib/site.ts` → SITE.url).
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "https://b2bpro.store";
  return raw
    .replace(/\/+$/, "")
    .replace(/^(https?:\/\/)www\./i, "$1");
}

/** Code de vérification Google Search Console (méthode balise META), si défini. */
export function getGoogleSiteVerification(): string | undefined {
  const code = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  return code ? code : undefined;
}

/** Devise de transaction de la place de marché (payroll PayPal inclus). */
export const MARKETPLACE_CURRENCY = "EUR" as const;

export type PayPalEnv = "sandbox" | "live";

export interface PayPalRuntimeConfig {
  /** true uniquement si client id + secret sont présents (paiement actif). */
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  env: PayPalEnv;
  currency: typeof MARKETPLACE_CURRENCY;
  /** Base de l'API REST PayPal (dépend de l'environnement). */
  apiBase: string;
}

/**
 * Configuration PayPal du runtime — PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET/
 * PAYPAL_ENV. Absents → enabled=false : le tunnel de commande bascule sur le
 * mode démo existant (POST /api/orders), aucun paiement réel n'est tenté.
 */
export function getPayPalConfig(): PayPalRuntimeConfig {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim() ?? "";
  const env: PayPalEnv = process.env.PAYPAL_ENV?.trim().toLowerCase() === "live" ? "live" : "sandbox";
  return {
    enabled: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    env,
    currency: MARKETPLACE_CURRENCY,
    apiBase: env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  };
}

/** true si le token Vercel Blob est présent (scripts d'upload d'assets). */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

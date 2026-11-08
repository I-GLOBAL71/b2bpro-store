/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CONTRATS b2bpro.store — Source unique de vérité typée (CONTRACT_VERSION 1.0.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  ⚠️  RÈGLE FONDAMENTALE (voir docs/REGRESSION-GUARD.md) :
 *  Ce fichier est une ZONE PROTÉGÉE. Toute évolution DOIT être ADDITIVE :
 *   ✅ Ajouter un champ optionnel (`champ?: type`) ou avec valeur par défaut
 *   ✅ Ajouter un nouveau type / schéma / constante
 *   ❌ Renommer, retirer ou changer le type d'un champ existant
 *   ❌ Modifier la sémantique d'un schéma existant
 *  En cas de force majeure : suivre le protocole documenté et tracer dans
 *  CHANGELOG.md avec le marqueur [FORCE MAJEURE].
 *
 *  Usage : toute nouvelle implémentation importe ses types/schémas/constantes
 *  depuis ici — jamais de redéclaration locale, jamais d'URL magique.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

// ─── Version du socle contractuel ───────────────────────────────────────────
export const CONTRACT_VERSION = "1.0.0";

// ─── Invariants métier (partagés avec src/lib/guard.ts) ─────────────────────
export const BUSINESS_RULES = {
  /** Note minimale affichée d'un service / vendeur (cahier des charges). */
  MIN_RATING: 4.2,
  /** Note maximale. */
  MAX_RATING: 5,
  /** Nombre exact de miniatures par service. */
  THUMBS_PER_SERVICE: 3,
  /** Bornes de notation d'un avis client. */
  REVIEW_RATING_MIN: 1,
  REVIEW_RATING_MAX: 5,
  /** Prix plancher d'un service ( EUR). */
  MIN_BASE_PRICE: 1,
  /** Délai minimal de livraison (jours ouvrés). */
  MIN_DELIVERY_DAYS: 1,
  /** Longueurs d'un commentaire d'avis. */
  REVIEW_COMMENT_MIN: 15,
  REVIEW_COMMENT_MAX: 1200,
  /** Longueur du nom d'auteur d'un avis. */
  REVIEW_AUTHOR_MIN: 2,
  REVIEW_AUTHOR_MAX: 60,
  /** Tolérance de réconciliation des totaux de commande (EUR). */
  ORDER_TOTAL_TOLERANCE: 0.01,
} as const;

// ─── Helpers sûrs (à utiliser par tout nouveau code lisant un champ JSON) ───
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse JSON défensif — ne lève JAMAIS. Retourne le fallback si le payload est
 * absent, malformé ou null. À préférer systématiquement à JSON.parse nu.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  try {
    const v: unknown = JSON.parse(raw ?? "");
    return (v === null || v === undefined ? fallback : (v as T));
  } catch {
    return fallback;
  }
}

// ─── Formes de données (champs JSON des modèles Prisma, PARSÉS) ─────────────
export interface ServiceKeywords {
  primary: string;
  secondary: string[];
  longTail: string[];
  /** Requêtes type IA (AIO) — optionnel pour compatibilité ascendante. */
  aiQueries?: string[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface ProcessStep {
  step: number;
  title: string;
  detail: string;
}

/** Option additionnelle (upsell à la ComeUp). */
export interface OptionDTO {
  id: string;
  name: string;
  description: string;
  priceExtra: number;
  daysExtra: number;
  monthly: boolean;
}

/** Résumé de vendeur, tel qu'inclus dans les listes de services. */
export interface SellerSummaryDTO {
  name: string;
  countryLabel: string;
}

/** Fiche vendeur complète (page /vendeurs/[slug]). */
export interface SellerDetailDTO {
  slug: string;
  name: string;
  country: string;
  countryLabel: string;
  city: string;
  title: string;
  bio: string;
  skills: string[];
  languages: string[];
  rating: number;
  reviewsCount: number;
  totalSales: number;
  responseTime: string;
  memberSince: string;
  level: string;
  avatarColors: [string, string];
  isTop: boolean;
}

/** Avis client (notation interne). */
export interface ReviewDTO {
  id: string;
  serviceId: string;
  authorName: string;
  country: string;
  rating: number;
  comment: string;
  orderLabel: string;
  createdAt: Date;
}

/** Article de blog. */
export interface BlogPostDTO {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  coverTheme: string;
  readMinutes: number;
  publishedAt: Date;
  author: string;
}

/** Entrée de la base de connaissances du support IA. */
export interface KnowledgeItemDTO {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string;
}

// ─── Contrats des ENDPOINTS API existants ────────────────────────────────────
// Ces schémas décrivent EXACTEMENT ce que les routes actuelles acceptent et
// retournent. Les futures implémentations doivent les importer pour valider
// leurs payloads — toute divergence est une régression de contrat.

/** POST /api/orders — corps de requête. */
export const orderRequestSchema = z.object({
  email: z.string().regex(EMAIL_RE, "Email invalide"),
  name: z.string().optional(),
  brief: z.string().optional(),
  serviceId: z.string().min(1),
  serviceSlug: z.string().min(1),
  serviceTitle: z.string().min(1),
  optionIds: z.array(z.string()).default([]),
  total: z.number().nonnegative(),
});

/** POST /api/orders — réponse de succès. */
export interface OrderSuccessResponse {
  ok: true;
  orderId: string;
  total: number;
}

/** POST /api/reviews — corps de requête. */
export const reviewRequestSchema = z.object({
  serviceId: z.string().min(1),
  authorName: z.string().trim().min(BUSINESS_RULES.REVIEW_AUTHOR_MIN).max(BUSINESS_RULES.REVIEW_AUTHOR_MAX),
  country: z.string().trim().max(60).optional(),
  rating: z.number().min(BUSINESS_RULES.REVIEW_RATING_MIN).max(BUSINESS_RULES.REVIEW_RATING_MAX),
  comment: z.string().trim().min(BUSINESS_RULES.REVIEW_COMMENT_MIN).max(BUSINESS_RULES.REVIEW_COMMENT_MAX),
});

/** POST /api/reviews — réponse de succès. */
export interface ReviewSuccessResponse {
  ok: true;
  reviewId: string;
}

/** POST /api/leads — corps de requête. */
export const leadRequestSchema = z.object({
  email: z.string().regex(EMAIL_RE, "Email invalide"),
  name: z.string().optional(),
  source: z.string().optional(),
});

/** POST /api/leads — réponse de succès. */
export interface LeadSuccessResponse {
  ok: true;
  leadId: string;
}

/** POST /api/support/chat — corps de requête. */
export const chatRequestSchema = z.object({
  email: z.string().regex(EMAIL_RE, "Email invalide"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .default([]),
});

/** POST /api/support/chat — réponse de succès. */
export interface ChatSuccessResponse {
  reply: string;
}

/** Réponse d'erreur uniforme de toutes les routes. */
export interface ApiErrorResponse {
  error: string;
}

/** GET /api/services — paramètres de requête acceptés. */
export const servicesQuerySchema = z.object({
  q: z.string().optional(),
  pole: z.string().optional(),
  sort: z.enum(["price-asc", "price-desc", "rating", "reviews", "popular"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(48).default(24),
});

/** GET /api/services — élément de service renvoyé. */
export interface ServiceApiItem {
  slug: string;
  title: string;
  category: string;
  pole: string;
  basePrice: number;
  deliveryDays: number;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  seller: string;
  url: string;
}

/** GET /api/services — réponse paginée. */
export interface ServicesApiResponse {
  total: number;
  page: number;
  pages: number;
  services: ServiceApiItem[];
}

// ─── URLs d'API (source unique — à importer, jamais réécrire en dur) ─────────
export const API_ROUTES = {
  orders: "/api/orders",
  reviews: "/api/reviews",
  leads: "/api/leads",
  services: "/api/services",
  chat: "/api/support/chat",
  integrity: "/api/integrity",
} as const;

// ─── Rapport d'intégrité (contrat de /api/integrity et du script guard) ──────
export type CheckStatus = "pass" | "warn" | "fail";

export interface IntegrityIssue {
  /** Identifiant de la ressource concernée (slug, id, chemin…). */
  ref: string;
  /** Description précise du problème. */
  problem: string;
}

export interface CheckResult {
  /** Identifiant stable du contrôle (ne jamais le renommer). */
  id: string;
  label: string;
  status: CheckStatus;
  details?: string;
  issues?: IntegrityIssue[];
}

export interface IntegrityReport {
  ok: boolean;
  contractVersion: string;
  generatedAt: string;
  counts: {
    services: number;
    sellers: number;
    options: number;
    reviews: number;
    blogPosts: number;
    knowledgeItems: number;
    leads: number;
    chatMessages: number;
    thumbs: number;
    avatars: number;
  };
  checks: CheckResult[];
}

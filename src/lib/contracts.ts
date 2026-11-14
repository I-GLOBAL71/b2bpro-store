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
  paypalCreateOrder: "/api/paypal/create-order",
  paypalCaptureOrder: "/api/paypal/capture-order",
  // ── v1.5.0 : panneau d'administration ──
  adminLogin: "/api/admin/login",
  adminLogout: "/api/admin/logout",
  adminSession: "/api/admin/session",
  adminConfig: "/api/admin/config",
  adminStats: "/api/admin/stats",
  adminVitrine: "/api/admin/vitrine",
  adminServices: "/api/admin/services",
  adminLogs: "/api/admin/logs",
  // ── v2.2.0 : conversation humaine client ↔ propriétaire-prestataire ──
  supportThread: "/api/support/thread",
  adminSupport: "/api/admin/support",
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

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION ADDITIVE v1.3.0 — Paiement PayPal + miniatures Vercel Blob
//  (stack de production : Vercel · Neon Postgres · Vercel Blob · PayPal)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Miniatures : lecture défensive du champ Service.thumbUrls ────────────────

/**
 * Parse `Service.thumbUrls` (JSON [url×3], miniatures WebP Vercel Blob).
 * Retourne `undefined` si absent/invalide/incomplet → l'appelant retombe sur
 * les SVG locaux `/thumbs/<slug>-{1,2,3}.svg` (jamais d'image cassée).
 */
export function parseThumbUrls(raw: string | null | undefined): string[] | undefined {
  const urls = safeJsonParse<string[]>(raw, [] as string[]);
  return Array.isArray(urls) && urls.length === BUSINESS_RULES.THUMBS_PER_SERVICE &&
    urls.every((u) => typeof u === "string" && /^https?:\/\//.test(u))
    ? urls
    : undefined;
}

// ─── Commandes PayPal (modèle Order) ──────────────────────────────────────────

/** Statuts de paiement d'une commande (modèle Order.paymentStatus). */
export const ORDER_PAYMENT_STATUS = {
  CREATED: "CREATED",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUS)[keyof typeof ORDER_PAYMENT_STATUS];

/** POST /api/paypal/create-order — corps de requête (le total est TOUJOURS recalculé serveur). */
export const paypalCreateOrderRequestSchema = z.object({
  email: z.string().regex(EMAIL_RE, "Email invalide"),
  name: z.string().optional(),
  brief: z.string().optional(),
  serviceId: z.string().min(1),
  optionIds: z.array(z.string()).default([]),
});

/** POST /api/paypal/create-order — réponse de succès. */
export interface PayPalCreateOrderResponse {
  paypalOrderId: string;
  reference: string;
  total: number;
  currency: "EUR";
}

/** POST /api/paypal/capture-order — corps de requête. */
export const paypalCaptureOrderRequestSchema = z.object({
  paypalOrderId: z.string().min(1),
});

/** POST /api/paypal/capture-order — réponse de succès. */
export interface PayPalCaptureOrderResponse {
  ok: true;
  reference: string;
  total: number;
  currency: "EUR";
  payerEmail: string | null;
}

/** Configuration PayPal passée par une page serveur à un composant client (jamais le secret). */
export interface PayPalClientConfig {
  clientId: string;
  currency: "EUR";
}

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION ADDITIVE v1.5.0 — Panneau d'administration & rotation équitable
//  (vitrine d'accueil rotative, réglages pilotables, journal d'audit)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Bornes métier de la rotation (additif à BUSINESS_RULES) ─────────────────

/** Bornes de la fenêtre de rotation (minutes) — ex. 10 min = exigence produit. */
export const ROTATION_RULES = {
  WINDOW_MIN_MINUTES: 1,
  WINDOW_MAX_MINUTES: 120,
  SLOTS_MIN: 1,
  SLOTS_MAX: 12,
  /** Le filtre de note ne peut descendre sous la note plancher du catalogue. */
  MIN_RATING_FLOOR: 4,
} as const;

/** Durée de vie d'une session administrateur (cookie signé). */
export const ADMIN_SESSION_TTL_HOURS = 8;

/** Nom du cookie de session admin (HttpOnly, signé HMAC-SHA256). */
export const ADMIN_SESSION_COOKIE = "b2bpro_admin_session";

/** Actions tracées dans le journal d'audit (model AdminLog). */
export const ADMIN_LOG_ACTIONS = {
  LOGIN: "login",
  LOGIN_FAILED: "login.failed",
  LOGOUT: "logout",
  CONFIG_UPDATE: "config.update",
  SERVICE_UPDATE: "service.update",
  // ── v2.6.0 : création d'un service depuis le panneau admin ──
  SERVICE_CREATE: "service.create",
  // ── v2.2.0 : conversation humaine client ↔ propriétaire ──
  SUPPORT_MESSAGE: "support.message",
  SUPPORT_REPLY: "support.reply",
  // ── v2.5.0 : cycle de vie des commandes ──
  ORDER_REVISION: "order.revision",
  ORDER_DELIVERED: "order.delivered",
  ORDER_VALIDATED: "order.validated",
} as const;

// ─── Groupes de réglages du site (SiteConfig.key) ────────────────────────────

export const SETTINGS_GROUPS = [
  "announcement",
  "vitrine",
  "hero",
  "sections",
  "support",
  "maintenance",
  "seo",
] as const;

export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

// ─── Formes typées (champs JSON des modèles Prisma, PARSÉS) ──────────────────

/** Bandeau d'annonce affiché en haut de toutes les pages publiques. */
export interface AnnouncementSettings {
  enabled: boolean;
  message: string;
  linkUrl: string;
  linkLabel: string;
}

/** Vitrine rotative de la page d'accueil (équité stricte entre services). */
export interface VitrineSettings {
  enabled: boolean;
  /** Fenêtre de rotation en minutes : aucune fiche ne garde la 1ère place plus longtemps. */
  windowMinutes: number;
  /** Nombre de cartes affichées dans la vitrine. */
  slotCount: number;
  /** Note minimale pour être éligible (4 = tout le catalogue). */
  minRating: number;
  title: string;
  subtitle: string;
  badge: string;
  /** Affiche le compte à rebours avant la prochaine rotation. */
  showCountdown: boolean;
  /** Rafraîchit automatiquement la page d'accueil au changement de fenêtre. */
  autoRefresh: boolean;
}

/** Textes du héros de la page d'accueil. `{services}` est remplacé par le décompte réel. */
export interface HeroSettings {
  badge: string;
  titleStart: string;
  titleHighlight: string;
  subtitle: string;
  searchPlaceholder: string;
  popularKeywords: string[];
  /** Statistique « livrés à l'heure » affichée sous le héros. */
  onTimeRate: string;
}

/** Visibilité et volumétrie des sections de la page d'accueil. */
export interface SectionsSettings {
  categories: boolean;
  howItWorks: boolean;
  testimonials: boolean;
  testimonialsCount: number;
  testimonialsMinRating: number;
  francophonie: boolean;
  blogTeaser: boolean;
  blogTeaserCount: number;
  supportCta: boolean;
}

/** Support IA conversationnel. */
export interface SupportSettings {
  enabled: boolean;
  welcome: string;
}

/** Mode maintenance (les administrateurs connectés passent toujours au travers). */
export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
}

/** Surcharges SEO de la page d'accueil (chaîne vide = comportement par défaut). */
export interface SeoSettings {
  homeTitle: string;
  homeDescription: string;
}

/** Réglages complets du site — fusion des défauts et des surcharges base. */
export interface SiteSettingsDTO {
  announcement: AnnouncementSettings;
  vitrine: VitrineSettings;
  hero: HeroSettings;
  sections: SectionsSettings;
  support: SupportSettings;
  maintenance: MaintenanceSettings;
  seo: SeoSettings;
}

// ─── Défauts (comportement v1.5.0 : rotation ACTIVE, 10 min, 8 cartes) ───────

export const DEFAULT_SITE_SETTINGS: SiteSettingsDTO = {
  announcement: {
    enabled: false,
    message: "Bienvenue sur b2bpro.store — la vitrine rotative est arrivée !",
    linkUrl: "/services",
    linkLabel: "Découvrir les services",
  },
  vitrine: {
    enabled: true,
    windowMinutes: 10,
    slotCount: 8,
    minRating: 4,
    title: "La vitrine qui tourne pour tous les talents",
    subtitle:
      "Rotation automatique et équitable : chaque service s'affiche ici à tour de rôle : aucune fiche ne monopolise la première place plus de 10 minutes.",
    badge: "Rotation équitable",
    showCountdown: true,
    autoRefresh: true,
  },
  hero: {
    badge: "{services} services experts · 14 pôles · 100 % francophone",
    titleStart: "Les services digitaux B2B qui font",
    titleHighlight: "croître votre business",
    subtitle:
      "Veille concurrentielle, génération de leads, bases de connaissances IA, SEO local… Des experts vérifiés livrent vos données prêtes à l'emploi en 2 à 3 jours, dès 20 €. Paiement à la commande puis séquestré : le vendeur n'est payé qu'après votre validation du livrable.",
    searchPlaceholder: "Ex : surveiller les prix de mes concurrents…",
    popularKeywords: [
      "veille concurrentielle",
      "fichier de prospection B2B",
      "base de connaissances IA",
      "SEO local",
    ],
    onTimeRate: "98,6 %",
  },
  sections: {
    categories: true,
    howItWorks: true,
    testimonials: true,
    testimonialsCount: 6,
    testimonialsMinRating: 4.8,
    francophonie: true,
    blogTeaser: true,
    blogTeaserCount: 3,
    supportCta: true,
  },
  support: {
    enabled: true,
    welcome:
      "Bonjour et bienvenue sur b2bpro.store.\n\nJe suis votre conseiller IA : je connais tous nos services par cœur, leurs options, leurs tarifs et leurs livrables. Posez-moi toutes vos questions — choisir le bon service, comprendre un livrable, vérifier un délai…\n\nQuel besoin business puis-je vous aider à résoudre aujourd'hui ?",
  },
  maintenance: {
    enabled: false,
    message:
      "b2bpro.store est en maintenance programmée. Nous revenons très vite — merci de votre patience.",
  },
  seo: {
    homeTitle: "",
    homeDescription: "",
  },
};

// ─── Schémas zod par groupe (validation des PATCH admin et des lignes base) ──

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const announcementSettingsSchema = z.object({
  enabled: z.boolean(),
  message: text(3, 220),
  linkUrl: text(0, 300),
  linkLabel: text(0, 60),
});

export const vitrineSettingsSchema = z.object({
  enabled: z.boolean(),
  windowMinutes: z.coerce
    .number()
    .int()
    .min(ROTATION_RULES.WINDOW_MIN_MINUTES)
    .max(ROTATION_RULES.WINDOW_MAX_MINUTES),
  slotCount: z.coerce.number().int().min(ROTATION_RULES.SLOTS_MIN).max(ROTATION_RULES.SLOTS_MAX),
  minRating: z.coerce
    .number()
    .min(ROTATION_RULES.MIN_RATING_FLOOR)
    .max(BUSINESS_RULES.MAX_RATING),
  title: text(3, 90),
  subtitle: text(0, 220),
  badge: text(2, 40),
  showCountdown: z.boolean(),
  autoRefresh: z.boolean(),
});

export const heroSettingsSchema = z.object({
  badge: text(3, 120),
  titleStart: text(3, 90),
  titleHighlight: text(2, 60),
  subtitle: text(20, 400),
  searchPlaceholder: text(4, 90),
  popularKeywords: z.array(text(2, 50)).max(8),
  onTimeRate: text(1, 12),
});

export const sectionsSettingsSchema = z.object({
  categories: z.boolean(),
  howItWorks: z.boolean(),
  testimonials: z.boolean(),
  testimonialsCount: z.coerce.number().int().min(1).max(12),
  testimonialsMinRating: z.coerce.number().min(BUSINESS_RULES.MIN_RATING).max(BUSINESS_RULES.MAX_RATING),
  francophonie: z.boolean(),
  blogTeaser: z.boolean(),
  blogTeaserCount: z.coerce.number().int().min(1).max(6),
  supportCta: z.boolean(),
});

export const supportSettingsSchema = z.object({
  enabled: z.boolean(),
  welcome: text(20, 1200),
});

export const maintenanceSettingsSchema = z.object({
  enabled: z.boolean(),
  message: text(10, 500),
});

export const seoSettingsSchema = z.object({
  homeTitle: text(0, 120),
  homeDescription: text(0, 320),
});

/** Schéma complet (tous les groupes). */
export const siteSettingsSchema = z.object({
  announcement: announcementSettingsSchema,
  vitrine: vitrineSettingsSchema,
  hero: heroSettingsSchema,
  sections: sectionsSettingsSchema,
  support: supportSettingsSchema,
  maintenance: maintenanceSettingsSchema,
  seo: seoSettingsSchema,
});

/** Schémas par groupe — clé = SiteConfig.key. */
export const siteSettingsGroupSchemas = {
  announcement: announcementSettingsSchema,
  vitrine: vitrineSettingsSchema,
  hero: heroSettingsSchema,
  sections: sectionsSettingsSchema,
  support: supportSettingsSchema,
  maintenance: maintenanceSettingsSchema,
  seo: seoSettingsSchema,
} as const satisfies Record<SettingsGroup, z.ZodTypeAny>;

/** État de la rotation calculé côté serveur (transmis à la vitrine et à l'admin). */
export interface RotationInfoDTO {
  enabled: true;
  /** Fenêtre courante (index entier depuis l'epoch — déterministe). */
  windowIndex: number;
  windowMinutes: number;
  slotCount: number;
  /** Date (epoch ms) de la prochaine rotation. */
  rotatesAt: number;
  /** Nombre de services éligibles participant à la rotation. */
  totalEligible: number;
  /** Durée (minutes) pour que chaque service repasse en 1ère position. */
  fullCycleMinutes: number;
}

/** Vitrine d'accueil : services + état de rotation (rotation null = mode best-sellers figé). */
export interface VitrineResultDTO {
  services: VitrineServiceDTO[];
  rotation: RotationInfoDTO | null;
}

/** Champs d'un service de vitrine (sélection minimale pour les cartes). */
export interface VitrineServiceDTO {
  slug: string;
  title: string;
  shortDesc: string;
  poleSlug: string;
  category: string;
  basePrice: number;
  deliveryDays: number;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  thumbUrls: string | null;
  seller: SellerSummaryDTO;
}

// ─── Contrats des ENDPOINTS admin ─────────────────────────────────────────────

/** POST /api/admin/login — corps de requête. */
export const adminLoginRequestSchema = z.object({
  password: z.string().min(1, "Mot de passe requis"),
});

/** POST /api/admin/login — réponse (jamais le mot de passe ni le token). */
export interface AdminLoginResponse {
  ok: true;
  expiresInMinutes: number;
}

/** PATCH /api/admin/config — corps de requête (patch partiel d'un groupe). */
export const adminConfigPatchSchema = z.object({
  group: z.enum(SETTINGS_GROUPS),
  patch: z.record(z.string(), z.unknown()),
});

/** PATCH /api/admin/services/[id] — corps de requête.
 * v2.2.0 : le tarif de base devient pilotable depuis le panneau (le reste du
 * contenu reste géré par le pipeline éditorial). */
export const adminServicePatchSchema = z.object({
  featured: z.boolean().optional(),
  basePrice: z
    .number({ message: "Tarif invalide" })
    .min(1, "Le tarif doit être au moins de 1 €")
    .max(100000, "Le tarif ne peut pas excéder 100 000 €")
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Deux décimales maximum")
    .optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION ADDITIVE v2.2.0 — Conversation humaine client ↔ support
//  (notifications email + admin ; requalifiée « support humain » en v2.5.0)
// ═══════════════════════════════════════════════════════════════════════════

/** Statuts d'un fil de conversation (model SupportThread.status). */
export const SUPPORT_THREAD_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
} as const;

export type SupportThreadStatus = (typeof SUPPORT_THREAD_STATUS)[keyof typeof SUPPORT_THREAD_STATUS];

/** POST /api/support/thread — question du client au prestataire humain. */
export const supportThreadPostSchema = z.object({
  message: z
    .string()
    .trim()
    .min(5, "Votre message est trop court (5 caractères minimum)")
    .max(4000, "Votre message est trop long (4 000 caractères maximum)"),
});

/** POST /api/admin/support/[id] — réponse du support au client.
 * v2.5.0 : `replyTo` (optionnel) = id de la question ciblée — validé serveur
 * (doit appartenir au MÊME fil), la réponse email référence son code Q-XXXXXX. */
export const adminSupportReplySchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, "La réponse est trop courte")
    .max(4000, "La réponse est trop longue (4 000 caractères maximum)"),
  replyTo: z.string().min(1).optional(),
});

/** PATCH /api/admin/support/[id] — ouverture/fermeture d'un fil. */
export const adminSupportStatusSchema = z.object({
  status: z.enum(["open", "closed"] as const),
});

/** GET /api/support/thread — réponse (fil du client connecté). */
export interface SupportThreadMessageDTO {
  id: string;
  role: "client" | "owner";
  content: string;
  createdAt: string;
  /** v2.5.0 — code de route de la question (Q-XXXXXX), côté client uniquement. */
  reference?: string | null;
}

export interface SupportThreadResponse {
  thread: { email: string; name: string | null; status: SupportThreadStatus } | null;
  messages: SupportThreadMessageDTO[];
}

/** GET /api/admin/stats — réponse du tableau de bord. */
/** Santé d'une table d'authentification (sonde /api/admin/stats — v2.1.3). */
export interface AuthTableHealth {
  /** false = table absente/inaccessible (la connexion Google échouera en ?error=Callback). */
  ok: boolean;
  count: number;
}

export interface AdminStatsResponse {
  counts: {
    services: number;
    sellers: number;
    reviews: number;
    orders: number;
    leads: number;
    blogPosts: number;
    knowledgeItems: number;
  };
  revenuePaid: number;
  avgRating: number;
  rotation: RotationInfoDTO | null;
  topService: { slug: string; title: string; salesCount: number } | null;
  /** Sonde des 4 tables NextAuth — false = Redeploy requis (garant de schéma). */
  authTables: {
    users: AuthTableHealth;
    accounts: AuthTableHealth;
    sessions: AuthTableHealth;
    verificationTokens: AuthTableHealth;
  };
}

/** GET /api/admin/logs — entrée du journal d'audit. */
export interface AdminLogDTO {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION ADDITIVE v2.5.0 — Cycle de vie des commandes + support routé
//  (révision, livraison, validation/libération des fonds, avis lié ;
//   route unique par question support)
// ═══════════════════════════════════════════════════════════════════════════

/** Étapes du cycle de vie d'une prestation (model Order.stage). */
export const ORDER_STAGES = {
  /** Délai de production en cours (défaut, rétrocompatible). */
  PRODUCTION: "production",
  /** Le client a demandé une modification (OrderRevision en attente). */
  REVISION: "revision",
  /** Livrable déclaré prêt par le support — validation client attendue. */
  DELIVERED: "delivered",
  /** Validé par le client : fonds libérés au prestataire (releasedAt posé). */
  COMPLETED: "completed",
} as const;

export type OrderStage = (typeof ORDER_STAGES)[keyof typeof ORDER_STAGES];

/** POST /api/orders/[reference]/revision — demande de modification client. */
export const orderRevisionRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(15, "Décrivez la modification souhaitée (15 caractères minimum)")
    .max(2000, "2 000 caractères maximum"),
});

/** POST /api/orders/[reference]/validate — validation de la livraison client. */
export const orderValidateResponseSchema = z.object({
  ok: z.literal(true),
  reference: z.string(),
});

/** POST /api/reviews — extension v2.5.0 : avis LIÉ à une commande validée. */
export const orderReviewRequestSchema = reviewRequestSchema.extend({
  /** Référence de la commande validée (CMD-XXXX) — session requise alors. */
  orderReference: z.string().trim().min(3).optional(),
});

/** URL d'action client sur une commande (route dynamique par référence). */
export function orderActionUrl(reference: string, action: "revision" | "validate"): string {
  return `/api/orders/${encodeURIComponent(reference)}/${action}`;
}

/** URL d'action admin sur une commande (route dynamique par référence). */
export function adminOrderActionUrl(reference: string, action: "deliver"): string {
  return `/api/admin/orders/${encodeURIComponent(reference)}/${action}`;
}

// ═══ v2.6.0 — CRÉATION DE SERVICE DEPUIS LE PANNEAU ADMIN ═════════════════

/**
 * Bornes éditoriales d'une fiche SGA™ — miroir EXACT des contrôles du garde-fou
 * (src/lib/guard.ts, checks services-content-standards / services-primary-* /
 * services-faq-first-comment / services-invariants) : une fiche créée via le
 * panneau est REFUSÉE si elle ne passerait pas la garde — jamais d'insertion
 * qui transformerait le check intégrité en 503.
 */
export const SERVICE_EDITORIAL_RULES = {
  /** Longueur du titre commercial (H1/title). */
  TITLE_MIN: 40,
  TITLE_MAX: 75,
  /** Longueur du résumé carte (shortDesc). */
  SHORTDESC_MIN: 100,
  SHORTDESC_MAX: 230,
  /** Description complète : caractères minimum. */
  DESC_MIN: 1000,
  /** Description complète : sections H2 minimum (^##). */
  H2_MIN: 3,
  /** Mots-clés secondaires / longue traîne minimum. */
  KEYWORDS_ARRAY_MIN: 3,
  /** Requêtes IA (aiQueries) minimum. */
  AI_QUERIES_MIN: 3,
  /** FAQ : entrées minimum, dont citables (réponse ≥ 80 car., question en « ? »). */
  FAQ_MIN: 4,
  FAQ_ANSWER_MIN: 80,
  /** Points forts minimum. */
  FEATURES_MIN: 4,
  /** Livrables minimum. */
  DELIVERABLES_MIN: 3,
  /** Étapes de méthode minimum. */
  PROCESS_MIN: 3,
  /** Primaire : mots significatifs (> 2 lettres) — garde anti-cannibalisation. */
  PRIMARY_WORDS_MIN: 3,
  PRIMARY_WORDS_MAX: 5,
  /** Prix plancher d'un NOUVEAU service : protège la promesse « dès 20 € » du catalogue. */
  CREATE_PRICE_MIN: 20,
  /** Délai de livraison borné (jours ouvrés). */
  DELIVERY_MAX: 30,
  /** Options additionnelles maximum à la création. */
  OPTIONS_MAX: 8,
} as const;

/** Corps de POST /api/admin/services — création d'un service complet. */
export const adminServiceCreateSchema = z.object({
  /** Titre commercial (pattern du catalogue : « Je vais … », 40-75 car.). */
  title: z
    .string()
    .trim()
    .min(SERVICE_EDITORIAL_RULES.TITLE_MIN, `Titre : ${SERVICE_EDITORIAL_RULES.TITLE_MIN} caractères minimum`)
    .max(SERVICE_EDITORIAL_RULES.TITLE_MAX, `Titre : ${SERVICE_EDITORIAL_RULES.TITLE_MAX} caractères maximum`),
  /** Nom long métier (affiché dans les métadonnées de la fiche). */
  name: z.string().trim().min(10, "Nom long : 10 caractères minimum").max(120, "Nom long : 120 caractères maximum"),
  /** Catégorie fine (ex. « Prospection > Fichier entreprises »). */
  category: z.string().trim().min(3, "Catégorie : 3 caractères minimum").max(80, "Catégorie : 80 caractères maximum"),
  /** Slug du pôle canonique (validé serveur via data/gen/poles.ts). */
  poleSlug: z.string().trim().min(2).max(60),
  /** Slug du vendeur porteur (résolu serveur — 404 si inconnu). */
  sellerSlug: z.string().trim().min(2).max(80),
  /** Tarif de l'offre de base (EUR) — plancher 20 € (promesse du catalogue). */
  basePrice: z
    .number()
    .min(SERVICE_EDITORIAL_RULES.CREATE_PRICE_MIN, "Prix plancher d'un nouveau service : 20 €")
    .max(100000, "Prix plafond : 100 000 €"),
  /** Délai de livraison en jours ouvrés. */
  deliveryDays: z
    .number()
    .int()
    .min(BUSINESS_RULES.MIN_DELIVERY_DAYS)
    .max(SERVICE_EDITORIAL_RULES.DELIVERY_MAX, "Délai plafond : 30 jours"),
  /** Résumé carte (100-230 car., prix + délai + note). */
  shortDesc: z
    .string()
    .trim()
    .min(SERVICE_EDITORIAL_RULES.SHORTDESC_MIN, `Résumé : ${SERVICE_EDITORIAL_RULES.SHORTDESC_MIN} caractères minimum`)
    .max(SERVICE_EDITORIAL_RULES.SHORTDESC_MAX, `Résumé : ${SERVICE_EDITORIAL_RULES.SHORTDESC_MAX} caractères maximum`),
  /** Description complète markdown SGA™ (validée serveur : ≥ 1000 car., ≥ 3 H2,
   *  listes à puces, primaire en tête answer-first). */
  description: z.string().min(SERVICE_EDITORIAL_RULES.DESC_MIN, `Description : ${SERVICE_EDITORIAL_RULES.DESC_MIN} caractères minimum`),
  /** Mots-clés sourcés (primaire 3-5 mots ancré dans le titre, unique en base). */
  keywords: z.object({
    primary: z.string().trim().min(8, "Primaire : 8 caractères minimum").max(80, "Primaire : 80 caractères maximum"),
    secondary: z.array(z.string().trim().min(3).max(120)).min(SERVICE_EDITORIAL_RULES.KEYWORDS_ARRAY_MIN, `Secondaires : ${SERVICE_EDITORIAL_RULES.KEYWORDS_ARRAY_MIN} minimum`),
    longTail: z.array(z.string().trim().min(3).max(120)).min(SERVICE_EDITORIAL_RULES.KEYWORDS_ARRAY_MIN, `Longue traîne : ${SERVICE_EDITORIAL_RULES.KEYWORDS_ARRAY_MIN} minimum`),
    aiQueries: z.array(z.string().trim().min(5).max(160)).min(SERVICE_EDITORIAL_RULES.AI_QUERIES_MIN, `Requêtes IA : ${SERVICE_EDITORIAL_RULES.AI_QUERIES_MIN} minimum`),
  }),
  /** FAQ (≥ 4, 1re question « comment… », réponses ≥ 80 car.). */
  faq: z
    .array(
      z.object({
        q: z.string().trim().min(10, "Question trop courte").max(200, "Question : 200 caractères maximum").refine((q) => q.endsWith("?"), "La question doit finir par « ? »"),
        a: z.string().trim().min(SERVICE_EDITORIAL_RULES.FAQ_ANSWER_MIN, `Réponse : ${SERVICE_EDITORIAL_RULES.FAQ_ANSWER_MIN} caractères minimum`).max(1500, "Réponse : 1500 caractères maximum"),
      })
    )
    .min(SERVICE_EDITORIAL_RULES.FAQ_MIN, `FAQ : ${SERVICE_EDITORIAL_RULES.FAQ_MIN} questions minimum`),
  /** Points forts (≥ 4). */
  features: z.array(z.string().trim().min(10).max(200)).min(SERVICE_EDITORIAL_RULES.FEATURES_MIN, `Points forts : ${SERVICE_EDITORIAL_RULES.FEATURES_MIN} minimum`),
  /** Livrables (≥ 3). */
  deliverables: z.array(z.string().trim().min(15).max(400)).min(SERVICE_EDITORIAL_RULES.DELIVERABLES_MIN, `Livrables : ${SERVICE_EDITORIAL_RULES.DELIVERABLES_MIN} minimum`),
  /** Méthode (≥ 3 étapes — le rang est posé serveur). */
  process: z
    .array(
      z.object({
        title: z.string().trim().min(3, "Titre d'étape trop court").max(120, "Titre d'étape : 120 caractères maximum"),
        detail: z.string().trim().min(30, "Détail d'étape : 30 caractères minimum").max(600, "Détail d'étape : 600 caractères maximum"),
      })
    )
    .min(SERVICE_EDITORIAL_RULES.PROCESS_MIN, `Étapes : ${SERVICE_EDITORIAL_RULES.PROCESS_MIN} minimum`),
  /** Options additionnelles de lancement (0-8, upsell ComeUp). */
  options: z
    .array(
      z.object({
        name: z.string().trim().min(3, "Nom d'option trop court").max(80),
        description: z.string().trim().min(20, "Description d'option : 20 caractères minimum").max(600),
        priceExtra: z.number().min(0).max(100000),
        daysExtra: z.number().int().min(0).max(30),
        monthly: z.boolean().default(false),
      })
    )
    .max(SERVICE_EDITORIAL_RULES.OPTIONS_MAX, `Options : ${SERVICE_EDITORIAL_RULES.OPTIONS_MAX} maximum`)
    .default([]),
  /** Note initiale affichée — bornes garde-fou 4,2-5,0. */
  rating: z
    .number()
    .min(BUSINESS_RULES.MIN_RATING, `Note minimum : ${BUSINESS_RULES.MIN_RATING}`)
    .max(BUSINESS_RULES.MAX_RATING, `Note maximum : ${BUSINESS_RULES.MAX_RATING}`),
  /** Preuve sociale initiale (honnête par défaut : aucun avis, aucune vente). */
  reviewsCount: z.number().int().min(0).max(100000).default(0),
  salesCount: z.number().int().min(0).max(1000000).default(0),
  views: z.number().int().min(0).max(10000000).default(0),
});

export type AdminServiceCreateInput = z.infer<typeof adminServiceCreateSchema>;

/** Réponse de succès de POST /api/admin/services. */
export interface AdminServiceCreateResponse {
  ok: true;
  service: {
    id: string;
    slug: string;
    code: string;
    title: string;
    url: string;
    poleSlug: string;
    optionsCount: number;
  };
  /** Miniatures : écrites sur disque (dev/self-hosted) ou encodées (prod
   *  read-only : à committer dans public/thumbs/ puis re-déployer). */
  thumbs: {
    written: boolean;
    files: string[];
    dataUrls?: string[];
  };
}

/** Ligne vendeur du sélecteur de création (GET /api/admin/sellers). */
export interface AdminSellerOption {
  slug: string;
  name: string;
  countryLabel: string;
  level: string;
  rating: number;
  specialtyPoles: string[];
}

/** Ligne « Commandes » de /api/admin/orders (page /admin/commandes). */
export interface AdminOrderRow {
  id: string;
  reference: string;
  serviceTitle: string;
  serviceSlug: string;
  total: number;
  currency: string;
  paymentStatus: string;
  paymentProvider: string;
  stage: string;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  releasedAt: string | null;
  deliveryDays: number;
  clientEmail: string;
  clientName: string | null;
  revisionCount: number;
  lastRevision: { reason: string; status: string; createdAt: string } | null;
  hasReview: boolean;
}

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

/** PATCH /api/admin/services/[id] — corps de requête. */
export const adminServicePatchSchema = z.object({
  featured: z.boolean().optional(),
});

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

/**
 * data/gen/humanize.ts — Couche d'humanisation rédactionnelle des fiches service.
 *
 * v2 (tour d'experts anti-traces d'IA) : chaque bloc partagé par plusieurs fiches
 * porte désormais au moins un paramètre propre au service (mot-clé primaire,
 * catégorie, prix, délai, note, avis, ventes, temps de réponse du vendeur,
 * compétences réelles du vendeur) — une phrase mot pour mot répétée sur 4 fiches
 * ou plus est réputée impossible. L'expertise affichée provient des skills
 * réels du vendeur (jamais des mots-clés d'autres fiches du pôle), les livrables
 * génériques sont reformulés en cohérence avec le métier du pôle, et le temps de
 * réponse du process vient du vendeur en base (badge exact).
 *
 * Principes inchangés :
 *  - DÉTERMINISTE et IDEMPOTENT : toutes les rotations proviennent d'un hash du slug ;
 *  - chiffres réels uniquement (prix, délai, note, avis, ventes, réponse vendeur) ;
 *  - français impeccable : élisions, guillemets « », zéro em-dash, zéro puce « ✓ » ;
 *  - mots-clés V2 (primary grammatical + requêtes réelles + aiQueries correctes).
 *
 * Utilisé par scripts/humanize-content.ts (migration de la base) et data/seed.ts.
 */

/* ═══════════════════════════════════════════════════════════════════════════
 *  1. Types
 * ═══════════════════════════════════════════════════════════════════════════ */

import { ELITE_PRIMARIES } from "./elite-keywords";

export interface ServiceKeywords {
  primary: string;
  secondary: string[];
  longTail: string[];
  aiQueries: string[];
}

/** Marqueur de version posé dans le JSON keywords (idempotence de la migration). */
export const HUMANIZED_KW_VERSION = 2;

export interface HumanizeInput {
  slug: string;
  /** Titre complet « Je vais … » */
  title: string;
  /** Catégorie brute de la fiche (ex. « Immobilier > Conseil & Investissement locatif ») */
  category: string;
  /** Libellé court du pôle (ex. « Immobilier & Local ») */
  poleLabel: string;
  poleSlug: string;
  /** Index de la fiche dans son pôle (rotation des requêtes réelles) */
  poleIndex: number;
  /** Nombre de services du pôle (contexte FAQ) */
  poleCount: number;
  /** Titres (sans « Je vais ») d'autres services du même pôle — 2 à 6 entrées */
  siblingTitles: string[];
  basePrice: number;
  deliveryDays: number;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  options: { name: string; priceExtra: number }[];
  /** Description actuelle : format humanisé v1/v2 ou brute du catalogue */
  currentDescription: string;
  currentFeatures: string[];
  currentDeliverables: string[];
  currentProcess: { step: number; title: string; detail: string }[];
  /** Requêtes à fort trafic du pôle (data/gen/poles.ts → hotKeywords) */
  hotKeywords: string[];
  /** Requêtes réelles du tableau d'audit SEO pour ce pôle */
  realQueries: string[];
  /** Mots-clés sourcés à la main au catalogue — fusionnés, jamais en primary */
  manualKeywords?: ServiceKeywords;
  /** Contexte vendeur (v2) : compétences réelles, réactivité, pays */
  sellerName?: string;
  sellerSkills?: string[];
  sellerResponseTime?: string; // « répond en moins de 3 h »
  sellerCountryLabel?: string;
  sellerLevel?: string;
}

export interface HumanizedBundle {
  description: string;
  shortDesc: string;
  keywords: ServiceKeywords & { v: number };
  faq: { q: string; a: string }[];
  features: string[];
  deliverables: string[];
  process: { step: number; title: string; detail: string }[];
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  2. Requêtes réelles à fort trafic (audit SEO, par pôle)
 * ═══════════════════════════════════════════════════════════════════════════ */

export const REAL_POLE_QUERIES: Record<string, string[]> = {
  "ia-rag-data": [
    "créer un chatbot IA",
    "combien coûte un chatbot",
    "créer un Custom GPT",
    "convertir un PDF en Markdown",
    "entraîner une IA sur ses données",
  ],
  "ecommerce-pricing": [
    "gagner la Buy Box Amazon",
    "optimiser une fiche produit e-commerce",
    "suivre les prix de ses concurrents",
    "migration catalogue Shopify",
    "veille concurrentielle e-commerce",
  ],
  "b2b-sales-intelligence": [
    "base de données d'entreprises France",
    "liste des entreprises françaises",
    "trouver l'email d'un dirigeant",
    "startups qui lèvent des fonds",
    "enrichissement de données CRM",
  ],
  "evenementiel-marches-publics": [
    "BOAMP",
    "répondre à un appel d'offres",
    "trouver des appels d'offres",
    "liste des exposants d'un salon",
    "décision d'attribution marché public",
  ],
  "social-media-influence": [
    "combien coûte un influenceur",
    "calculer le taux d'engagement",
    "bibliothèque publicitaire Facebook",
    "trouver des influenceurs pour sa marque",
    "formats viraux TikTok",
  ],
  "seo-geo-medias": [
    "people also ask",
    "être cité par ChatGPT",
    "être invité dans un podcast",
    "référencement sur Perplexity",
    "trouver des journalistes",
  ],
  "immobilier-local": [
    "calcul rentabilité locative",
    "optimiser sa fiche Google Maps",
    "trouver un artisan RGE",
    "consultation permis de construire",
    "biens sous le prix du marché",
  ],
  "hotellerie-tourisme": [
    "menu QR code restaurant",
    "domaine de mariage prix",
    "idées sorties CSE",
    "producteurs locaux restaurants",
    "traduire les avis clients Google",
  ],
  "rh-recrutement": [
    "grille salariale par métier",
    "chasseur de tête",
    "TJM freelance",
    "offres d'emploi non pourvues",
    "benchmark avantages employeurs",
  ],
  "grand-public": [
    "location sans frais d'agence",
    "comparateur prix travaux",
    "comparateur EHPAD",
    "cote des montres de collection",
  ],
  "grandes-entreprises": [
    "déposer une marque à l'INPI",
    "audit RGPD",
    "trouver un fabricant en Europe",
    "vérifier la santé financière d'un fournisseur",
    "benchmark RSE",
  ],
  "saas-tech": [
    "avis G2 Capterra",
    "liste des fonds d'investissement",
    "business angels français",
    "analyse des avis utilisateurs",
    "veille roadmap concurrent",
  ],
  "formation-sante": [
    "organisme de formation Qualiopi",
    "formations éligibles CPF",
    "subventions pour les entreprises",
    "annuaire des mairies",
    "annuaire des pharmacies",
  ],
  "logistique-franchises": [
    "rentabilité franchise",
    "matériel professionnel occasion",
    "bornes de recharge IRVE",
    "liquidations judiciaires liste",
    "importer une marque étrangère",
  ],
};

/** Toutes les requêtes réelles connues, par pôle (hotKeywords + tableau audit). */
export function allRealQueriesFor(poleSlug: string, hotKeywords: string[]): string[] {
  return dedupeByNorm([...(REAL_POLE_QUERIES[poleSlug] ?? []), ...hotKeywords]);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  3. Utilitaires (hash déterministe, casse, élisions, dédoublonnage)
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Hash FNV-1a 32 bits, déterministe (source de toutes les rotations). */
export function hashSlug(slug: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Rotation déterministe par slug salé : avalanche appliquée (évite les grappes de sélection). */
function rot(slug: string, salt: string, mod: number): number {
  let h = hashSlug(`${slug}${salt}`);
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) % mod;
}

/** Mots gardés en casse canonique (sigles + marques) dans les mots-clés. */
const CANON: Record<string, string> = {
  seo: "SEO", geo: "GEO", aio: "AIO", ia: "IA", rag: "RAG", gpt: "GPT", llm: "LLM",
  b2b: "B2B", pme: "PME", eti: "ETI", rgpd: "RGPD", rse: "RSE", esg: "ESG", cpf: "CPF",
  cse: "CSE", tjm: "TJM", dvf: "DVF", boamp: "BOAMP", inpi: "INPI", rge: "RGE",
  dce: "DCE", ted: "TED", insee: "INSEE", crm: "CRM", saas: "SaaS", qr: "QR",
  g2: "G2", pdf: "PDF", irve: "IRVE", rna: "RNA", api: "API", url: "URL",
  amazon: "Amazon", shopify: "Shopify", google: "Google", facebook: "Facebook",
  tiktok: "TikTok", linkedin: "LinkedIn", youtube: "YouTube", instagram: "Instagram",
  uber: "Uber", chatgpt: "ChatGPT", claude: "Claude", perplexity: "Perplexity",
  excel: "Excel", capterra: "Capterra", maps: "Maps", meta: "Meta",
};

/** Minuscules françaises, sigles et marques préservés (« buy box amazon » → « buy box Amazon »). */
export function kwCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((tok) => CANON[tok.toLowerCase()] ?? tok.toLowerCase())
    .join(" ");
}

function normKw(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[«»,;:!?."'’\-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeByNorm(items: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const t = (raw ?? "").trim();
    if (!t) continue;
    const n = normKw(t);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(t);
  }
  return out;
}

/** Élision française : « de études » → « d'études ». */
export function elideDe(s: string): string {
  return s.replace(/\bde ([aeiouyéèêàâîôh])/gi, (_m, c: string) => `d'${c.toLowerCase()}`);
}

/** « de » ou « d' » selon la voyelle initiale du mot qui suit (avec l'espace). */
export function dePre(s: string): string {
  return /^[aeiouyéèêàâîôûhAEIOUYÉÈÊÀÂÎÔÛH]/.test(s.trim()) ? "d'" : "de ";
}

/** Première lettre majuscule (primaire en tête de phrase). */
function firstUpper(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Minuscule initiale d'une expression en milieu de phrase, sigles et marques
 * préservés (« Relevé instantané… » → « relevé instantané… »,
 * « SEO local » inchangé, « Excel / VBA » inchangé).
 */
function lowerFirstPhrase(s: string): string {
  const m = s.match(/^(\S+)([\s\S]*)$/);
  if (!m) return s;
  const word = m[1];
  if (CANON[word.toLowerCase()]) return s;
  if (word.length >= 2 && word === word.toUpperCase()) return s; // sigle (VBA, BOAMP…)
  return word.charAt(0).toLowerCase() + word.slice(1) + m[2];
}

/* ── Découpage de mots pour le matching requête réelle ↔ fiche ─────────────── */

const STOPWORDS = new Set([
  "le", "la", "les", "de", "des", "du", "un", "une", "et", "en", "au", "aux", "avec",
  "a", "pour", "par", "sur", "dans", "sans", "son", "sa", "ses", "vos", "votre",
  "vous", "je", "vais", "ce", "cette", "ces", "est", "sont", "plus", "tout", "tous",
  "que", "qui", "ne", "pas", "se", "leur", "leurs", "comme", "chez", "sous", "vers",
  "combien", "comment", "ou", "ou", "ni", "donc", "or", "car", "mais", "the", "and",
]);

function normTokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * Requêtes du tableau d'audit cohérentes avec la fiche : matching par mots communs
 * (≥ 2 mots significatifs partagés, ou 1 mot partagé d'au moins 5 lettres).
 * Triées par pertinence décroissante.
 */
export function matchedRealQueries(realQueries: string[], ficheText: string): string[] {
  const fiche = new Set(normTokens(ficheText));
  return realQueries
    .map((q) => {
      const shared = normTokens(q).filter((t) => fiche.has(t));
      return { q, n: shared.length, maxLen: shared.reduce((m, t) => Math.max(m, t.length), 0) };
    })
    .filter((x) => x.n >= 2 || x.maxLen >= 5)
    .sort((a, b) => b.n - a.n || b.maxLen - a.maxLen)
    .map((x) => x.q);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  4. Nettoyage du primary et de la catégorie
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Primary PROPRE : titre sans « Je vais », sans troncature de mot, sans virgule ;
 * coupé au besoin à une frontière de syntagme (avant pour/de/d'…) si > 70 car.
 */
export function cleanPrimary(title: string): string {
  let t = title
    .replace(/^Je (?:vais|peux)\s+/i, "")
    .replace(/^vous\s+/i, "")
    .replace(/[,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > 70) {
    const tail = t.slice(45);
    const m = tail.match(/\s(pour|de|des|du|d')\s/i);
    if (m && m.index !== undefined) {
      t = t.slice(0, 45 + m.index).trim();
    } else {
      const lastSpace = t.lastIndexOf(" ", 70);
      if (lastSpace > 45) t = t.slice(0, lastSpace).trim();
    }
  }
  return kwCase(t);
}

/**
 * [ADDITIF v1.9.0 — skill ÉTAPE 2] Contrainte contractuelle : le primaire est
 * une TÊTE commerciale de 3 à 5 mots significatifs (mots > 2 lettres).
 * cleanPrimary() borne en caractères ; ce clamp borne en MOTS — cause racine
 * des 113 primaires de 6-10 mots constatée par l'audit élite 2026-11-11.
 * Troncature à la frontière du 5e mot significatif, repli sur la catégorie
 * si le résultat descend sous 3 mots significatifs.
 */
export function clampPrimaryToSkill(primary: string, category = ""): string {
  const sigCount = (s: string) => s.split(/\s+/).filter((w) => w.length > 2).length;
  if (sigCount(primary) <= 5) return primary;
  const words = primary.split(/\s+/);
  let count = 0;
  let cut = words.length;
  for (let i = 0; i < words.length; i++) {
    if (words[i].length > 2) count++;
    if (count === 5) {
      cut = i + 1;
      break;
    }
  }
  let out = words.slice(0, cut).join(" ").trim();
  if (sigCount(out) < 3 && category) {
    out = `${out} ${categoryKeyword(category)}`.replace(/\s+/g, " ").trim();
  }
  return out;
}

/** Titre sans « Je vais » (gardé pour les citations et la FAQ). */
function stripJeVais(title: string): string {
  return title
    .replace(/^Je (?:vais|peux)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/, "")
    .trim();
}

/** Catégorie en mot-clé : segment le plus spécifique, parenthèses retirées, « & » → « et ». */
export function categoryKeyword(category: string): string {
  const segs = category.split(">").map((s) => s.trim()).filter(Boolean);
  const c = (segs[segs.length - 1] ?? category)
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, "et")
    .replace(/\s+/g, " ")
    .trim();
  return kwCase(c);
}

/** Catégorie en prose (minuscules, « & » → « et ») pour les phrases et questions IA. */
function categoryProse(category: string): string {
  return categoryKeyword(category).replace(/\s+/g, " ").trim();
}

/** Coupe une expression verbale à ~max caractères, frontière de syntagme privilégiée. */
function shortPhrase(p: string, max = 40): string {
  if (p.length <= max) return p;
  const re = /\s(?=(?:de|du|des|en|à|au|aux|pour|dans|sur|et)\s)/gi;
  let cut = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p)) !== null) {
    if (m.index <= max) cut = m.index;
  }
  let out = cut > 0 ? p.slice(0, cut) : p.slice(0, p.lastIndexOf(" ", max));
  // retire un complément dangling (« … site en base » → « … site »)
  while (/\s(en|de|du|des|à|au|aux)\s+\S+$/i.test(out) && out.length > 26) {
    out = out.replace(/\s(en|de|du|des|à|au|aux)\s+\S+$/i, "");
  }
  return out.trim();
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  5. buildKeywordsV2 — mots-clés avec de vraies requêtes à fort trafic
 * ═══════════════════════════════════════════════════════════════════════════ */

export function buildKeywordsV2(input: {
  title: string;
  category: string;
  poleIndex: number;
  hotKeywords: string[];
  realQueries: string[];
  manual?: ServiceKeywords;
}): ServiceKeywords & { v: number } {
  const primary = clampPrimaryToSkill(cleanPrimary(input.title), input.category);
  const catKw = categoryKeyword(input.category);

  // requêtes réelles : d'abord celles du tableau cohérentes avec la fiche,
  // puis les hotKeywords DORMANTS (indices 3-9) en rotation par index dans le pôle
  const matched = matchedRealQueries(input.realQueries, `${input.title} ${input.category}`);
  const dormant = input.hotKeywords.slice(3);
  const realPool = dedupeByNorm([
    ...matched.slice(0, 2).map(kwCase),
    ...dormant.map((_, k) => dormant[(input.poleIndex + k) % dormant.length]).map(kwCase),
    ...input.hotKeywords.slice(0, 3).map(kwCase),
  ]);

  const manualSec = (input.manual?.secondary ?? []).map((s) => s.trim()).filter(Boolean);
  const maxSec = input.manual ? 6 : 5;
  let secondary = dedupeByNorm([
    catKw,
    ...realPool.slice(0, 2),
    ...manualSec,
    ...realPool.slice(2),
  ]).slice(0, maxSec);

  // sécurité : ≥ 2 requêtes réelles dans secondary
  const realSet = new Set(realPool.map(normKw));
  const realIn = () => secondary.filter((s) => realSet.has(normKw(s))).length;
  for (const rp of realPool) {
    if (realIn() >= 2) break;
    if (secondary.some((s) => normKw(s) === normKw(rp))) continue;
    if (secondary.length < maxSec) secondary.push(rp);
    else {
      const idx = [...secondary].reverse().findIndex((s) => !realSet.has(normKw(s)) && normKw(s) !== normKw(catKw));
      if (idx >= 0) secondary[secondary.length - 1 - idx] = rp;
    }
  }

  // longue traîne : « comment {titre} » + requêtes réelles restantes + patterns grammaticaux
  const usedNorm = new Set(secondary.map(normKw));
  const remainingReal = realPool.filter((r) => !usedNorm.has(normKw(r)));
  const patterns = [
    `combien coûte ${primary}`,
    `${primary} prix`,
    `${primary} freelance francophone`,
    `${primary} pour PME`,
    `meilleur service pour ${primary}`,
  ];
  const manualLT = (input.manual?.longTail ?? []).map((s) => s.trim()).filter(Boolean);
  const longTail = dedupeByNorm([`comment ${primary}`]);
  // [CORRECTIF v1.9.0] dédoublonnage normatif de TOUTES les poussées
  // (bug reproduit : doublons « comment rédiger… » ×2 et « podcasts invités
  // actifs » ×2 sur la fiche #101 — audit E3).
  const ltSeen = new Set(longTail.map(normKw));
  const pushLt = (x: string) => {
    const k = normKw(x);
    if (x && !ltSeen.has(k)) {
      ltSeen.add(k);
      longTail.push(x);
    }
  };
  for (const r of remainingReal) {
    if (longTail.length >= 3) break;
    if (!usedNorm.has(normKw(r))) pushLt(r);
  }
  for (const mlt of manualLT) {
    if (longTail.length >= 5) break;
    pushLt(mlt);
  }
  for (const p of patterns) {
    if (longTail.length >= 7) break;
    pushLt(p);
  }
  let pi = 0;
  while (longTail.length < 6 && pi < patterns.length) pushLt(patterns[pi++]);

  // aiQueries : questions grammaticalement correctes (élisions incluses)
  const catP = categoryProse(input.category);
  const shortP = shortPhrase(primary, 40);
  const computed = [
    `Quel est le meilleur service pour ${primary} ?`,
    `Combien coûte ${primary} ?`,
    `Où trouver un expert en ${catP} pour ${shortP} ?`,
    `Comment choisir un prestataire pour ${primary} ?`,
    `Pourquoi passer par b2bpro.store pour ${primary} ?`,
  ];
  const manualAQ = (input.manual?.aiQueries ?? []).map((s) => s.trim()).filter(Boolean);
  const aiQueries = dedupeByNorm([...manualAQ, ...computed]).slice(0, 5);

  return { primary, secondary, longTail: longTail.slice(0, 8), aiQueries, v: HUMANIZED_KW_VERSION };
}

/** Détecte un jeu de mots-clés déjà humanisé (idempotence de la migration). */
export function isHumanizedKeywords(kwJson: string): boolean {
  try {
    const kw = JSON.parse(kwJson) as { v?: number };
    return kw?.v === HUMANIZED_KW_VERSION;
  } catch {
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  6. Nettoyage du contenu conservé (✓, em-dash, guillemets anglais)
 * ═══════════════════════════════════════════════════════════════════════════ */

function cleanLine(line: string): string {
  let l = line;
  l = l.replace(/^[✓✔•]\s*/, "- ");
  l = l.replace(/[✓✔]/g, "-");
  l = l.replace(/"([^"\n]+)"/g, "« $1 »");
  l = l.replace(/"/g, "");
  l = l.replace(/ — /g, " : ");
  l = l.replace(/—/g, ":");
  l = l.replace(/\.{3,}/g, "…");
  l = l.replace(/\.{2}/g, ".");
  l = l.replace(/[ \t]{2,}/g, " ");
  return l.trimEnd();
}

function cleanKeptText(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split("\n").map(cleanLine).filter((l) => l.length > 0).join("\n"))
    .filter((p) => p.length > 0)
    .join("\n\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  7. Pools rédactionnels v2 — chaque variante porte un paramètre du service
 * ═══════════════════════════════════════════════════════════════════════════ */

interface AccrocheCtx {
  primary: string;
  prix: string;
  delai: string;
  note: string;
  avis: string;
  ventes: string;
}

interface GuaranteeCtx {
  ventes: string;
  avis: string;
  delai: string;
  prix: string;
  poleLabel: string;
}

interface Slot4Ctx {
  note: string;
  avis: string;
  ventes: string;
  delai: string;
  prix: string;
  poleLabel: string;
  rt: string; // « répond en moins de 3 h »
  shortP: string; // primaire raccourci
  cat: string; // catégorie en prose
}

interface H2Ctx {
  primary: string;
  shortP: string;
  cat: string;
  prix: string;
  delai: string;
  poleLabel: string;
}

/** 20 squelettes d'accroche answer-first (primaire + chiffres réels → uniques). */
const ACCROCHES: ((c: AccrocheCtx) => string)[] = [
  (c) =>
    `Vous cherchez à **${c.primary}** ? Dès ${c.prix} €, un expert noté ${c.note}/5 sur ${c.avis} avis prend le relais et vous livre en ${c.delai}.`,
  (c) =>
    `**${firstUpper(c.primary)}** sans y sacrifier vos soirées, c'est possible : ${c.prix} €, ${c.delai}, et un expert noté ${c.note}/5 (${c.avis} avis) aux commandes.`,
  (c) =>
    `Certaines tâches méritent d'être déléguées, et **${c.primary}** en fait partie. L'offre démarre à ${c.prix} €, livraison en ${c.delai}, expert noté ${c.note}/5 sur ${c.avis} avis.`,
  (c) =>
    `${c.ventes} commandes déjà livrées sur cette fiche : **${c.primary}** répond à un besoin bien réel. Comptez ${c.prix} € et ${c.delai}, avec un expert noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `Besoin ${dePre(c.primary)}**${c.primary}** ? L'offre de base démarre à ${c.prix} €, pour une livraison en ${c.delai} par un expert noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `Sur ce type de mission, l'exécution compte plus que la théorie : **${c.primary}** se commande dès ${c.prix} €, livré en ${c.delai} par un expert noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `Un besoin clair, une échéance courte : **${c.primary}** vous est livré en ${c.delai}, dès ${c.prix} €. L'expert en charge est noté ${c.note}/5 (${c.avis} avis clients).`,
  (c) =>
    `Le plus rentable reste de le faire faire : **${c.primary}** dès ${c.prix} €, en ${c.delai}, par un expert noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `${c.ventes} clients ont déjà validé **${c.primary}** sur cette fiche. L'offre démarre à ${c.prix} €, ${c.delai}, expert noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `Déléguer **${c.primary}** coûte ${c.prix} € ici : ${c.delai}, expert noté ${c.note}/5 sur ${c.avis} avis, paiements sécurisés.`,
  (c) =>
    `**${firstUpper(c.primary)}** sans y passer vos soirées : ${c.prix} €, ${c.delai}, et un expert noté ${c.note}/5 (${c.avis} avis) derrière la commande.`,
  (c) =>
    `**${c.primary}** : ${c.prix} €, ${c.delai}, et un expert noté ${c.note}/5 (${c.avis} avis) qui prend le relais.`,
  (c) =>
    `Commandé ${c.ventes} fois, noté ${c.note}/5 (${c.avis} avis) : **${c.primary}** se livre ici dès ${c.prix} €, en ${c.delai}.`,
  (c) =>
    `Un expert francophone noté ${c.note}/5 (${c.avis} avis) prend en charge **${c.primary}** : ${c.prix} €, ${c.delai}.`,
  (c) =>
    `**${firstUpper(c.primary)}** en ${c.delai}, à ${c.prix} € : les ${c.ventes} commandes déjà livrées et les ${c.avis} avis (${c.note}/5) en parlent.`,
  (c) =>
    `Confiez **${c.primary}** à un expert vérifié : ${c.prix} €, ${c.delai}, note ${c.note}/5 sur ${c.avis} avis.`,
  (c) =>
    `Le travail que vous reportez depuis des semaines : **${c.primary}** dès ${c.prix} €, ${c.delai}, expert noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `Arrêtez de reporter : **${c.primary}** se commande à ${c.prix} €, se livre en ${c.delai}, et l'expert en charge affiche ${c.note}/5 sur ${c.avis} avis.`,
  (c) =>
    `Le travail se fait, vous ne le faites pas : **${c.primary}** à ${c.prix} €, livré en ${c.delai} par un expert noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `Vous avez le besoin, la fiche a l'expert : **${c.primary}** dès ${c.prix} €, ${c.delai}, note ${c.note}/5 (${c.avis} avis).`,
];

/** 15 combinaisons de garanties — chacune porte ventes/avis/délai. */
const GUARANTEE_COMBOS: ((g: GuaranteeCtx) => string)[] = [
  (g) =>
    `Paiement séquestré jusqu'à validation, ajustements inclus : c'est la règle sur les ${g.ventes} commandes déjà livrées.`,
  (g) =>
    `Le paiement n'est libéré qu'après votre validation, et chaque livrable passe un contrôle qualité avant envoi (${g.avis} avis clients vérifiés).`,
  (g) =>
    `Ajustements inclus jusqu'à satisfaction, avec un support qui répond en français 7 j/7, du premier contact à la livraison en ${g.delai}, sur les ${g.ventes} commandes déjà livrées.`,
  (g) =>
    `Contrôle qualité avant chaque envoi, support 7 j/7 en français : les ${g.avis} avis de la fiche en témoignent.`,
  (g) =>
    `Paiement séquestré jusqu'à validation et suivi de 7 jours : conditions identiques pour les ${g.ventes} commandes déjà passées ici.`,
  (g) =>
    `Ajustements inclus jusqu'à satisfaction, contrôle qualité avant envoi : la livraison en ${g.delai} suit le même circuit que les ${g.ventes} commandes précédentes.`,
  (g) =>
    `Votre argent reste bloqué jusqu'à validation du livrable, et les retouches sont incluses jusqu'à votre feu vert (${g.avis} avis clients).`,
  (g) =>
    `Paiement libéré seulement après votre validation, retouches incluses, support francophone 7 j/7 (${g.avis} avis vérifiés), et rien ne change pour la livraison en ${g.delai}.`,
  (g) =>
    `Chaque livrable passe un contrôle qualité avant envoi, et le paiement reste séquestré jusqu'à votre feu vert (${g.avis} avis vérifiés).`,
  (g) =>
    `Retouches incluses jusqu'à satisfaction et paiement bloqué jusqu'à validation : les ${g.ventes} clients passés avant vous l'ont constaté.`,
  (g) =>
    `Support en français 7 j/7, ajustements inclus, paiement séquestré : votre commande de ${g.delai} bénéficie du même cadre que les ${g.ventes} précédentes.`,
  (g) =>
    `Le vendeur n'est payé qu'après votre validation, et chaque livraison en ${g.delai} est précédée d'un contrôle qualité, comme pour les ${g.ventes} commandes déjà traitées.`,
  (g) =>
    `Ajustements inclus jusqu'à satisfaction complète, paiement séquestré jusqu'à validation : le socle des ${g.avis} avis vérifiés.`,
  (g) =>
    `Votre validation débloque le paiement, jamais l'inverse : ajustements inclus, contrôle qualité avant envoi (${g.ventes} commandes livrées).`,
  (g) =>
    `Paiement bloqué, livrable vérifié, retouches incluses : le circuit appliqué aux ${g.ventes} commandes déjà livrées, en ${g.delai} aussi.`,
];

/** Titres H2 — slot 1 : problème / usage (primaire ou catégorie injectés). */
const H2_SLOT1: ((c: H2Ctx) => string)[] = [
  (c) => `À quoi sert ${dePre(c.primary)}${c.primary} ?`,
  (c) => `Qui a besoin ${dePre(c.primary)}${c.primary} ?`,
  (c) => `Le besoin concret : ${c.primary}`,
  (c) => `Le problème que « ${c.shortP} » règle à votre place`,
  (c) => `Le besoin auquel répond une prestation de ${c.cat}`,
  (c) => `Faire soi-même ou déléguer : le calcul en ${c.cat}`,
  (c) => `${firstUpper(c.cat)}, pour qui ?`,
  (c) => `${firstUpper(c.cat)} : le besoin réel`,
  (c) => `${firstUpper(c.cat)} : à quoi ça sert ?`,
  (c) => `${firstUpper(c.primary)} : pourquoi maintenant`,
  (c) => `Où le besoin se fait sentir : ${c.cat}`,
  (c) => `Le contexte dans lequel ${c.primary} s'impose`,
  (c) => `Ce que les entreprises cherchent : ${c.cat}`,
  (c) => `Quand ${c.primary} devient la bonne option`,
];

/** Titres H2 — slot 2 : livrables (primaire, catégorie ou prix injectés). */
const H2_SLOT2: ((c: H2Ctx) => string)[] = [
  (c) => `Ce que couvre une prestation de ${c.cat}`,
  (c) => `Le contenu précis d'une prestation de ${c.cat}`,
  (c) => `Vos livrables pour « ${c.shortP} », dans le détail`,
  (c) => `Ce qui est inclus dans l'offre de base en ${c.cat}`,
  (c) => `Concrètement, ce que vous obtenez pour ${c.primary}`,
  (c) => `Tout ce que contient une commande de ${c.cat}`,
  (c) => `Ce que l'offre à ${c.prix} € couvre en ${c.cat}`,
  (c) => `Le contenu exact de « ${c.shortP} »`,
  (c) => `${firstUpper(c.cat)} : le contenu de la commande`,
  (c) => `De la commande au livrable : le contenu en ${c.cat}`,
  (c) => `À ${c.prix} € en ${c.cat}, ce que vous recevez`,
  (c) => `Le détail d'une offre de ${c.cat}`,
  (c) => `« ${c.shortP} » : le contenu de l'offre`,
  (c) => `Le périmètre exact de la prestation en ${c.cat}`,
];

/** Titres H2 — slot 3 : méthode + expertise (catégorie/primaire injectés). */
const H2_SLOT3: ((c: H2Ctx) => string)[] = [
  (c) => `La méthode : ${c.cat}, appliquée à votre cas`,
  (c) => `Les compétences mobilisées en ${c.cat}`,
  (c) => `Comment l'expert travaille sur un dossier de ${c.cat}`,
  (c) => `L'expertise derrière un livrable de ${c.cat}`,
  (c) => `Sur quoi repose la qualité en ${c.cat}`,
  (c) => `Le savoir-faire engagé pour ${c.primary}`,
  (c) => `La méthode de travail en ${c.cat}`,
  (c) => `${firstUpper(c.cat)} : la méthode appliquée`,
  (c) => `Le chemin parcouru pour ${c.primary}`,
  (c) => `Comment un dossier de ${c.cat} est traité`,
  (c) => `Les coulisses d'une prestation de ${c.cat}`,
  (c) => `Le travail derrière « ${c.shortP} »`,
  (c) => `Ce qui fait la différence en ${c.cat}`,
  (c) => `La façon de travailler, côté ${c.cat}`,
];

/** Titres H2 — slot 4 : garanties plateforme (catégorie/prix/délai injectés). */
const H2_SLOT4: ((c: H2Ctx) => string)[] = [
  (c) => `Pourquoi commander sans risque en ${c.cat}`,
  (c) => `Les garanties incluses dès ${c.prix} € en ${c.cat}`,
  (c) => `Ce que b2bpro.store garantit en ${c.cat}`,
  (c) => `Commander « ${c.shortP} » sans risque`,
  (c) => `Vos garanties de bout en bout en ${c.cat}`,
  (c) => `Pourquoi une commande de ${c.cat} est protégée`,
  (c) => `À ${c.prix} €, les protections actives`,
  (c) => `Les protections attachées à une commande de ${c.cat}`,
  (c) => `Payer ${c.prix} €, être livré, sans risque`,
  (c) => `Le cadre de confiance pour ${c.cat}`,
  (c) => `Ce que ${c.prix} € achètent en ${c.cat}, garanties comprises`,
  (c) => `Garanties : le cadre d'une commande de ${c.cat}`,
  (c) => `Sans risque : paiement séquestré jusqu'à votre validation`,
  (c) => `Pourquoi la plateforme protège votre commande de ${c.cat}`,
];

/**
 * 8 formulations de la phrase d'expertise — alimentée par les skills RÉELS du
 * vendeur (plus jamais les mots-clés d'autres fiches du pôle).
 */
const EXPERTISE: ((s1: string, s2: string, seller?: string) => string)[] = [
  (s1, s2) => `Deux domaines structurent cette prestation : ${s1} et ${s2}.`,
  (s1, s2) => `Les compétences en jeu : ${s1}, ${s2} et un vrai contrôle qualité en bout de course.`,
  (s1, s2) => `L'expertise attendue sur ce dossier : ${s1} et ${s2}.`,
  (s1, s2) => `Expertise mobilisée : ${s1} et ${s2}.`,
  (s1, s2) => `Le savoir-faire derrière le livrable : ${s1} et ${s2}.`,
  (s1, s2, n) =>
    n ? `${n} mobilise ici ${s1} et ${s2}, avec vérification du livrable avant chaque envoi.` : `Le prestataire mobilise ici ${s1} et ${s2}, avec vérification du livrable avant chaque envoi.`,
  (s1, s2) => `Deux savoir-faire portent la prestation : ${s1} et ${s2}.`,
  (s1, s2) => `Le profil engagé sur la commande : ${s1} et ${s2}, vérifiés livrable après livrable.`,
];

/** 14 reformulations du bloc garanties + géographie francophone (paramétrées). */
const GEO_GUARANTEES: ((g: GuaranteeCtx & { countryLabel: string }) => string)[] = [
  (g) =>
    `Chaque commande passée ici suit le paiement séquestré, le contrôle qualité avant envoi et 7 jours de suivi après livraison, réglé de la même façon pour les ${g.ventes} commandes déjà livrées. Le service s'adresse à toute la francophonie : France, Belgique, Suisse, Québec et Afrique francophone, comme en attestent les ${g.avis} avis vérifiés.`,
  (g) =>
    `Ici, votre paiement reste bloqué jusqu'à validation, le livrable est vérifié avant envoi et vous conservez 7 jours de suivi après réception, règle suivie sur les ${g.ventes} commandes déjà livrées. Clients français, belges, suisses, québécois ou africains : tout se traite en français, du paiement de ${g.prix} € au suivi de 7 jours.`,
  (g) =>
    `Le vendeur n'est payé qu'après votre feu vert, chaque livrable subit un contrôle qualité avant l'envoi et le suivi court sur 7 jours après livraison, sur les ${g.ventes} commandes déjà traitées. La plateforme couvre toute la francophonie, et votre commande de ${g.delai} suivra le même circuit que les ${g.avis} avis vérifiés.`,
  (g) =>
    `Paiement séquestré jusqu'à validation, contrôle qualité avant envoi, suivi de 7 jours après livraison : ces trois protections s'appliquent à toutes les commandes, des ${g.ventes} déjà livrées aux ${g.avis} avis vérifiés.`,
  (g) =>
    `Aucun livrable ne part sans contrôle qualité, aucun vendeur n'est payé avant votre validation, et chaque commande inclut 7 jours de suivi : le circuit des ${g.ventes} commandes déjà livrées. b2bpro.store est pensé pour les acheteurs francophones, de ${g.countryLabel} comme des autres pays de la zone, ${g.avis} avis vérifiés à l'appui.`,
  (g) =>
    `Le paiement reste sous séquestre jusqu'à votre validation, le contrôle qualité précède chaque envoi et le suivi court 7 jours après la livraison des ${g.ventes} commandes déjà traitées. Que vous commandiez depuis la France, la Belgique, la Suisse, le Québec ou l'Afrique francophone, le montant de ${g.prix} € suit le même régime.`,
  (g) =>
    `Votre validation commande tout : elle libère le paiement, clôt le contrôle qualité du livrable et ouvre les 7 jours de suivi constatés sur les ${g.ventes} commandes déjà livrées. Les ${g.avis} avis vérifiés confirment le circuit, valable de la France au Sénégal en passant par le Québec.`,
  (g) =>
    `Rien n'est expédié sans contrôle, rien n'est payé sans votre feu vert, et le suivi dure 7 jours après réception, comme pour les ${g.ventes} commandes déjà livrées. Le pôle ${g.poleLabel} sert toute la francophonie, avec les ${g.avis} avis vérifiés pour preuve.`,
  (g) =>
    `Séquestre du paiement jusqu'à validation, contrôle qualité avant envoi, suivi de 7 jours : les règles ne varient ni selon le pays (France, Belgique, Suisse, Québec, Afrique francophone), ni selon la taille de la commande, la vôtre comprise, tout comme les ${g.ventes} commandes déjà passées.`,
  (g) =>
    `Le paiement est débloqué au vendeur après votre validation, le livrable passe le contrôle qualité avant l'envoi et le suivi s'étend sur 7 jours après la livraison, comme pour les ${g.ventes} commandes déjà traitées. La plateforme couvre toute la francophonie, du client de ${g.countryLabel} au Québécois, ce que les ${g.avis} avis vérifiés confirment.`,
  (g) =>
    `Achat protégé de bout en bout : paiement bloqué jusqu'à votre feu vert, contrôle qualité avant expédition, suivi de 7 jours après réception, comme sur les ${g.ventes} commandes déjà livrées. Les ${g.avis} avis de toute la francophonie en rendent compte.`,
  (g) =>
    `Votre commande bénéficie du séquestre de paiement, du contrôle qualité préalable à l'envoi et de 7 jours de suivi, exactement comme les ${g.ventes} précédentes. France, Belgique, Suisse, Québec, Afrique francophone : le cadre est identique partout, du règlement à la commande jusqu'à la livraison en ${g.delai}.`,
  (g) =>
    `Le circuit est verrouillé : paiement à la commande mais déblocage au vendeur après votre validation, contrôle qualité avant tout envoi, 7 jours de suivi après toute livraison, sur les ${g.ventes} commandes déjà passées. Et il l'est pour chaque acheteur francophone, de ${g.countryLabel} au Canada (${g.avis} avis vérifiés).`,
  (g) =>
    `Paiement séquestré, livrable contrôlé avant envoi, suivi de 7 jours : les protections accompagnent les ${g.ventes} commandes déjà livrées comme toutes les autres. La francophonie entière est servie, et les ${g.avis} avis vérifiés en témoignent.`,
];

/** 14 intros de la section garanties (slot 4) — paramétrées. */
const SLOT4_INTROS: ((c: Slot4Ctx) => string)[] = [
  (c) => `À ${c.prix} €, la commande s'accompagne de protections concrètes :`,
  (c) => `Ce que la plateforme garantit quand vous commandez (${c.avis} avis vérifiés à l'appui) :`,
  (c) => `Cinq protections encadrent chaque commande, dont les ${c.ventes} déjà livrées :`,
  (c) => `Vous n'achetez pas à l'aveugle, ${c.ventes} commandes en témoignent :`,
  (c) => `L'esprit tranquille sur « ${c.shortP} », du règlement à la commande jusqu'à la livraison en ${c.delai} :`,
  (c) => `Commander ici, c'est activer des protections concrètes, vérifiées sur ${c.avis} avis :`,
  (c) => `Les garanties qui couvrent « ${c.shortP} » (${c.prix} €, ${c.delai}) :`,
  (c) => `Ce que b2bpro.store garantit sur les commandes du pôle ${c.poleLabel} :`,
  (c) => `Garanties de bout en bout sur « ${c.shortP} », du règlement de ${c.prix} € à la commande jusqu'à la validation :`,
  (c) => `Votre achat de ${c.prix} € voyage avec ces protections :`,
  (c) => `Rien n'arrive sans garanties, et ${c.avis} avis vérifiés le constatent :`,
  (c) => `Avant de payer ${c.prix} € en ${c.cat}, lisez ce qui vous couvre :`,
  (c) => `Le cadre de la commande, vérifiable sur les ${c.ventes} précédentes :`,
  (c) => `Protections actives de la commande (payée ${c.prix} €) à la validation du livrable en ${c.delai} :`,
];

/** Puce « preuve sociale » du slot 4 (note + avis + ventes réels). */
const SLOT4_NOTE: ((c: Slot4Ctx) => string)[] = [
  (c) => `Expert vérifié, noté ${c.note}/5 sur ${c.avis} avis clients`,
  (c) => `Expert noté ${c.note}/5 par ${c.avis} clients vérifiés`,
  (c) => `Prestataire vérifié : ${c.note}/5 de moyenne sur ${c.avis} avis`,
  (c) => `Note de ${c.note}/5 sur ${c.avis} avis, au fil de ${c.ventes} commandes livrées`,
  (c) => `Expert vérifié, ${c.note}/5 de moyenne (${c.avis} avis clients)`,
  (c) => `Noté ${c.note}/5 sur ${c.avis} avis, après ${c.ventes} commandes sur cette fiche`,
  (c) => `${c.note}/5 en moyenne sur ${c.avis} avis clients vérifiés`,
  (c) => `Expert noté ${c.note}/5 (${c.avis} avis), sur ${c.ventes} commandes déjà livrées`,
  (c) => `Prestataire vérifié noté ${c.note}/5, ${c.avis} avis clients en attestent`,
];

/** Puce paiement — chaque variante porte ventes ou avis. */
const FEATURES_PAIEMENT: ((c: Slot4Ctx) => string)[] = [
  (c) => `Paiement séquestré : le vendeur n'est payé qu'après votre validation (règle appliquée aux ${c.ventes} commandes déjà livrées)`,
  (c) => `Votre argent reste bloqué jusqu'à validation du livrable, comme en attestent les ${c.avis} avis vérifiés`,
  (c) => `Vendeur rémunéré uniquement après votre feu vert, sur les ${c.ventes} commandes déjà passées comme sur la vôtre`,
  (c) => `Le paiement ne part qu'après votre validation, départ vérifiable sur les ${c.avis} avis clients et ${c.ventes} commandes`,
  (c) => `Aucun euro ne quitte le séquestre avant votre feu vert (${c.ventes} commandes déjà passées à ce circuit)`,
  (c) => `Paiement bloqué jusqu'à validation : les ${c.avis} avis clients et ${c.ventes} commandes en font foi`,
  (c) => `Le vendeur touche son paiement une fois le livrable validé, exactement comme pour les ${c.ventes} commandes précédentes`,
  (c) => `Votre validation débloque le paiement du vendeur, jamais l'inverse (${c.avis} avis vérifiés)`,
  (c) => `Paiement sous séquestre, libéré après votre feu vert : le circuit suivi par les ${c.ventes} commandes déjà livrées`,
];

/** Puce livraison (délai + ponctualité + ventes/avis). */
const FEATURES_LIVRAISON: ((c: Slot4Ctx) => string)[] = [
  (c) => `Livraison en ${c.delai}, ponctualité constatée de 98,6 % (sur les ${c.ventes} commandes du prestataire)`,
  (c) => `${c.delai} pour être servi : 98,6 % de commandes à l'heure, constaté sur ${c.ventes} livraisons`,
  (c) => `Délai de ${c.delai}, respecté dans 98,6 % des cas (${c.avis} avis et ${c.ventes} commandes en témoignent)`,
  (c) => `Délai annoncé : ${c.delai}, tenu à 98,6 % d'après les ${c.ventes} commandes déjà livrées`,
  (c) => `${firstUpper(c.delai)} d'après la fiche, 98,6 % de ponctualité vérifiée au fil des ${c.avis} avis et ${c.ventes} commandes`,
  (c) => `Promesse de ${c.delai}, tenable : 98,6 % de livraisons à l'heure sur ${c.ventes} commandes`,
  (c) => `Livrable en ${c.delai} : 98,6 % de ponctualité, chiffre vérifiable sur les ${c.avis} avis`,
  (c) => `${firstUpper(c.delai)} à l'heure dans 98,6 % des cas, sur les ${c.ventes} commandes déjà traitées`,
  (c) => `Délai de ${c.delai}, ponctualité de 98,6 % : les ${c.avis} avis clients et ${c.ventes} commandes le confirment`,
];

/** Puce ajustements (ventes/avis injectés). */
const FEATURES_AJUSTEMENTS: ((c: Slot4Ctx) => string)[] = [
  (c) => `Retouches incluses jusqu'à satisfaction complète (déjà appliquées sur ${c.ventes} commandes)`,
  (c) => `Ajustements possibles jusqu'à validation, sans supplément, comme le montrent les ${c.avis} avis et ${c.ventes} commandes`,
  (c) => `Demandes de retouche incluses avant validation finale, ${c.avis} avis clients le documentent`,
  (c) => `Retouches incluses jusqu'à votre feu vert, ${c.ventes} commandes déjà passées par là`,
  (c) => `Ajustements sans supplément jusqu'à satisfaction : ${c.avis} avis vérifiés et ${c.ventes} commandes en parlent`,
  (c) => `Votre droit à la retouche court jusqu'à validation (${c.ventes} clients l'ont utilisé)`,
  (c) => `Retouches incluses avant validation finale, les ${c.avis} avis et ${c.ventes} commandes en témoignent`,
  (c) => `Ajustements gratuits jusqu'à satisfaction, comme sur les ${c.ventes} commandes précédentes`,
  (c) => `Modifications incluses jusqu'à votre feu vert, ${c.avis} avis clients et ${c.ventes} commandes le confirment`,
];

/** Puce support du slot 4 (temps de réponse réel du vendeur). */
const SLOT4_SUPPORT: ((c: Slot4Ctx) => string)[] = [
  (c) => `Support en français 7 j/7, avant comme après la commande, et le vendeur ${c.rt} (constat sur ${c.ventes} commandes)`,
  (c) => `Une équipe support joignable 7 j/7 en français, comme sur tout le pôle ${c.poleLabel} ; le vendeur ${c.rt}`,
  (c) => `Questions avant ou après l'achat : support en français 7 j/7 sur le pôle ${c.poleLabel} (${c.rt}, ${c.avis} avis vérifiés)`,
  (c) => `Support francophone 7 j/7 ; côté réactivité, le vendeur ${c.rt} (${c.ventes} commandes traitées)`,
  (c) => `Support b2bpro.store en français 7 j/7, le prestataire ${c.rt} (constaté sur ${c.ventes} commandes)`,
  (c) => `Avant comme après la commande : un support français 7 j/7, un vendeur qui ${c.rt} (${c.avis} avis vérifiés)`,
];

/** 15 squelettes de shortDesc (primaire + chiffres réels → uniques). */
const SHORTDESCS: ((c: AccrocheCtx) => string)[] = [
  (c) =>
    `Vous cherchez à ${c.primary} ? L'offre démarre à ${c.prix} €, livraison en ${c.delai} par un expert noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `${firstUpper(c.primary)}, livré en ${c.delai} dès ${c.prix} € : expert vérifié noté ${c.note}/5 (${c.avis} avis), ajustements inclus.`,
  (c) =>
    `Faites ${c.primary} par un expert noté ${c.note}/5 (${c.avis} avis). Dès ${c.prix} €, livré en ${c.delai}, retouches incluses.`,
  (c) =>
    `Besoin ${dePre(c.primary)}${c.primary} ? Offre de base à ${c.prix} €, livraison en ${c.delai}, prestataire noté ${c.note}/5 sur ${c.avis} avis.`,
  (c) =>
    `${firstUpper(c.primary)} sans y passer la semaine : ${c.prix} €, ${c.delai}, expert noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `Pour ${c.primary}, comptez ${c.prix} € et ${c.delai} : expert francophone noté ${c.note}/5 sur ${c.avis} avis.`,
  (c) =>
    `${firstUpper(c.primary)} à ${c.prix} €, livré en ${c.delai} par un expert noté ${c.note}/5 (${c.avis} avis), ajustements inclus.`,
  (c) =>
    `Déléguer ${c.primary} : ${c.prix} €, ${c.delai}, et un expert noté ${c.note}/5 (${c.avis} avis) derrière la commande.`,
  (c) =>
    `Commandez ${c.primary} dès ${c.prix} € : livraison en ${c.delai}, expert vérifié noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `${c.ventes} commandes déjà livrées pour ${c.primary} : ${c.prix} €, ${c.delai}, note ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `Confiez ${c.primary} à un expert noté ${c.note}/5 (${c.avis} avis) : dès ${c.prix} €, livré en ${c.delai}.`,
  (c) =>
    `Besoin de ${c.primary} ? L'offre démarre à ${c.prix} €, ${c.delai}, expert noté ${c.note}/5 (${c.avis} avis).`,
  (c) =>
    `${firstUpper(c.primary)} : ${c.prix} € en offre de base, ${c.delai} de livraison, expert noté ${c.note}/5 sur ${c.avis} avis.`,
  (c) =>
    `Sous-traitez ${c.primary} à un expert vérifié (${c.note}/5 sur ${c.avis} avis) : ${c.prix} €, livré en ${c.delai}.`,
  (c) =>
    `Stop au report : ${c.primary} dès ${c.prix} €, en ${c.delai}, par un expert noté ${c.note}/5 (${c.avis} avis).`,
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  8. FAQ — questions paramétriques, réponses autonomes et chiffrées
 * ═══════════════════════════════════════════════════════════════════════════ */

interface FaqCtx {
  primary: string;
  shortP: string;
  cat: string;
}

const FAQ_Q1_Q: ((f: FaqCtx) => string)[] = [
  (f) => `Concrètement, que contient une prestation de ${f.cat} ?`,
  (f) => `Que comprend l'offre de base pour ${f.primary} ?`,
  (f) => `Que comprend l'offre de base en ${f.cat} ?`,
  (f) => `Dans le périmètre « ${firstUpper(f.cat)} », que reçoit-on exactement ?`,
  (f) => `Que trouve-t-on dans le livrable de « ${f.shortP} » ?`,
  (f) => `Quel est le contenu précis d'une prestation de ${f.cat} ?`,
  (f) => `Pour ${f.primary}, que comprend exactement l'offre de base ?`,
  (f) => `Une prestation de ${f.cat} couvre quoi, exactement ?`,
  (f) => `Que livre exactement le prestataire chargé de ${f.primary} ?`,
];

const FAQ_Q2_Q: ((f: FaqCtx) => string)[] = [
  (f) => `Combien coûte ${f.primary} ?`,
  (f) => `Quel budget prévoir pour une prestation de ${f.cat} ?`,
  (f) => `Quel budget prévoir pour ${f.primary} ?`,
  (f) => `Combien investir en ${f.cat} ?`,
  (f) => `À combien s'élève le tarif de base pour ${f.primary} ?`,
  (f) => `Combien coûte une prestation de ${f.cat} ?`,
  (f) => `Quel prix pour ${f.primary} ?`,
  (f) => `Le budget type pour ${f.cat}, c'est combien ?`,
  (f) => `Faire ${f.primary} coûte combien ?`,
];

const FAQ_Q3_Q: ((f: FaqCtx) => string)[] = [
  (f) => `Quel est le délai pour ${f.primary} ?`,
  (f) => `Combien de temps pour ${f.primary} ?`,
  (f) => `Sous quel délai le livrable « ${f.shortP} » arrive-t-il ?`,
  (f) => `Combien de jours pour une prestation de ${f.cat} ?`,
  (f) => `Quel délai pour une commande de ${f.cat} ?`,
  (f) => `Quel temps de livraison pour ${f.primary} ?`,
  (f) => `Faut-il compter en jours ou en semaines pour ${f.cat} ?`,
  (f) => `${firstUpper(f.primary)} : livré en combien de temps ?`,
  (f) => `Le délai constaté en ${f.cat}, c'est quoi ?`,
];

const FAQ_Q5_Q: ((f: FaqCtx) => string)[] = [
  (f) => `Et si le résultat d'une prestation de ${f.cat} déçoit ?`,
  (f) => `Et si le résultat de « ${f.shortP} » ne me convient pas ?`,
  (f) => `Quelles garanties si « ${f.shortP} » déçoit ?`,
  (f) => `Peut-on demander des retouches après une livraison de ${f.cat} ?`,
  (f) => `Que se passe-t-il si « ${f.primary} » ne me satisfait pas ?`,
  (f) => `Quelles garanties encadrent une commande de ${f.cat} ?`,
  (f) => `Mon paiement pour ${f.primary} est protégé comment ?`,
  (f) => `En cas de problème sur une commande de ${f.cat}, comment suis-je protégé ?`,
  (f) => `Si « ${f.shortP} » tombe court, quel recours ?`,
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  9. Process, features, deliverables — reconstruits avec le contexte réel
 * ═══════════════════════════════════════════════════════════════════════════ */

const PROCESS_TITLES: string[][] = [
  ["Commande et brief", "Votre commande et vos consignes", "Brief et cadrage du besoin", "Prise de commande et consignes",
   "Commande et éléments reçus", "Le brief de départ", "Votre brief, la commande suivie", "Prise de brief et cadrage",
   "Commander et transmettre", "Cadrage et lancement", "Le départ : commande et brief", "Réception de votre commande"],
  ["Production du livrable", "Collecte et traitement", "Le travail de fond", "Constitution des données",
   "Le cœur du travail", "Collecte et production", "Fabrication du livrable", "Le chantier principal",
   "Traitement et assemblage", "Production en atelier", "Le gros du travail", "Réalisation du livrable"],
  ["Contrôle qualité", "Vérification avant envoi", "Passage au contrôle qualité", "Relecture et vérifications",
   "Le contrôle avant expédition", "Vérification du livrable", "Contrôle et relecture", "La vérification finale",
   "Passage en revue", "Contrôle systématique", "Relecture avant envoi", "La revue qualité"],
  ["Livraison et suivi", "Remise du livrable", "Livraison et ajustements", "Envoi final et accompagnement",
   "Livraison et retouches", "La remise finale", "Envoi et suivi", "Livraison, puis suivi",
   "La livraison et la suite", "Remise et accompagnement", "Le livrable arrive", "Envoi du livrable et suivi"],
];

/** Intros de l'étape 1 (les consignes du service suivent le deux-points). */
const PROCESS_STEP1_LEADS: string[] = [
  "Vous sélectionnez vos options et transmettez vos consignes",
  "Vous choisissez vos options et envoyez vos consignes",
  "Commandez, puis transmettez votre brief",
  "Le paiement enregistré, vous transmettez vos éléments",
  "Vous réservez l'offre et livrez votre brief",
  "Après le paiement, vous précisez votre besoin",
  "La commande passée, vous envoyez vos consignes",
  "Vous commandez et transmettez d'un seul tenant vos éléments",
];

/** Fins d'étape 1 : réactivité réelle du vendeur (« répond en moins de N h »). */
const PROCESS_RT_TAILS: ((rt: string, ventes: string) => string)[] = [
  (rt, v) => `Le vendeur ${rt} en moyenne, sur les ${v} commandes déjà livrées.`,
  (rt) => `En moyenne, le vendeur ${rt}.`,
  (rt) => `Comptez sur un interlocuteur qui ${rt}.`,
  (rt, v) => `Une question ? Le vendeur ${rt} en moyenne (constat sur ${v} commandes).`,
  (rt, v) => `Réactivité vendeur : il ${rt} en moyenne (constat sur ${v} commandes).`,
  (rt) => `Le prestataire ${rt} à chaque demande.`,
  (rt, v) => `Côté réactivité, le vendeur ${rt}, ${v} commandes passées comprises.`,
  (rt, v) => `D'expérience, le vendeur ${rt} (sur ${v} commandes, toutes fiches confondues).`,
  (rt) => `La première réponse tombe vite : le vendeur ${rt}.`,
  (rt, v) => `Question, doute, précision : le vendeur ${rt} (${v} commandes en attestent).`,
  (rt, v) => `Sur cette fiche, le vendeur ${rt} en moyenne (${v} commandes déjà livrées).`,
  (rt) => `Réactivité constatée : le vendeur ${rt}, à chaque demande.`,
];

/** Noms de « matière première » par pôle (étapes 2 et 3). */
const POLE_NOUNS: Record<string, string> = {
  "ia-rag-data": "les corpus et les fichiers de connaissances",
  "ecommerce-pricing": "les relevés de prix, stocks et promotions",
  "b2b-sales-intelligence": "les listes d'entreprises et leurs signaux",
  "immobilier-local": "les données immobilières et territoriales",
  "social-media-influence": "les profils, les créateurs et leurs audiences",
  "rh-recrutement": "les données RH et les offres d'emploi",
  "evenementiel-marches-publics": "les appels d'offres, exposants et attributions",
  "grand-public": "les données comparatives et les sources publiques",
  "hotellerie-tourisme": "les relevés tarifaires et les données d'établissement",
  "grandes-entreprises": "les vérifications réglementaires et les données fournisseurs",
  "saas-tech": "les données produits, avis et grilles tarifaires",
  "seo-geo-medias": "les requêtes, les sources et les contenus",
  "formation-sante": "les données formation et santé",
  "logistique-franchises": "les opportunités et les données de marché",
};

/** Points de contrôle par pôle (étape 3). */
const POLE_CHECKS: Record<string, string> = {
  "ia-rag-data": "structure des titres, encodage, complétude du texte, propreté du Markdown",
  "ecommerce-pricing": "dédoublonnage, fraîcheur des relevés, cohérence des prix, formatage",
  "b2b-sales-intelligence": "dédoublonnage, validité des coordonnées, fraîcheur des signaux, formatage",
  "immobilier-local": "fraîcheur des annonces, cohérence des adresses, complétude des champs, formatage",
  "social-media-influence": "authenticité des profils, calcul des ratios, fraîcheur, formatage",
  "rh-recrutement": "dédoublonnage, fraîcheur des offres, cohérence des données, formatage",
  "evenementiel-marches-publics": "numéros d'identification, fraîcheur des publications, cohérence, formatage",
  "grand-public": "chiffres recalculés, sources datées, cohérence des comparatifs, mise en page",
  "hotellerie-tourisme": "fraîcheur des relevés, exactitude des prix et menus, cohérence, formatage",
  "grandes-entreprises": "registres officiels, cohérence juridique, fraîcheur des sources, formatage",
  "saas-tech": "exactitude des données produit, fraîcheur des avis, cohérence, formatage",
  "seo-geo-medias": "pertinence des requêtes, sources datées, cohérence des extraits, formatage",
  "formation-sante": "certifications, fraîcheur des données, cohérence des sources, formatage",
  "logistique-franchises": "sources officielles, fraîcheur des opportunités, cohérence, formatage",
};

/** Étape 2 — 10 gabarits × nom de pôle. */
const PROCESS_STEP2: ((noun: string) => string)[] = [
  (n) => `Le vendeur mobilise ses sources et ses outils pour constituer ${n} du périmètre convenu.`,
  (n) => `Le travail de fond commence : collecter, fiabiliser et mettre en forme ${n}.`,
  (n) => `${firstUpper(n)} font l'objet d'une collecte puis d'une vérification, dans le périmètre convenu.`,
  (n) => `Vient ensuite le cœur du métier : constituer ${n}, à partir des sources convenues.`,
  (n) => `Sur cette étape, l'expert collecte et traite ${n}.`,
  (n) => `Le vendeur assemble ${n}, en respectant le périmètre convenu.`,
  (n) => `Ici se joue l'essentiel : collecter puis traiter ${n}.`,
  (n) => `Les sources sont mobilisées une à une pour produire ${n}.`,
  (n) => `L'expert met la main à la pâte : ${n} se constituent source par source.`,
  (n) => `Le périmètre convenu se couvre intégralement : l'objectif est de produire ${n}.`,
];

/** Étape 3 — 8 gabarits × points de contrôle par pôle (phrase unique variable). */
const PROCESS_STEP3: ((checks: string) => string)[] = [
  (c) => `Chaque élément est vérifié : ${c}, et rien ne part avant ce contrôle.`,
  (c) => `Contrôle systématique avant envoi : ${c}.`,
  (c) => `La vérification porte sur ${c}, avec un dernier regard avant l'envoi.`,
  (c) => `Avant l'envoi, tout passe au crible : ${c}.`,
  (c) => `Rien n'est expédié sans vérification préalable : ${c}.`,
  (c) => `Le contrôle qualité couvre ${c}, juste avant l'envoi.`,
  (c) => `Avant expédition, le contrôle passe sur ${c}, sans exception.`,
  (c) => `La revue avant envoi couvre ${c}, point par point.`,
];

/** Étape 4 — 8 gabarits × délai + ventes/avis (chaque phrase porte une variable). */
const PROCESS_STEP4: ((delai: string, ventes: string, avis: string) => string)[] = [
  (d, v) => `Vous recevez le livrable en ${d} avec son guide de lecture, et disposez de 7 jours d'ajustements inclus (le circuit des ${v} commandes déjà livrées).`,
  (d, v) => `Livraison en ${d}, constatée sur les ${v} commandes déjà passées : le livrable arrive avec son guide d'une page, et 7 jours de suivi restent inclus.`,
  (d, _v, a) => `En ${d}, vous êtes livré : guide de lecture d'une page inclus, retouches possibles pendant 7 jours (${a} avis vérifiés).`,
  (d, v) => `Le livrable arrive en ${d} avec son guide de lecture ; les retouches restent possibles 7 jours après réception, comme pour les ${v} commandes précédentes.`,
  (d, v) => `${firstUpper(d)} après le contrôle qualité, comme sur les ${v} commandes précédentes : livraison, guide d'une page, puis 7 jours d'ajustements si besoin.`,
  (d, _v, a) => `Tout arrive en ${d} : le livrable vérifié, son guide de lecture, et 7 jours pour affiner le résultat (${a} avis en témoignent).`,
  (d, _v, a) => `Comptez ${d} pour recevoir le livrable final et son guide ; les ${a} avis vérifiés couvrent cette promesse, et les ajustements courent 7 jours.`,
  (d, v) => `La remise a lieu en ${d}, guide de lecture à l'appui, et les ajustements inclus courent 7 jours, comme pour les ${v} commandes déjà traitées.`,
];

/** Livrable principal par pôle (2 variantes × habillage → cohérence + unicité). */
const POLE_DELIV_MAIN: Record<string, string[]> = {
  "ia-rag-data": [
    "fichiers Markdown, JSONL ou CSV selon le format convenu, testés et documentés",
    "fichiers au format convenu (Markdown, JSONL ou CSV), testés et documentés",
  ],
  "ecommerce-pricing": [
    "tableau Google Sheets / Excel des relevés, filtrable et prêt à l'emploi",
    "tableau des relevés (Google Sheets / Excel), filtrable et prêt à l'emploi",
  ],
  "b2b-sales-intelligence": [
    "fichier CSV / Sheets des entreprises ciblées, dédoublonné et filtrable",
    "fichier des entreprises ciblées (CSV / Sheets), dédoublonné et filtrable",
  ],
  "immobilier-local": [
    "fichier des biens, prospects ou données territoriales (CSV / Sheets), filtrable",
    "fichier (CSV / Sheets) des biens, prospects ou données territoriales, filtrable",
  ],
  "social-media-influence": [
    "fichier des profils ou créateurs (CSV / Sheets), dédoublonné et filtrable",
    "fichier (CSV / Sheets) des profils ou créateurs, dédoublonné et filtrable",
  ],
  "rh-recrutement": [
    "fichier des offres, candidats ou données RH (CSV / Sheets), filtrable",
    "fichier (CSV / Sheets) des offres, candidats ou données RH, filtrable",
  ],
  "evenementiel-marches-publics": [
    "fichier des appels d'offres, exposants ou attributions (CSV / Sheets), filtrable",
    "fichier (CSV / Sheets) des appels d'offres, exposants ou attributions, filtrable",
  ],
  "grand-public": [
    "comparatif chiffré des options étudiées, prêt à arbitrer",
    "comparatif des options étudiées, chiffré et prêt à arbitrer",
  ],
  "hotellerie-tourisme": [
    "fichier des relevés et note de synthèse, prêts à exploiter",
    "relevés et note de synthèse (fichier joint), prêts à exploiter",
  ],
  "grandes-entreprises": [
    "dossier de vérification et note de synthèse, conclusions actionnables",
    "note de synthèse et dossier de vérification, conclusions actionnables",
  ],
  "saas-tech": [
    "fichier des données produits et synthèse commentée, prêts à exploiter",
    "synthèse commentée et fichier des données produits, prêts à exploiter",
  ],
  "seo-geo-medias": [
    "dataset ou document finalisé selon la fiche, prêt à diffuser",
    "document ou dataset finalisé selon la fiche, prêt à diffuser",
  ],
  "formation-sante": [
    "fichier des organismes, études ou sources vérifiées, prêt à exploiter",
    "sources vérifiées et fichier des organismes ou études, prêt à exploiter",
  ],
  "logistique-franchises": [
    "fichier des opportunités et données de marché, sources datées",
    "données de marché et fichier des opportunités, sources datées",
  ],
};

const POLE_DELIV_FLAT = Object.values(POLE_DELIV_MAIN).flat();

/** Habillages du livrable principal (8 × 14 pôles → combinaisons uniques). */
const DELIV_WRAPPERS: ((noun: string) => string)[] = [
  (n) => `${firstUpper(n)}`,
  (n) => `Livrable principal : ${n}`,
  (n) => `${n} (vérification avant envoi incluse)`,
  (n) => `Livrable principal, prêt à l'emploi : ${n}`,
  (n) => `${n}, pour un usage immédiat`,
  (n) => `${firstUpper(n)} : le cœur de la commande`,
  (n) => `Ce que vous recevez : ${n}`,
  (n) => `${n}, prêt à exploiter dès réception`,
];

/** Guides de lecture par pôle (6 gabarits × 14 noms). */
const POLE_GUIDE_NOUNS: Record<string, string[]> = {
  "ia-rag-data": ["fichiers livrés", "corpus et fichiers"],
  "ecommerce-pricing": ["relevés et tableaux", "relevés de prix et tableaux"],
  "b2b-sales-intelligence": ["listes et fichiers", "listes d'entreprises"],
  "immobilier-local": ["fiches et fichiers", "fiches de biens et fichiers"],
  "social-media-influence": ["profils et listes", "profils de créateurs"],
  "rh-recrutement": ["listes et grilles", "listes RH et grilles"],
  "evenementiel-marches-publics": ["listes et veilles", "listes de consultations"],
  "grand-public": ["comparatifs", "comparatifs chiffrés"],
  "hotellerie-tourisme": ["relevés et menus", "relevés et cartes"],
  "grandes-entreprises": ["dossiers de vérification", "dossiers et notes"],
  "saas-tech": ["fichiers et synthèses", "fichiers produits et synthèses"],
  "seo-geo-medias": ["datasets et documents", "datasets et extraits"],
  "formation-sante": ["listes et études", "listes et bibliographies"],
  "logistique-franchises": ["fichiers d'opportunités", "fichiers et flux d'opportunités"],
};

const DELIVERABLES_GUIDE: ((g: string) => string)[] = [
  (g) => `Guide de lecture des ${g} (1 page), pour un usage immédiat`,
  (g) => `Mode d'emploi d'une page, calé sur vos ${g}`,
  (g) => `Note de lecture (1 page) : comment exploiter vos ${g}`,
  (g) => `Une page d'instructions pour prendre en main vos ${g}`,
  (g) => `Guide d'une page pour lire et trier vos ${g}`,
  (g) => `Note d'utilisation (une page) couvrant vos ${g}`,
  (g) => `Une page pour repérer, dans vos ${g}, ce qui compte`,
  (g) => `Guide d'une page : vos ${g}, lus en cinq minutes`,
];

/** Suivi post-livraison (9 gabarits × temps de réponse réel + pôle). */
const DELIVERABLES_SUPPORT: ((rt: string, poleLabel: string) => string)[] = [
  (rt) => `7 jours de suivi après livraison, avec un support qui ${rt}`,
  (rt, pl) => `Accès au support pendant 7 jours, sur tout le pôle ${pl} (le vendeur ${rt})`,
  (rt, pl) => `Support b2bpro.store joignable 7 jours après la livraison sur le pôle ${pl}, ${rt}`,
  (rt, pl) => `Suivi inclus 7 jours après livraison, pôle ${pl} compris ; le support ${rt}`,
  (rt, pl) => `7 jours de support après la livraison (pôle ${pl}), pendant lesquels le vendeur ${rt}`,
  (rt) => `Réponses pendant 7 jours après livraison : le vendeur ${rt}`,
  (rt, pl) => `7 jours de suivi après la livraison, sur le pôle ${pl}, pendant lesquels le vendeur ${rt}`,
  (rt, pl) => `Support accessible 7 jours après livraison (pôle ${pl} ; le vendeur ${rt})`,
  (rt) => `Accompagnement de 7 jours après livraison : le vendeur ${rt}`,
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  10. Décomposition de la description actuelle
 * ═══════════════════════════════════════════════════════════════════════════ */

const LEGACY_TITLES = [
  "Pourquoi ce service est décisif pour votre entreprise",
  "Ce que vous recevez concrètement",
  "Votre avantage concurrentiel",
  "Pourquoi commander ce service sur b2bpro.store ?",
];

const EXPERTISE_PREFIXES = [
  "Sur ce type de mission, l'expert mobilise",
  "Les compétences en jeu :",
  "Ici, l'expert intervient en matière de",
  "Deux domaines structurent",
  "Sur ce dossier, l'expertise attendue couvre",
  "L'expertise attendue sur ce dossier :",
  "Expertise mobilisée :",
  "Le savoir-faire derrière le livrable :",
  "Deux savoir-faire portent la prestation :",
  "Le profil engagé sur la commande :",
];

const GEO_PREFIXES = [
  "Chaque commande passe par le paiement séquestré",
  "Chaque commande passée ici suit le paiement séquestré",
  "Ici, votre paiement reste bloqué",
  "Le vendeur n'est payé qu'après votre feu vert",
  "Paiement séquestré jusqu'à validation",
  "Séquestre du paiement jusqu'à validation",
  "Paiement séquestré, livrable contrôlé",
  "Aucun livrable ne part sans contrôle qualité",
  "Votre validation commande tout",
  "Rien n'est expédié sans contrôle",
  "Le paiement reste sous séquestre",
  "Le paiement part après votre validation",
  "Achat protégé de bout en bout",
  "Votre commande bénéficie du séquestre",
  "Le circuit est verrouillé",
];

function splitSections(md: string): { title: string; body: string }[] {
  const re = /^##\s+(.+)$/gm;
  const offsets: { title: string; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) offsets.push({ title: m[1].trim(), end: re.lastIndex });
  return offsets.map((o, i) => ({
    title: o.title,
    body: md
      .slice(o.end, i + 1 < offsets.length ? md.indexOf(`## `, o.end) : md.length)
      .trim(),
  }));
}

/** Un paragraphe est-il du bourrage legacy ou issu de nos pools (idempotence) ? */
function isGeneratedOrStuffing(p: string): boolean {
  const t = p.trim();
  if (t.includes("s'appuie sur :")) return true;
  if (t.includes("Toutes les commandes b2bpro.store bénéficient")) return true;
  if (t.includes("Ce service de ")) return true;
  if (EXPERTISE_PREFIXES.some((x) => t.startsWith(x))) return true;
  if (GEO_PREFIXES.some((x) => t.startsWith(x))) return true;
  if (/ mobilise ici .* et .*, avec vérification du livrable avant chaque envoi\.$/.test(t)) return true;
  if (/^(Le prestataire) mobilise ici /.test(t)) return true;
  return false;
}

interface Decomposed {
  intro: string;
  core: string;
  closing: string;
}

/**
 * Décompose une description en intro / cœur / closing.
 * Trois formats d'entrée gérés :
 *  1. legacy optimisé (4 H2 connus, pipeline v1.4) ;
 *  2. humanisé v1/v2 (accroche + 4 sections ##) : la section 1 fournit l'intro,
 *     la section 2 le cœur, la section 3 le closing filtré (expertise/géo pools
 *     retirés), la section garanties est reconstruite intégralement, et
 *     l'accroche comme les titres H2 précédents ne sont jamais conservés ;
 *  3. description brute du catalogue (aucun H2) — heuristique historique.
 */
function decompose(md: string): Decomposed {
  const sections = splitSections(md);
  const byLegacy = new Map<string, string>();
  let legacyFound = 0;
  for (const s of sections) {
    if (LEGACY_TITLES.includes(s.title)) {
      byLegacy.set(s.title, s.body);
      legacyFound++;
    }
  }
  if (legacyFound >= 3) {
    const closing = (byLegacy.get(LEGACY_TITLES[2]) ?? "")
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !isGeneratedOrStuffing(p))
      .join("\n\n");
    return {
      intro: byLegacy.get(LEGACY_TITLES[0]) ?? "",
      core: byLegacy.get(LEGACY_TITLES[1]) ?? "",
      closing,
    };
  }

  // format humanisé v1/v2 : au moins 3 sections « ## » non legacy
  if (sections.length >= 3) {
    const stripHeadings = (body: string) =>
      body
        .split("\n")
        .filter((l) => !/^#{1,3}\s/.test(l))
        .join("\n")
        .trim();
    const intro = stripHeadings(sections[0].body);
    const core = stripHeadings(sections[1].body);
    const closing = sections[2].body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !isGeneratedOrStuffing(p))
      .join("\n\n");
    return { intro, core, closing };
  }

  // description brute (aucun H2 legacy) : même heuristique que l'ancien pipeline
  const blocks = md
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  const isBullets = (b: string) =>
    b
      .split("\n")
      .filter((l) => l.trim())
      .every((l) => /^[✓✔•-]/.test(l.trim()));
  const isPour = (b: string) => /^pour\s+\d[\d\s.,]*\s*€/i.test(b.trim());
  const intro: string[] = [];
  const core: string[] = [];
  const closing: string[] = [];
  let mode: "intro" | "core" | "closing" = "intro";
  for (const b of blocks) {
    if (mode === "intro" && (isPour(b) || isBullets(b))) mode = "core";
    else if (mode === "core" && core.length > 0 && !isBullets(b) && !isPour(b)) mode = "closing";
    if (mode === "intro") intro.push(b);
    else if (mode === "core") core.push(b);
    else closing.push(b);
  }
  if (core.length === 0 && intro.length > 0) core.push(intro.pop() as string);
  return {
    intro: intro.join("\n\n"),
    core: core.join("\n\n"),
    closing: closing.filter((p) => !isGeneratedOrStuffing(p)).join("\n\n"),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  11. humanizeDescription
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Paire de compétences réelles du vendeur (source des phrases d'expertise). */
function skillPair(ctx: HumanizeInput): [string, string] {
  const skills = (ctx.sellerSkills ?? []).map((s) => s.trim()).filter(Boolean);
  if (skills.length >= 2) {
    const n = skills.length;
    const i1 = rot(ctx.slug, "/sk1", n);
    let i2 = (i1 + 1 + rot(ctx.slug, "/sk2", Math.max(1, n - 1))) % n;
    if (i2 === i1) i2 = (i1 + 1) % n;
    return [skills[i1], skills[i2]];
  }
  const cat = categoryKeyword(ctx.category);
  return [cat, kwCase(ctx.poleLabel)];
}

export function humanizeDescription(desc: string, ctx: HumanizeInput, kw: ServiceKeywords): string {
  const { intro, core, closing } = decompose(desc);

  const days = ctx.deliveryDays;
  const delai = `${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}`;
  const note = ctx.rating.toString().replace(".", ",");
  const accrocheCtx: AccrocheCtx = {
    primary: kw.primary,
    prix: `${ctx.basePrice}`,
    delai,
    note,
    avis: `${ctx.reviewsCount}`,
    ventes: `${ctx.salesCount}`,
  };
  const gCtx: GuaranteeCtx = {
    ventes: accrocheCtx.ventes,
    avis: accrocheCtx.avis,
    delai,
    prix: `${ctx.basePrice}`,
    poleLabel: ctx.poleLabel,
  };
  const rt = ctx.sellerResponseTime?.trim() || "répond en moins de 2 h";
  const s4Ctx: Slot4Ctx = {
    note,
    avis: accrocheCtx.avis,
    ventes: accrocheCtx.ventes,
    delai,
    prix: `${ctx.basePrice}`,
    poleLabel: ctx.poleLabel,
    rt,
    shortP: shortPhrase(kw.primary, 40),
    cat: categoryProse(ctx.category),
  };

  // accroche (rotation par hash du slug) + combinaison de 2 garanties
  const accroche =
    ACCROCHES[rot(ctx.slug, "/a", ACCROCHES.length)](accrocheCtx) +
    " " +
    GUARANTEE_COMBOS[rot(ctx.slug, "/g", GUARANTEE_COMBOS.length)](gCtx);

  // titres H2 (un pool par slot — paramétrés par primaire/catégorie/prix/délai)
  const h2Ctx: H2Ctx = {
    primary: kw.primary,
    shortP: shortPhrase(kw.primary, 40),
    cat: categoryProse(ctx.category),
    prix: `${ctx.basePrice}`,
    delai,
    poleLabel: ctx.poleLabel,
  };
  const t1 = H2_SLOT1[rot(ctx.slug, "/h1", H2_SLOT1.length)](h2Ctx);
  const t2 = H2_SLOT2[rot(ctx.slug, "/h2", H2_SLOT2.length)](h2Ctx);
  const t3 = H2_SLOT3[rot(ctx.slug, "/h3", H2_SLOT3.length)](h2Ctx);
  const t4 = H2_SLOT4[rot(ctx.slug, "/h4", H2_SLOT4.length)](h2Ctx);

  // section 3 : closing conservé + phrase d'expertise (skills réels du vendeur)
  const [sk1, sk2] = skillPair(ctx);
  const expertise = EXPERTISE[rot(ctx.slug, "/e", EXPERTISE.length)](
    sk1,
    sk2,
    ctx.sellerName
  );
  const geo = GEO_GUARANTEES[rot(ctx.slug, "/geo", GEO_GUARANTEES.length)]({
    ...gCtx,
    countryLabel: ctx.sellerCountryLabel?.trim() || "France",
  });
  const slot3Body = [cleanKeptText(closing), expertise, geo].filter(Boolean).join("\n\n");

  // section 4 : intro courte + 5 puces réécrites (chiffres réels)
  const fNote = SLOT4_NOTE[rot(ctx.slug, "/fn", SLOT4_NOTE.length)](s4Ctx);
  const fPaiement = FEATURES_PAIEMENT[rot(ctx.slug, "/fp", FEATURES_PAIEMENT.length)](s4Ctx);
  const fLivraison = FEATURES_LIVRAISON[rot(ctx.slug, "/fl", FEATURES_LIVRAISON.length)](s4Ctx);
  const fAjust = FEATURES_AJUSTEMENTS[rot(ctx.slug, "/fa", FEATURES_AJUSTEMENTS.length)](s4Ctx);
  const fSupport = SLOT4_SUPPORT[rot(ctx.slug, "/fs", SLOT4_SUPPORT.length)](s4Ctx);
  const slot4Intro = SLOT4_INTROS[rot(ctx.slug, "/i4", SLOT4_INTROS.length)](s4Ctx);
  const slot4Body = [fNote, fPaiement, fLivraison, fAjust, fSupport]
    .map((b) => `- ${b}`)
    .join("\n");

  const parts: string[] = [accroche];
  if (intro.trim()) parts.push(`## ${t1}\n\n${cleanKeptText(intro)}`);
  else parts.push(`## ${t1}\n\n${expertise}`);
  parts.push(`## ${t2}\n\n${cleanKeptText(core)}`);
  parts.push(`## ${t3}\n\n${slot3Body}`);
  parts.push(`## ${t4}\n\n${slot4Intro}\n${slot4Body}`);
  return parts.join("\n\n");
}

function overlapTokens(a: string, b: string): number {
  const ta = new Set(normTokens(a));
  return normTokens(b).filter((t) => ta.has(t)).length;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  12. humanizeShortDesc
 * ═══════════════════════════════════════════════════════════════════════════ */

export function humanizeShortDesc(ctx: HumanizeInput, kw: ServiceKeywords): string {
  const days = ctx.deliveryDays;
  const c: AccrocheCtx = {
    primary: kw.primary,
    prix: `${ctx.basePrice}`,
    delai: `${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}`,
    note: ctx.rating.toString().replace(".", ","),
    avis: `${ctx.reviewsCount}`,
    ventes: `${ctx.salesCount}`,
  };
  const start = rot(ctx.slug, "/sd", SHORTDESCS.length);
  const candidates: string[] = [];
  for (let i = 0; i < SHORTDESCS.length; i++) {
    candidates.push(SHORTDESCS[(start + i) % SHORTDESCS.length](c));
  }
  // première variante qui respecte le standard 100-230 car., sans troncature
  const fit = candidates.find((s) => s.length >= 100 && s.length <= 230);
  let out = fit ?? candidates[candidates.length - 1];
  if (out.length > 230) {
    out = `${firstUpper(kw.primary)} dès ${c.prix} €, livré en ${c.delai}, par un expert noté ${c.note}/5 (${c.avis} avis).`;
  }
  if (out.length < 100) {
    out = `${out} Paiement séquestré et ajustements inclus.`.replace(/\.\s+\p{Lu}/u, (m) => m.toLowerCase());
    out = out.replace(/\s+/g, " ").trim();
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  13. humanizeFaq
 * ═══════════════════════════════════════════════════════════════════════════ */

export function humanizeFaq(ctx: HumanizeInput, kw: ServiceKeywords, features: string[]): { q: string; a: string }[] {
  const days = ctx.deliveryDays;
  const delai = `${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}`;
  const note = ctx.rating.toString().replace(".", ",");
  const avis = `${ctx.reviewsCount}`;
  const ventes = `${ctx.salesCount}`;
  const prix = `${ctx.basePrice}`;
  const faqCtx: FaqCtx = {
    primary: kw.primary,
    shortP: shortPhrase(kw.primary, 40),
    cat: categoryProse(ctx.category),
  };

  // extraits réels des points forts spécifiques (pour Q1) — minuscule initiale
  const specific = features.filter((f) => !isTemplateFeature(f));
  const f1 = lowerFirstPhrase((specific[0] ?? kw.primary).replace(/\.$/, ""));
  let f2 = lowerFirstPhrase((specific[1] ?? "").replace(/\.$/, ""));

  // phrase options (réelles) pour Q2 — 3 cadres de phrase
  const opts = ctx.options.slice(0, 2);
  const optsFrames: ((n1: string, p1: number, n2: string, p2: number) => string)[] = [
    (n1: string, p1: number, n2: string, p2: number) =>
      ` Les options les plus demandées : « ${n1} » (+${p1} €) et « ${n2} » (+${p2} €).`,
    (n1: string, p1: number, n2: string, p2: number) =>
      ` En option : « ${n1} » (+${p1} €) et « ${n2} » (+${p2} €).`,
    (n1: string, p1: number, n2: string, p2: number) =>
      ` Les compléments les plus choisis : « ${n1} » (+${p1} €) et « ${n2} » (+${p2} €).`,
  ];
  const optsSentence =
    opts.length >= 2
      ? optsFrames[rot(ctx.slug, "/of", optsFrames.length)](opts[0].name, opts[0].priceExtra, opts[1].name, opts[1].priceExtra)
      : opts.length === 1
        ? ` L'option la plus demandée : « ${opts[0].name} » (+${opts[0].priceExtra} €).`
        : ` Aucun frais caché : le prix affiché est celui que vous payez.`;

  // contexte de pôle pour Q5 — 6 cadres × paires de services rotatives
  const others = Math.max(ctx.poleCount - 1, 0);
  const sib = ctx.siblingTitles.filter(Boolean);
  const pair = (n: number): [string, string] => {
    if (sib.length >= 2) {
      const a = n % sib.length;
      let b = (a + 1 + Math.floor(n / sib.length)) % sib.length;
      if (b === a) b = (a + 1) % sib.length;
      return [sib[a], sib[b]];
    }
    return [sib[0] ?? kw.primary, sib[1] ?? kw.primary];
  };
  const poleCtxFrames: ((sibA: string, sibB: string) => string)[] = [
    (a, b) => `Le pôle ${ctx.poleLabel} regroupe ${others} autres services, comme « ${a} » ou « ${b} ».`,
    (a, b) => `Autres pistes sur le pôle ${ctx.poleLabel} : « ${a} » ou « ${b} », parmi ${others} services.`,
    (a, b) => `Sur le même pôle ${ctx.poleLabel}, ${others} autres services attendent, dont « ${a} » et « ${b} ».`,
    (a, b) => `Pour élargir : « ${a} » et « ${b} », deux des ${others} autres services du pôle ${ctx.poleLabel}.`,
    (a, b) => `Le pôle ${ctx.poleLabel} compte ${others} autres services ; « ${a} » et « ${b} » complètent souvent la commande.`,
    (a, b) => `Et si le besoin va plus loin : ${others} autres services sur le pôle ${ctx.poleLabel}, comme « ${a} » ou « ${b} ».`,
  ];
  const [sibA, sibB] = pair(rot(ctx.slug, "/sp", Math.max(1, sib.length * 2)));
  const poleCtx = poleCtxFrames[rot(ctx.slug, "/pc", poleCtxFrames.length)](sibA, sibB);

  const q1a: string[] = [
    `Pour ${prix} €, l'offre de base comprend : ${f1} ; ${f2}. Le tout livré en ${delai} par un expert noté ${note}/5 (${avis} avis).`,
    `Concrètement : ${f1}, et ${f2}. Comptez ${delai} et ${prix} € pour l'offre de départ, ajustements inclus jusqu'à validation.`,
    `Le cœur de la prestation : ${f1}, plus ${f2}. Tarif de base ${prix} €, délai ${delai}, prestataire noté ${note}/5 sur ${avis} avis.`,
    `Ce que couvre ${prix} € : ${f1}, ${f2}. Livraison en ${delai}, note du prestataire ${note}/5 (${avis} avis).`,
    `L'offre de base pose ${f1}, complétée par ${f2}. Vous payez ${prix} € et recevez en ${delai}, d'un expert à ${note}/5 sur ${avis} avis.`,
    `Deux points d'entrée : ${f1} ; ${f2}. Le tout à ${prix} €, en ${delai}, signé par un expert noté ${note}/5 (${avis} avis).`,
  ];
  if (!f2) {
    for (let i = 0; i < q1a.length; i++) {
      q1a[i] = q1a[i].replace(/ ; \./, " ").replace(/, et \./, " ").replace(/, plus \./, ".").replace(/, \./, ".").replace(/ ; \./, ".");
    }
  }

  const q2a: string[] = [
    `L'offre de base est à ${prix} €, tarif ferme et sans frais caché : vous payez à la commande, le montant restant séquestré jusqu'à votre feu vert — le vendeur ne touche rien avant votre validation du livrable.${optsSentence}`,
    `Comptez ${prix} € pour l'offre de départ. Le paiement est mis en séquestre et n'est libéré qu'après votre validation du livrable, comme pour les ${ventes} commandes déjà passées.${optsSentence}`,
    `Le tarif de base s'établit à ${prix} €, options non comprises.${optsSentence}`,
    `Pour ${prix} €, le socle est ferme : pas de frais caché, le solde reste sous séquestre jusqu'à votre validation.${optsSentence}`,
    `Le prix affiché, ${prix} €, est celui que vous payez : le vendeur ne touche rien avant votre feu vert (${avis} avis vérifiés).${optsSentence}`,
    `Base tarifaire : ${prix} €. Le paiement se fait à la commande et n'est transmis au vendeur qu'après validation du livrable, règle appliquée sur les ${ventes} commandes déjà livrées.${optsSentence}`,
  ];

  const q3a: string[] = [
    `Le délai affiché est de ${delai}, à compter de la réception de vos consignes complètes. La plateforme affiche 98,6 % de livraisons à l'heure : le vendeur s'engage sur ce planning.`,
    `Comptez ${delai} une fois vos consignes transmises. Le taux de livraisons à l'heure constaté sur la plateforme est de 98,6 %, et le planning affiché engage le vendeur.`,
    `${firstUpper(delai)} après vos consignes complètes, pas de surprise : le délai affiché sur la fiche est celui que le vendeur s'engage à tenir, avec 98,6 % de ponctualité constatée.`,
    `Votre commande de ${delai} démarre à la réception des consignes complètes ; 98,6 % des livraisons se font à l'heure, et les ${ventes} commandes déjà livrées en témoignent.`,
    `Délai annoncé : ${delai}, sur la base des 98,6 % de ponctualité constatée (${avis} avis vérifiés).`,
    `Entre vos consignes complètes et la livraison, comptez ${delai} ; le vendeur répond de ce planning, la plateforme enregistrant 98,6 % de livraisons à l'heure.`,
  ];

  const core = stripJeVais(ctx.title);
  const q4q = `Comment ${core} ?`;
  const q4a: string[] = [
    `La marche à suivre tient en trois temps : commande, consignes, puis travail de l'expert. Comptez ${delai}, ${prix} € en offre de base, et un interlocuteur noté ${note}/5 (${avis} avis clients).`,
    `Rien de compliqué : vous commandez, vous transmettez vos consignes, puis l'expert prend le relais. Le livrable arrive en ${delai} ; l'offre de base coûte ${prix} € et les retouches sont incluses.`,
    `Vous passez commande et précisez votre besoin ; l'expert fait le reste. Délai constaté : ${delai}, tarif de départ ${prix} €, prestataire noté ${note}/5 sur ${avis} avis.`,
    `Commande, consignes, exécution : trois temps, aucun à votre charge. Le résultat arrive en ${delai}, pour ${prix} € en base, porté par un expert à ${note}/5 (${avis} avis).`,
    `Vous payez, vous briefez, vous validez : le reste s'exécute en ${delai}. Offre de base à ${prix} €, ajustements inclus, expert noté ${note}/5 sur ${avis} avis.`,
    `Un circuit simple : sélection des options, consignes, puis validation du livrable livré en ${delai}. Comptez ${prix} € en base, et un prestataire noté ${note}/5 (${avis} avis).`,
  ];

  const q5a: string[] = [
    `Vous ne validez qu'en étant satisfait : le paiement reste séquestré, les ajustements sont inclus jusqu'à validation complète et le suivi court 7 jours après la livraison. ${poleCtx}`,
    `Rien ne se débloque sans votre feu vert : le vendeur est payé après validation, les retouches sont incluses et vous gardez 7 jours de suivi après livraison. ${poleCtx}`,
    `Deux filets de sécurité : le paiement séquestré, libéré seulement après votre validation, et les ajustements inclus jusqu'à satisfaction, suivis 7 jours après livraison. ${poleCtx}`,
    `La validation vous appartient, le risque nous appartient : paiement bloqué, retouches incluses, suivi de 7 jours après la livraison. ${poleCtx}`,
    `Si le livrable déçoit, vous ne payez pas : séquestre jusqu'à votre feu vert, retouches incluses, 7 jours de suivi. ${poleCtx}`,
    `Votre satisfait ou remboursé de fait : paiement séquestré, ajustements inclus jusqu'à validation, suivi de 7 jours. ${poleCtx}`,
  ];

  return [
    // [ADDITIF v1.9.0 — activateur GEO v1.7.0 n°4] La FAQ COMMENCE par la
    // question « comment… » intitulée comme l'utilisateur la pose (la Q4
    // historique passe en tête) — citée en priorité par les moteurs de réponse.
    { q: q4q, a: q4a[rot(ctx.slug, "/r4", q4a.length)] },
    { q: FAQ_Q1_Q[rot(ctx.slug, "/q1", FAQ_Q1_Q.length)](faqCtx), a: q1a[rot(ctx.slug, "/r1", q1a.length)] },
    { q: FAQ_Q2_Q[rot(ctx.slug, "/q2", FAQ_Q2_Q.length)](faqCtx), a: q2a[rot(ctx.slug, "/r2", q2a.length)] },
    { q: FAQ_Q3_Q[rot(ctx.slug, "/q3", FAQ_Q3_Q.length)](faqCtx), a: q3a[rot(ctx.slug, "/r3", q3a.length)] },
    { q: FAQ_Q5_Q[rot(ctx.slug, "/q5", FAQ_Q5_Q.length)](faqCtx), a: q5a[rot(ctx.slug, "/r5", q5a.length)] },
  ];
}

/** Une feature est-elle un gabarit plateforme (à réécrire) ? */
function isTemplateFeature(f: string): boolean {
  return (
    // legacy
    /^Paiement sécurisé : le vendeur n'est payé/i.test(f) ||
    /^Ajustements inclus jusqu'à validation complète/i.test(f) ||
    /^Livraison en \d+ jours ouvrés, taux de ponctualité/i.test(f) ||
    /^Retouches incluses jusqu'à satisfaction complète$/i.test(f) ||
    /^Ajustements possibles jusqu'à validation, sans supplément$/i.test(f) ||
    /^Demandes de retouche incluses avant validation finale$/i.test(f) ||
    /^Paiement séquestré : le vendeur n'est payé/i.test(f) ||
    /^Votre argent reste bloqué jusqu'à validation du livrable$/i.test(f) ||
    /^Vendeur rémunéré uniquement après votre feu vert$/i.test(f) ||
    // v2 — paiement
    /^(Paiement|Votre argent|Vendeur rémunéré|Aucun euro|Le paiement ne part|Le vendeur touche|Votre validation débloque)/i.test(f) ||
    // v2 — livraison (toutes portent 98,6 %)
    /98,6 ?%/.test(f) ||
    // v2 — ajustements
    /(retouches?|ajustements?|modifications?) inclus/i.test(f) ||
    /^Votre droit à la retouche/i.test(f) ||
    /^Ajustements sans supplément/i.test(f)
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  14. humanizeFeatures / humanizeDeliverables / humanizeProcess
 * ═══════════════════════════════════════════════════════════════════════════ */

export function humanizeFeatures(features: string[], ctx: HumanizeInput): string[] {
  const days = ctx.deliveryDays;
  const delai = `${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}`;
  const rt = ctx.sellerResponseTime?.trim() || "répond en moins de 2 h";
  const s4Ctx: Slot4Ctx = {
    note: ctx.rating.toString().replace(".", ","),
    avis: `${ctx.reviewsCount}`,
    ventes: `${ctx.salesCount}`,
    delai,
    prix: `${ctx.basePrice}`,
    poleLabel: ctx.poleLabel,
    rt,
    shortP: shortPhrase(cleanPrimary(ctx.title), 40),
    cat: categoryProse(ctx.category),
  };
  const out: string[] = [];
  for (const f of features) {
    if (/^Paiement sécurisé : le vendeur n'est payé/i.test(f)) {
      out.push(FEATURES_PAIEMENT[rot(ctx.slug, "/fp2", FEATURES_PAIEMENT.length)](s4Ctx));
    } else if (/^Ajustements inclus jusqu'à validation complète/i.test(f)) {
      out.push(FEATURES_AJUSTEMENTS[rot(ctx.slug, "/fa2", FEATURES_AJUSTEMENTS.length)](s4Ctx));
    } else if (/^Livraison en \d+ jours ouvrés, taux de ponctualité/i.test(f)) {
      out.push(FEATURES_LIVRAISON[rot(ctx.slug, "/fl2", FEATURES_LIVRAISON.length)](s4Ctx));
    } else if (isTemplateFeature(f) && out.length < 9) {
      // gabarits v1/v2 déjà en base : redistribués dans les pools v2 (idempotence)
      if (/98,6 ?%/.test(f)) {
        out.push(FEATURES_LIVRAISON[rot(ctx.slug, "/fl3", FEATURES_LIVRAISON.length)](s4Ctx));
      } else if (/(retouches?|ajustements?|modifications?)|droit à la retouche/i.test(f)) {
        out.push(FEATURES_AJUSTEMENTS[rot(ctx.slug, "/fa3", FEATURES_AJUSTEMENTS.length)](s4Ctx));
      } else {
        out.push(FEATURES_PAIEMENT[rot(ctx.slug, "/fp3", FEATURES_PAIEMENT.length)](s4Ctx));
      }
    } else {
      out.push(cleanLine(f).replace(/^- /, ""));
    }
  }
  return dedupeByNorm(out).slice(0, 9);
}

/** Un livrable est-il un gabarit générique (à reformuler) ? */
function isGenericDeliverable(d: string): boolean {
  const t = d.trim();
  if (
    /^Tableau Excel \/ Google Sheets structuré/i.test(t) ||
    /^Rapport d'analyse rédigé et mis en page/i.test(t) ||
    /^Fichier de données dédoublonné et vérifié/i.test(t) ||
    /^Fichiers de données au format demandé/i.test(t) ||
    /^Synthèse exécutive des enseignements clés/i.test(t) ||
    /^Guide de lecture du livrable/i.test(t) ||
    /^Une page de mode d'emploi/i.test(t) ||
    /^Note explicative d'une page/i.test(t) ||
    /^Accès au support/i.test(t) ||
    /^Support b2bpro\.store joignable/i.test(t) ||
    /^7 jours de suivi après livraison/i.test(t) ||
    /^7 jours de suivi après la livraison/i.test(t) ||
    /^Support accessible 7 jours/i.test(t) ||
    /^Accompagnement de 7 jours/i.test(t)
  ) {
    return true;
  }
  // sorties v2 (idempotence) : livrable principal par pôle ou ses habillages
  if (/^Livrable principal/i.test(t)) return true;
  if (/^Ce que vous recevez : /i.test(t) && POLE_DELIV_FLAT.some((n) => t.toLowerCase().includes(n.toLowerCase().slice(0, 24)))) return true;
  if (POLE_DELIV_FLAT.some((n) => t.toLowerCase().includes(n.toLowerCase().slice(0, 24)))) return true;
  if (/ (vérification avant envoi incluse|pour un usage immédiat|prêt à exploiter dès réception)$/.test(t) && POLE_DELIV_FLAT.some((n) => t.toLowerCase().includes(n.toLowerCase().slice(0, 24)))) return true;
  if (/^(Guide|Mode) d'(une page|emploi)|^Note (de lecture|d'utilisation)/i.test(t)) return true;
  return false;
}

export function humanizeDeliverables(deliverables: string[], ctx: HumanizeInput): string[] {
  const rt = ctx.sellerResponseTime?.trim() || "répond en moins de 2 h";
  const mainVariants = POLE_DELIV_MAIN[ctx.poleSlug] ?? [
    "fichiers livrés au format convenu, testés et documentés",
    "fichiers au format convenu, testés et documentés",
  ];
  const main = mainVariants[rot(ctx.slug, "/dn", mainVariants.length)] ?? mainVariants[0];
  const guideNouns = POLE_GUIDE_NOUNS[ctx.poleSlug] ?? ["livrables", "documents livrés"];
  const guide = guideNouns[rot(ctx.slug, "/gn", guideNouns.length)] ?? guideNouns[0];
  const out: string[] = [];
  let genericCount = 0;
  for (const d of deliverables) {
    if (isGenericDeliverable(d)) {
      genericCount++;
      continue;
    }
    out.push(cleanLine(d).replace(/^- /, ""));
  }
  // un seul livrable principal par pôle, habillé différemment selon la fiche
  if (genericCount >= 1 || out.length < 3) {
    const w = DELIV_WRAPPERS[rot(ctx.slug, "/dw", DELIV_WRAPPERS.length)](main);
    if (!out.some((o) => normKw(o) === normKw(w))) out.push(w);
  }
  const g = DELIVERABLES_GUIDE[rot(ctx.slug, "/dg", DELIVERABLES_GUIDE.length)](guide);
  if (!out.some((o) => /guide|mode d'emploi|note de lecture|note d'utilisation|instructions/i.test(o))) out.push(g);
  const s = DELIVERABLES_SUPPORT[rot(ctx.slug, "/ds", DELIVERABLES_SUPPORT.length)](rt, ctx.poleLabel);
  if (!out.some((o) => /7 jours|suivi/i.test(o))) out.push(s);
  return dedupeByNorm(out).slice(0, 6);
}

export function humanizeProcess(
  process: { step: number; title: string; detail: string }[],
  ctx: HumanizeInput
): { step: number; title: string; detail: string }[] {
  const rt = ctx.sellerResponseTime?.trim() || "répond en moins de 2 h";
  const days = ctx.deliveryDays;
  const delai = `${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}`;
  const ventes = `${ctx.salesCount}`;
  const avis = `${ctx.reviewsCount}`;
  const noun = POLE_NOUNS[ctx.poleSlug] ?? "les éléments du périmètre convenu";
  const checks = POLE_CHECKS[ctx.poleSlug] ?? "complétude, cohérence, formatage";

  return process.map((p, i) => ({
    step: p.step,
    title: PROCESS_TITLES[i]?.[rot(ctx.slug, `/p${i}`, PROCESS_TITLES[i].length)] ?? p.title,
    detail: rebuildProcessDetail(p, i, { rt, delai, ventes, avis, noun, checks, slug: ctx.slug }),
  }));
}

/** Reconstruit le détail d'une étape : instructions conservées, gabarits remplacés. */
function rebuildProcessDetail(
  p: { detail: string },
  i: number,
  c: { rt: string; delai: string; ventes: string; avis: string; noun: string; checks: string; slug: string }
): string {
  const d = cleanLine(p.detail).trim();

  // Étape 1 : instructions réelles conservées, réactivité du vendeur reconstruite
  if (i === 0) {
    const colon = d.indexOf(":");
    if (colon > 0 && colon < 140) {
      let after = d.slice(colon + 1).trim();
      // retire les queues de réactivité (anciennes et nouvelles) : seules les
      // instructions du brief sont conservées, la réactivité est reconstruite
      after = after.replace(
        /\.\s*(?:Réponse du vendeur|Le vendeur|En moyenne, le vendeur|Comptez sur un interlocuteur|Une question|Réactivité vendeur|Le prestataire|Côté réactivité|D'expérience, le vendeur|La première réponse|Question, doute|Sur cette fiche, le vendeur|Réactivité constatée)[^.]*\.?\s*$/i,
        ""
      );
      after = after.replace(/\s*Réponse du vendeur[^.]*\.?\s*$/i, "");
      const instr = after.replace(/[.\s]+$/, "");
      if (instr.length >= 10) {
        const lead = PROCESS_STEP1_LEADS[rot(c.slug, "/l1", PROCESS_STEP1_LEADS.length)];
        const tail = PROCESS_RT_TAILS[rot(c.slug, "/t1", PROCESS_RT_TAILS.length)](c.rt, c.ventes);
        return `${lead} : ${instr}. ${tail}`;
      }
    }
    return d;
  }

  // Étape 2 : gabarit détecté (ancien ou nouveau) → reconstruit avec le nom de pôle
  if (i === 1) {
    if (/Le vendeur mobilise ses sources|Collecte et traitement|le cœur du livrable/i.test(d) || d.includes(c.noun.slice(0, 20))) {
      return PROCESS_STEP2[rot(c.slug, "/s2", PROCESS_STEP2.length)](c.noun);
    }
    return d;
  }

  // Étape 3 : gabarit détecté → reconstruit avec les points de contrôle du pôle
  if (i === 2) {
    if (/dédoublonnage|contrôle final avant envoi|fraîcheur, cohérence/i.test(d) || d.includes(c.checks.slice(0, 18))) {
      return PROCESS_STEP3[rot(c.slug, "/s3", PROCESS_STEP3.length)](c.checks);
    }
    return d;
  }

  // Étape 4 : gabarit détecté → reconstruit avec délai/ventes/avis
  if (i === 3) {
    if (/7 jours pour demander des ajustements|guide de lecture|ajustements inclus/i.test(d) || /^Vous recevez le livrable en /i.test(d)) {
      return PROCESS_STEP4[rot(c.slug, "/s4", PROCESS_STEP4.length)](c.delai, c.ventes, c.avis);
    }
    return d;
  }

  return d;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  15. Orchestrateur — bundle complet pour une fiche
 * ═══════════════════════════════════════════════════════════════════════════ */

export function buildHumanizedBundle(input: HumanizeInput): HumanizedBundle {
  const keywords = buildKeywordsV2({
    title: input.title,
    category: input.category,
    poleIndex: input.poleIndex,
    hotKeywords: input.hotKeywords,
    realQueries: input.realQueries,
    manual: input.manualKeywords,
  });
  // [ADDITIF v1.9.0 — tour d'élites E1] Primaires curatés (data/gen/elite-keywords.ts) :
  // la tête commerciale validée à la main remplace la dérivation ; l'ancienne
  // phrase verbale part en tête de longue traîne (dédoublonnée). Même source de
  // vérité que scripts/migrate-elite-seo.ts — le seed reproduit la base migrée.
  const elite = ELITE_PRIMARIES[input.slug];
  if (elite && normKw(keywords.primary) !== normKw(elite)) {
    const ancienne = keywords.primary;
    keywords.longTail = dedupeByNorm([ancienne, ...keywords.longTail]).slice(0, 8);
    keywords.primary = elite;
  }
  const features = humanizeFeatures(input.currentFeatures, input);
  const deliverables = humanizeDeliverables(input.currentDeliverables, input);
  const process = humanizeProcess(input.currentProcess, input);
  const description = humanizeDescription(input.currentDescription, input, keywords);
  const shortDesc = humanizeShortDesc(input, keywords);
  const faq = humanizeFaq(input, keywords, features);
  return { description, shortDesc, keywords, faq, features, deliverables, process };
}

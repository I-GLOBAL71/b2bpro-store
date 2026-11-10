/**
 * data/gen/humanize.ts — Couche d'humanisation rédactionnelle des fiches service.
 *
 * Remplace l'assemblage automatique historique (optimizeDescription / buildKeywords
 * de data/gen/enrich.ts) par une rédaction de type « fiche vendeur marketplace
 * haut de gamme » : accroche answer-first naturelle, titres H2 variés, expertise
 * formulée avec de vraies requêtes, FAQ autonome et contextuelle.
 *
 * Principes :
 *  - DÉTERMINISTE et IDEMPOTENT : toutes les rotations proviennent d'un hash du slug
 *    (aucun aléatoire) ; deux exécutions produisent exactement le même résultat.
 *  - Chiffres réels uniquement (prix, délai, note, avis, ventes) passés en contexte.
 *  - Français impeccable : élisions (d', qu', s'), guillemets « », zéro em-dash,
 *    zéro puce « ✓ », aucune phrase mot pour mot répétée d'une fiche à l'autre.
 *  - Mots-clés : primary grammatical (cleanPrimary), requêtes réelles à fort trafic
 *    (hotKeywords dormants des pôles + tableau REAL_POLE_QUERIES de l'audit SEO).
 *
 * Utilisé par scripts/humanize-content.ts (migration de la base) et data/seed.ts
 * (tout futur seed produit le même format).
 */

/* ═══════════════════════════════════════════════════════════════════════════
 *  1. Types
 * ═══════════════════════════════════════════════════════════════════════════ */

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
  /** Titres (sans « Je vais ») de 2 autres services du même pôle */
  siblingTitles: string[];
  basePrice: number;
  deliveryDays: number;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  options: { name: string; priceExtra: number }[];
  /** Description actuelle : format legacy optimisé (4 H2 connus) ou brute du catalogue */
  currentDescription: string;
  currentFeatures: string[];
  currentDeliverables: string[];
  currentProcess: { step: number; title: string; detail: string }[];
  /** Requêtes à fort trafic du pôle (data/gen/poles.ts → hotKeywords) */
  hotKeywords: string[];
  /** Requêtes réelles du tableau d'audit SEO pour ce pôle */
  realQueries: string[];
  /** Mots-clés sourcis à la main au catalogue (ex. #101) — fusionnés, jamais en primary */
  manualKeywords?: ServiceKeywords;
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

/** Rotation déterministe par slug salé : rot(slug, "h1", 6) ∈ [0, 6[. */
function rot(slug: string, salt: string, mod: number): number {
  return hashSlug(`${slug}${salt}`) % mod;
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

/** Minuscules françaises, sigyles et marques préservés (« buy box amazon » → « buy box Amazon »). */
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
 * Ex. : « Je vais convertir n'importe quel site en base de connaissances IA »
 *       → « convertir n'importe quel site en base de connaissances IA ».
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
  const primary = cleanPrimary(input.title);
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
  for (const r of remainingReal) {
    if (longTail.length >= 3) break;
    if (!usedNorm.has(normKw(r))) longTail.push(r);
  }
  for (const mlt of manualLT) {
    if (longTail.length >= 5) break;
    longTail.push(mlt);
  }
  for (const p of patterns) {
    if (longTail.length >= 7) break;
    longTail.push(p);
  }
  let pi = 0;
  while (longTail.length < 6 && pi < patterns.length) {
    longTail.push(patterns[pi++]);
  }

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
 *  7. Pools rédactionnels (rédigés à la main — ton marketplace pro francophone)
 * ═══════════════════════════════════════════════════════════════════════════ */

/** 8 squelettes d'accroche answer-first ({P} = primaire en gras, 2 garanties en rotation). */
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
];

interface AccrocheCtx {
  primary: string;
  prix: string;
  delai: string;
  note: string;
  avis: string;
  ventes: string;
}

/** 6 combinaisons de 2 garanties (sur 4 : séquestre, ajustements, support 7 j/7, contrôle qualité). */
const GUARANTEE_COMBOS: string[] = [
  "Paiement séquestré jusqu'à votre validation, ajustements inclus.",
  "Le paiement n'est libéré qu'après votre validation, et chaque livrable passe un contrôle qualité avant envoi.",
  "Ajustements inclus jusqu'à satisfaction, avec un support qui répond en français 7 j/7.",
  "Contrôle qualité avant chaque envoi, et un support joignable 7 j/7 en français.",
  "Paiement séquestré jusqu'à validation, et un support en français 7 j/7.",
  "Ajustements inclus jusqu'à satisfaction, contrôle qualité avant envoi.",
];

/** Titres H2 — slot 1 : problème / usage (2 variantes injectent le primaire). */
const H2_SLOT1: ((primary: string) => string)[] = [
  (p) => `À quoi sert ${dePre(p)}${p} ?`,
  (p) => `Qui a besoin ${dePre(p)}${p} ?`,
  () => `Quand ce service devient indispensable`,
  () => `Le besoin auquel répond cette prestation`,
  () => `Pourquoi le faire soi-même n'est pas rentable`,
  () => `Le problème que ce service règle à votre place`,
];

/** Titres H2 — slot 2 : livrables. */
const H2_SLOT2: string[] = [
  "Ce que vous recevez, exactement",
  "Le contenu précis de la prestation",
  "Vos livrables, dans le détail",
  "Ce qui est inclus dans l'offre de base",
  "Concrètement, ce que vous obtenez",
  "Tout ce que contient votre commande",
];

/** Titres H2 — slot 3 : méthode + expertise (injecte la catégorie). */
const H2_SLOT3: ((cat: string) => string)[] = [
  (cat) => `La méthode : ${cat}, appliquée à votre cas`,
  () => `Les compétences mobilisées sur ce type de mission`,
  () => `Comment l'expert travaille sur votre dossier`,
  () => `L'expertise derrière le livrable`,
  () => `Sur quoi repose la qualité du résultat`,
  () => `Le savoir-faire engagé sur votre commande`,
];

/** Titres H2 — slot 4 : garanties plateforme. */
const H2_SLOT4: string[] = [
  "Pourquoi commander en confiance ici",
  "Les garanties b2bpro.store sur cette commande",
  "Ce que b2bpro.store garantit sur ce service",
  "Commander sans risque",
  "Vos garanties de bout en bout",
  "Pourquoi cette commande est protégée",
];

/** 5 formulations de la phrase d'expertise (remplace « s'appuie sur : … »). */
const EXPERTISE: ((kw1: string, kw2: string) => string)[] = [
  (kw1, kw2) => `Sur ce type de mission, l'expert mobilise surtout deux expertises : ${kw1} et ${kw2}.`,
  (kw1, kw2) => `Les compétences en jeu : ${kw1}, ${kw2} et un vrai contrôle qualité en bout de course.`,
  (kw1, kw2) => `Ici, l'expert intervient en matière de ${elideDe(kw1)} et de ${elideDe(kw2)}, avec vérification du livrable avant chaque envoi.`,
  (kw1, kw2) => `Deux domaines structurent cette prestation : ${kw1} et ${kw2}.`,
  (kw1, kw2) => `Sur ce dossier, l'expertise attendue couvre ${kw1} comme ${kw2}.`,
];

/** 5 reformulations du bloc garanties + géographie francophone. */
const GEO_GUARANTEES: string[] = [
  "Chaque commande passe par le paiement séquestré, un contrôle qualité avant envoi et un suivi de 7 jours après la livraison. Le service s'adresse à toute la francophonie : France, Belgique, Suisse, Québec et Afrique francophone.",
  "Ici, votre paiement reste bloqué jusqu'à validation, le livrable est vérifié avant envoi et vous conservez 7 jours de suivi après réception. Clients français, belges, suisses, québécois ou africains : tout se traite en français.",
  "Le vendeur n'est payé qu'après votre feu vert, chaque livrable subit un contrôle qualité avant l'envoi et le suivi court sur 7 jours après livraison. La plateforme couvre toute la francophonie, de la France au Québec en passant par la Belgique et la Suisse.",
  "Paiement séquestré jusqu'à validation, contrôle qualité avant envoi, suivi de 7 jours après livraison : ces trois protections s'appliquent à toutes les commandes, que vous commandiez depuis la France, la Belgique, la Suisse, le Québec ou l'Afrique francophone.",
  "Aucun livrable ne part sans contrôle qualité, aucun vendeur n'est payé avant votre validation, et chaque commande inclut 7 jours de suivi. b2bpro.store est pensé pour les acheteurs francophones : France, Belgique, Suisse, Québec, Afrique francophone.",
];

/** 5 intros de la section garanties (slot 4). */
const SLOT4_INTROS: string[] = [
  "Commander ici, c'est activer des protections concrètes :",
  "Ce que la plateforme garantit sur cette commande :",
  "Cinq protections encadrent chaque commande passée ici :",
  "Vous n'achetez pas à l'aveugle :",
  "L'esprit tranquille, du paiement à la livraison :",
];

/** Puce « preuve sociale » du slot 4 (chiffres réels). */
const SLOT4_NOTE: ((note: string, avis: string) => string)[] = [
  (note, avis) => `Expert vérifié, noté ${note}/5 sur ${avis} avis clients`,
  (note, avis) => `Expert noté ${note}/5 par ${avis} clients vérifiés`,
  (note, avis) => `Prestataire vérifié : ${note}/5 de moyenne sur ${avis} avis`,
];

/** Puce paiement (remplace « Paiement sécurisé : … »). */
const FEATURES_PAIEMENT: string[] = [
  "Paiement séquestré : le vendeur n'est payé qu'après votre validation",
  "Votre argent reste bloqué jusqu'à validation du livrable",
  "Vendeur rémunéré uniquement après votre feu vert",
];

/** Puce livraison (remplace « Livraison en N jours ouvrés… »). */
const FEATURES_LIVRAISON: ((delai: string) => string)[] = [
  (d) => `Livraison en ${d}, ponctualité constatée de 98,6 %`,
  (d) => `${d} pour être servi, 98,6 % de commandes à l'heure`,
  (d) => `Délai de ${d}, respecté dans 98,6 % des cas`,
];

/** Puce ajustements (remplace « Ajustements inclus jusqu'à validation complète »). */
const FEATURES_AJUSTEMENTS: string[] = [
  "Retouches incluses jusqu'à satisfaction complète",
  "Ajustements possibles jusqu'à validation, sans supplément",
  "Demandes de retouche incluses avant validation finale",
];

/** Puce support du slot 4. */
const SLOT4_SUPPORT: string[] = [
  "Support en français 7 j/7, avant comme après la commande",
  "Une équipe support joignable 7 j/7 en français",
  "Questions avant ou après l'achat : support en français, 7 j/7",
];

/** 5 squelettes de shortDesc (100-230 car., primaire intégré grammaticalement). */
const SHORTDESCS: ((c: ShortDescCtx) => string)[] = [
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
];

interface ShortDescCtx {
  primary: string;
  prix: string;
  delai: string;
  note: string;
  avis: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  8. FAQ — 5 questions × 3 formulations, réponses autonomes et chiffrées
 * ═══════════════════════════════════════════════════════════════════════════ */

const FAQ_Q1_Q: string[] = [
  "Concrètement, que contient la prestation ?",
  "Que reçoit-on exactement en commandant ?",
  "Que comprend l'offre de base ?",
];

const FAQ_Q2_Q: string[] = [
  "Combien coûte ce service ?",
  "Quel budget prévoir pour cette prestation ?",
  "À combien s'élève le tarif de base ?",
];

const FAQ_Q3_Q: string[] = [
  "Quel est le délai de livraison ?",
  "Combien de temps avant d'être livré ?",
  "Sous quel délai le livrable arrive-t-il ?",
];

const FAQ_Q5_Q: string[] = [
  "Et si le résultat ne me convient pas ?",
  "Quelles garanties si le livrable déçoit ?",
  "Peut-on demander des retouches après livraison ?",
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  9. Process, features, deliverables — titres et gabarits réécrits
 * ═══════════════════════════════════════════════════════════════════════════ */

const PROCESS_TITLES: string[][] = [
  ["Commande et brief", "Votre commande et vos consignes", "Brief et cadrage du besoin", "Prise de commande et consignes"],
  ["Production du livrable", "Collecte et traitement", "Le travail de fond", "Constitution des données"],
  ["Contrôle qualité", "Vérification avant envoi", "Passage au contrôle qualité", "Relecture et vérifications"],
  ["Livraison et suivi", "Remise du livrable", "Livraison et ajustements", "Envoi final et accompagnement"],
];

const DELIVERABLES_GUIDE: string[] = [
  "Guide de lecture du livrable, tenu sur une page",
  "Une page de mode d'emploi pour exploiter le livrable dès réception",
  "Note explicative d'une page, pour un usage immédiat",
];

const DELIVERABLES_SUPPORT: string[] = [
  "Accès au support et suivi post-livraison pendant 7 jours",
  "Support b2bpro.store joignable 7 jours après la livraison",
  "7 jours de suivi après livraison, avec accès au support",
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
];

const GEO_PREFIXES = [
  "Chaque commande passe par le paiement séquestré",
  "Ici, votre paiement reste bloqué",
  "Le vendeur n'est payé qu'après votre feu vert",
  "Paiement séquestré jusqu'à validation",
  "Aucun livrable ne part sans contrôle qualité",
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
  return false;
}

interface Decomposed {
  intro: string;
  core: string;
  closing: string;
}

/**
 * Décompose une description en intro / cœur / closing.
 * Gère le format legacy optimisé (4 H2 connus) ET la description brute du catalogue
 * (heuristique identique à l'ancien optimizeDescription) ET une ré-exécution
 * sur texte déjà humanisé (les paragraphes de pools sont filtrés → idempotence).
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

  // accroche (rotation par hash du slug) + combinaison de 2 garanties
  const accroche =
    ACCROCHES[rot(ctx.slug, "/a", ACCROCHES.length)](accrocheCtx) +
    " " +
    GUARANTEE_COMBOS[rot(ctx.slug, "/g", GUARANTEE_COMBOS.length)];

  // titres H2 (un pool par slot)
  const t1 = H2_SLOT1[rot(ctx.slug, "/h1", H2_SLOT1.length)](kw.primary);
  const t2 = H2_SLOT2[rot(ctx.slug, "/h2", H2_SLOT2.length)];
  const t3 = H2_SLOT3[rot(ctx.slug, "/h3", H2_SLOT3.length)](categoryProse(ctx.category));
  const t4 = H2_SLOT4[rot(ctx.slug, "/h4", H2_SLOT4.length)];

  // section 3 : closing conservé + phrase d'expertise (vraies requêtes) + garanties/géo
  const realSet = allRealQueriesFor(ctx.poleSlug, ctx.hotKeywords).map(normKw);
  const realKws = [kw.primary, ...kw.secondary, ...kw.longTail].filter((s) =>
    realSet.includes(normKw(s))
  );
  const kw1 = realKws[0] ?? kw.secondary[1] ?? categoryKeyword(ctx.category);
  let kw2 = realKws.find(
    (s, i) => i > 0 && normKw(s) !== normKw(kw1) && overlapTokens(kw1, s) <= 1
  );
  if (!kw2) kw2 = kw.secondary[2] ?? kw1;
  const expertise = EXPERTISE[rot(ctx.slug, "/e", EXPERTISE.length)](kw1, kw2);
  const geo = GEO_GUARANTEES[rot(ctx.slug, "/geo", GEO_GUARANTEES.length)];
  const slot3Body = [cleanKeptText(closing), expertise, geo].filter(Boolean).join("\n\n");

  // section 4 : intro courte + 5 puces réécrites (chiffres réels)
  const fPaiement = FEATURES_PAIEMENT[rot(ctx.slug, "/fp", FEATURES_PAIEMENT.length)];
  const fLivraison = FEATURES_LIVRAISON[rot(ctx.slug, "/fl", FEATURES_LIVRAISON.length)](delai);
  const fAjust = FEATURES_AJUSTEMENTS[rot(ctx.slug, "/fa", FEATURES_AJUSTEMENTS.length)];
  const fNote = SLOT4_NOTE[rot(ctx.slug, "/fn", SLOT4_NOTE.length)](note, `${ctx.reviewsCount}`);
  const fSupport = SLOT4_SUPPORT[rot(ctx.slug, "/fs", SLOT4_SUPPORT.length)];
  const slot4Intro = SLOT4_INTROS[rot(ctx.slug, "/i4", SLOT4_INTROS.length)];
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
  const c: ShortDescCtx = {
    primary: kw.primary,
    prix: `${ctx.basePrice}`,
    delai: `${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}`,
    note: ctx.rating.toString().replace(".", ","),
    avis: `${ctx.reviewsCount}`,
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
  const prix = `${ctx.basePrice}`;

  // extraits réels des points forts spécifiques (pour Q1)
  const specific = features.filter((f) => !isTemplateFeature(f));
  const f1 = (specific[0] ?? kw.primary).replace(/\.$/, "");
  let f2 = (specific[1] ?? "").replace(/\.$/, "");

  // phrase options (réelles) pour Q2
  const opts = ctx.options.slice(0, 2);
  const optsSentence =
    opts.length >= 2
      ? ` Les options les plus demandées : « ${opts[0].name} » (+${opts[0].priceExtra} €) et « ${opts[1].name} » (+${opts[1].priceExtra} €).`
      : opts.length === 1
        ? ` L'option la plus demandée : « ${opts[0].name} » (+${opts[0].priceExtra} €).`
        : ` Aucun frais caché : le prix affiché est celui que vous payez.`;

  // contexte de pôle pour Q5 (jamais de nombre total figé)
  const others = Math.max(ctx.poleCount - 1, 0);
  const sib = ctx.siblingTitles.filter(Boolean);
  const poleCtx =
    sib.length >= 2
      ? `Le pôle ${ctx.poleLabel} regroupe ${others} autres services, comme « ${sib[0]} » ou « ${sib[1]} ».`
      : `Le pôle ${ctx.poleLabel} regroupe ${others} autres services du même domaine.`;

  const q1a: string[] = [
    `Pour ${prix} €, l'offre de base comprend : ${f1} ; ${f2}. Le tout livré en ${delai} par un expert noté ${note}/5 (${avis} avis).`,
    `Concrètement : ${f1}, et ${f2}. Comptez ${delai} et ${prix} € pour l'offre de départ, ajustements inclus jusqu'à validation.`,
    `Le cœur de la prestation : ${f1}, plus ${f2}. Tarif de base ${prix} €, délai ${delai}, prestataire noté ${note}/5 sur ${avis} avis.`,
  ];
  if (!f2) {
    for (let i = 0; i < q1a.length; i++) {
      q1a[i] = q1a[i].replace(/ ; \./, " ").replace(/, et \./, " ").replace(/, plus \./, ".");
    }
  }

  const q2a: string[] = [
    `L'offre de base est à ${prix} €, tarif ferme et sans frais caché : vous ne payez qu'une fois le livrable validé, le montant restant séquestré jusqu'à votre feu vert.${optsSentence}`,
    `Comptez ${prix} € pour l'offre de départ. Le paiement est mis en séquestre et n'est libéré qu'après votre validation du livrable.${optsSentence}`,
    `Le tarif de base s'établit à ${prix} €, options non comprises.${optsSentence}`,
  ];

  const q3a: string[] = [
    `Le délai affiché est de ${delai}, à compter de la réception de vos consignes complètes. La plateforme affiche 98,6 % de livraisons à l'heure : le vendeur s'engage sur ce planning.`,
    `Comptez ${delai} une fois vos consignes transmises. Le taux de livraisons à l'heure constaté sur la plateforme est de 98,6 %, et le planning affiché engage le vendeur.`,
    `${firstUpper(delai)} après vos consignes complètes, pas de surprise : le délai affiché sur la fiche est celui que le vendeur s'engage à tenir, avec 98,6 % de ponctualité constatée.`,
  ];

  const core = stripJeVais(ctx.title);
  const q4q = `Comment ${core} ?`;
  const q4a: string[] = [
    `La marche à suivre tient en trois temps : commande, consignes, puis travail de l'expert. Comptez ${delai}, ${prix} € en offre de base, et un interlocuteur noté ${note}/5 (${avis} avis clients).`,
    `Rien de compliqué : vous commandez, vous transmettez vos consignes, puis l'expert prend le relais. Le livrable arrive en ${delai} ; l'offre de base coûte ${prix} € et les retouches sont incluses.`,
    `Vous passez commande et précisez votre besoin ; l'expert fait le reste. Délai constaté : ${delai}, tarif de départ ${prix} €, prestataire noté ${note}/5 sur ${avis} avis.`,
  ];

  const q5a: string[] = [
    `Vous ne validez qu'en étant satisfait : le paiement reste séquestré, les ajustements sont inclus jusqu'à validation complète et le suivi court 7 jours après la livraison. ${poleCtx}`,
    `Rien ne se débloque sans votre feu vert : le vendeur est payé après validation, les retouches sont incluses et vous gardez 7 jours de suivi après livraison. ${poleCtx}`,
    `Deux filets de sécurité : le paiement séquestré, libéré seulement après votre validation, et les ajustements inclus jusqu'à satisfaction, suivis 7 jours après livraison. ${poleCtx}`,
  ];

  return [
    { q: FAQ_Q1_Q[rot(ctx.slug, "/q1", 3)], a: q1a[rot(ctx.slug, "/r1", 3)] },
    { q: FAQ_Q2_Q[rot(ctx.slug, "/q2", 3)], a: q2a[rot(ctx.slug, "/r2", 3)] },
    { q: FAQ_Q3_Q[rot(ctx.slug, "/q3", 3)], a: q3a[rot(ctx.slug, "/r3", 3)] },
    { q: q4q, a: q4a[rot(ctx.slug, "/r4", 3)] },
    { q: FAQ_Q5_Q[rot(ctx.slug, "/q5", 3)], a: q5a[rot(ctx.slug, "/r5", 3)] },
  ];
}

/** Une feature est-elle un gabarit plateforme (à réécrire) ? */
function isTemplateFeature(f: string): boolean {
  return (
    /^Paiement sécurisé : le vendeur n'est payé/i.test(f) ||
    /^Ajustements inclus jusqu'à validation complète/i.test(f) ||
    /^Livraison en \d+ jours ouvrés, taux de ponctualité/i.test(f) ||
    /^Retouches incluses jusqu'à satisfaction complète$/i.test(f) ||
    /^Ajustements possibles jusqu'à validation, sans supplément$/i.test(f) ||
    /^Demandes de retouche incluses avant validation finale$/i.test(f) ||
    /^Paiement séquestré : le vendeur n'est payé/i.test(f) ||
    /^Votre argent reste bloqué jusqu'à validation du livrable$/i.test(f) ||
    /^Vendeur rémunéré uniquement après votre feu vert$/i.test(f)
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  14. humanizeFeatures / humanizeDeliverables / humanizeProcess
 * ═══════════════════════════════════════════════════════════════════════════ */

export function humanizeFeatures(features: string[], ctx: HumanizeInput): string[] {
  const days = ctx.deliveryDays;
  const delai = `${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}`;
  const out: string[] = [];
  for (const f of features) {
    if (/^Paiement sécurisé : le vendeur n'est payé/i.test(f)) {
      out.push(FEATURES_PAIEMENT[rot(ctx.slug, "/fp", 3)]);
    } else if (/^Ajustements inclus jusqu'à validation complète/i.test(f)) {
      out.push(FEATURES_AJUSTEMENTS[rot(ctx.slug, "/fa", 3)]);
    } else if (/^Livraison en \d+ jours ouvrés, taux de ponctualité/i.test(f)) {
      out.push(FEATURES_LIVRAISON[rot(ctx.slug, "/fl", 3)](delai));
    } else {
      out.push(cleanLine(f).replace(/^- /, ""));
    }
  }
  return dedupeByNorm(out).slice(0, 9);
}

export function humanizeDeliverables(deliverables: string[], ctx: HumanizeInput): string[] {
  const out: string[] = [];
  for (const d of deliverables) {
    if (/^Guide de lecture du livrable \(1 page\)/i.test(d)) {
      out.push(DELIVERABLES_GUIDE[rot(ctx.slug, "/dg", 3)]);
    } else if (/^Accès au support b2bpro\.store et suivi post-livraison/i.test(d)) {
      out.push(DELIVERABLES_SUPPORT[rot(ctx.slug, "/ds", 3)]);
    } else {
      out.push(cleanLine(d).replace(/^- /, ""));
    }
  }
  return dedupeByNorm(out).slice(0, 6);
}

export function humanizeProcess(
  process: { step: number; title: string; detail: string }[],
  ctx: HumanizeInput
): { step: number; title: string; detail: string }[] {
  return process.map((p, i) => ({
    step: p.step,
    title: PROCESS_TITLES[i]?.[rot(ctx.slug, `/p${i}`, PROCESS_TITLES[i].length)] ?? p.title,
    detail: cleanLine(p.detail),
  }));
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
  const features = humanizeFeatures(input.currentFeatures, input);
  const deliverables = humanizeDeliverables(input.currentDeliverables, input);
  const process = humanizeProcess(input.currentProcess, input);
  const description = humanizeDescription(input.currentDescription, input, keywords);
  const shortDesc = humanizeShortDesc(input, keywords);
  const faq = humanizeFaq(input, keywords, features);
  return { description, shortDesc, keywords, faq, features, deliverables, process };
}

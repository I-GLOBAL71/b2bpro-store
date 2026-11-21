/**
 * CLI : `pnpm dlx tsx --env-file=.env scripts/verify-blog-elite.ts`
 *        ou `pnpm dlx tsx --env-file=.env scripts/verify-blog-elite.ts --slug=<slug>`
 *        ou `pnpm dlx tsx --env-file=.env scripts/verify-blog-elite.ts --file=data/blog/<slug>.md`
 *
 * MOTEUR DE VÉRIFICATION ÉLITE POUR LE BLOG b2bpro.store :
 * Évalue impitoyablement chaque article selon les 5 piliers d'autorité :
 *  1. Domination Google & SEO Fondamental (30 pts)
 *  2. Domination GEO & Moteurs IA - Princeton KDD 2024 (25 pts)
 *  3. Zéro Trace d'IA & Style 100 % Humain Authentique (25 pts)
 *  4. Marketing, Conversion CRO & Rassurance B2B (10 pts)
 *  5. Assets Visuels WebP & Vercel Blob CDN (10 pts)
 *
 * Sortie : Diagnostic terminal détaillé + score sur 100 + rapport markdown docs/audits/audit-blog-<date>.md
 * Code de sortie : 0 si 100 % vert / avertissements, 1 si échec critique bloquant.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { db } from "../src/lib/db";

// ── Couleurs ANSI ─────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
};

interface PillarScore {
  name: string;
  points: number;
  maxPoints: number;
  checks: CheckResult[];
}

interface CheckResult {
  id: string;
  label: string;
  weight: number;
  score: number;
  passed: boolean;
  isWarning?: boolean;
  value: string;
  expected: string;
  message?: string;
}

interface ArticleAudit {
  slug: string;
  title: string;
  category: string;
  wordsCount: number;
  totalScore: number;
  grade: "S+" | "A" | "B" | "C" | "F";
  pillars: Record<string, PillarScore>;
  criticalFailures: string[];
  warnings: string[];
}

// ── Extraction frontmatter Markdown ───────────────────────────────────────────
function parseMarkdownFile(filePath: string): { frontmatter: Record<string, string>; content: string } {
  const raw = readFileSync(filePath, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, content: raw };
  }
  const fmRaw = match[1];
  const content = match[2].trim();
  const frontmatter: Record<string, string> = {};
  let currentKey = "";
  for (const line of fmRaw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      let item = trimmed.slice(2).trim();
      if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))) {
        item = item.slice(1, -1);
      }
      if (currentKey) {
        frontmatter[currentKey] = frontmatter[currentKey] ? `${frontmatter[currentKey]}, ${item}` : item;
      }
      continue;
    }
    const p = line.indexOf(":");
    if (p !== -1) {
      const key = line.slice(0, p).trim();
      let val = line.slice(p + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      currentKey = key;
      frontmatter[key] = val;
    }
  }
  return { frontmatter, content };
}

// ── Normalisation phonétique / accentuelle ────────────────────────────────────
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Calcul de variance de longueur de phrase (Burstiness) ────────────────────
function calculateBurstiness(content: string): { avg: number; stdDev: number; shortSentences: number } {
  const cleanText = content
    .replace(/^#+.*$/gm, "")
    .replace(/\|.*\|/g, "")
    .replace(/```[\s\S]*?```/g, "");

  const sentences = cleanText
    .split(/[.!?]+(?:\s+|\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length === 0) return { avg: 0, stdDev: 0, shortSentences: 0 };

  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const totalWords = lengths.reduce((a, b) => a + b, 0);
  const avg = totalWords / lengths.length;

  const variance = lengths.reduce((acc, len) => acc + Math.pow(len - avg, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const shortSentences = lengths.filter((l) => l <= 8).length;

  return { avg: Math.round(avg * 10) / 10, stdDev: Math.round(stdDev * 10) / 10, shortSentences };
}

async function auditArticle(
  data: {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    category: string;
    keywords?: string;
    coverTheme?: string;
  },
  validServiceSlugs: Set<string>,
  manifest: Record<string, { slug: string; localPath: string; blobUrl?: string; bytes: number }>
): Promise<ArticleAudit> {
  const { slug, title, excerpt, content, category } = data;
  const criticalFailures: string[] = [];
  const warnings: string[] = [];

  const words = content.split(/\s+/).filter(Boolean);
  const wordsCount = words.length;

  // Détection du mot-clé primaire
  let primaryKeyword = "";
  if (data.keywords) {
    primaryKeyword = data.keywords.split(",")[0].trim();
  }
  if (!primaryKeyword) {
    // Si pas de mot-clé explicite, extraire les 3-4 mots significatifs du slug
    const stopWords = new Set(["de", "des", "du", "la", "le", "les", "un", "une", "pour", "et", "en", "sur", "vos", "votre", "sa", "son", "ses", "comment", "sans"]);
    const slugWords = slug.split("-").filter((w) => !stopWords.has(w));
    primaryKeyword = slugWords.slice(0, 3).join(" ");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PILIER 1 : DOMINATION GOOGLE & SEO FONDAMENTAL (30 points)
  // ═══════════════════════════════════════════════════════════════════════════
  const p1Checks: CheckResult[] = [];

  // 1.1 Longueur Titre SEO (40–75 car.)
  const tLen = title.length;
  const tOk = tLen >= 40 && tLen <= 75;
  p1Checks.push({
    id: "seo-title-len",
    label: "Longueur du Titre SEO",
    weight: 5,
    score: tOk ? 5 : tLen >= 35 && tLen <= 80 ? 2 : 0,
    passed: tOk,
    value: `${tLen} caractères`,
    expected: "40 à 75 caractères (zone optimale Google SERP)",
  });
  if (!tOk) {
    criticalFailures.push(`Titre SEO hors gabarit (${tLen} car. au lieu de 40-75).`);
  }

  // 1.2 Présence du mot-clé primaire dans le titre
  const normTitle = norm(title);
  const normKw = norm(primaryKeyword);
  const kwWords = normKw.split(" ").filter((w) => w.length > 2);
  const kwInTitle = normTitle.includes(normKw) || (kwWords.length > 0 && kwWords.every((w) => normTitle.includes(w)));

  p1Checks.push({
    id: "seo-kw-in-title",
    label: "Mot-clé primaire dans le Titre",
    weight: 6,
    score: kwInTitle ? 6 : 0,
    passed: kwInTitle,
    value: kwInTitle ? `« ${primaryKeyword} » détecté` : `« ${primaryKeyword} » non trouvé`,
    expected: `Mots-clés (« ${primaryKeyword} ») ancrés dans le titre`,
  });
  if (!kwInTitle) {
    criticalFailures.push(`Le mot-clé primaire « ${primaryKeyword} » n'est pas présent dans le titre.`);
  }

  // 1.3 Position du mot-clé dans le titre (Front-loading)
  let kwPos = normTitle.indexOf(normKw);
  if (kwPos === -1 && kwWords.length > 0) {
    kwPos = normTitle.indexOf(kwWords[0]);
  }
  const kwFrontOk = kwPos !== -1 && kwPos / normTitle.length <= 0.65;
  p1Checks.push({
    id: "seo-kw-position",
    label: "Position du mot-clé (Front-loading)",
    weight: 2,
    score: kwFrontOk ? 2 : 1,
    passed: kwFrontOk,
    value: kwPos !== -1 ? `Position relative : ${Math.round((kwPos / normTitle.length) * 100)} %` : "N/A",
    expected: "Placé dans les premiers 65 % du titre pour maximiser le CTR Google",
  });

  // 1.4 Longueur Meta Description / Extrait (80–200 car.)
  const exLen = excerpt.length;
  const exOk = exLen >= 80 && exLen <= 200;
  p1Checks.push({
    id: "seo-excerpt-len",
    label: "Longueur de la Meta Description",
    weight: 4,
    score: exOk ? 4 : 0,
    passed: exOk,
    value: `${exLen} caractères`,
    expected: "80 à 200 caractères (affichage mobile complet)",
  });
  if (!exOk) {
    criticalFailures.push(`Extrait / Meta description hors gabarit (${exLen} car. au lieu de 80-200).`);
  }

  // 1.5 Profondeur du contenu (Mots)
  const wordsOk = wordsCount >= 900;
  p1Checks.push({
    id: "seo-words-count",
    label: "Volume et profondeur rédactionnelle",
    weight: 5,
    score: wordsCount >= 950 ? 5 : wordsCount >= 800 ? 3 : 0,
    passed: wordsOk,
    value: `${wordsCount} mots (${content.length} caractères)`,
    expected: "≥ 900 mots (minimum Google pour surpasser les concurrents)",
  });
  if (wordsCount < 800) {
    criticalFailures.push(`Contenu trop succinct (${wordsCount} mots au lieu de ≥ 900 mots).`);
  }

  // 1.6 Structure sémantique H2 (≥ 3 sections H2)
  const h2Matches = content.match(/^##\s+.+$/gm) ?? [];
  const h2Count = h2Matches.length;
  const h2Ok = h2Count >= 3;
  p1Checks.push({
    id: "seo-h2-structure",
    label: "Structure sémantique H2",
    weight: 3,
    score: h2Count >= 4 ? 3 : h2Count === 3 ? 2 : 0,
    passed: h2Ok,
    value: `${h2Count} balises H2`,
    expected: "≥ 3 sections H2 majeures",
  });
  if (!h2Ok) {
    criticalFailures.push(`Nombre insuffisant de sections H2 (${h2Count} trouvé, ≥ 3 attendu).`);
  }

  // 1.7 Maillage interne vers les fiches services réelles
  const serviceLinkRegex = /https:\/\/b2bpro\.store\/services\/([a-z0-9-]+)/g;
  const foundLinks = [...content.matchAll(serviceLinkRegex)].map((m) => m[1]);
  const uniqueLinks = [...new Set(foundLinks)];
  const brokenLinks = uniqueLinks.filter((s) => !validServiceSlugs.has(s));
  const linksOk = uniqueLinks.length >= 3 && brokenLinks.length === 0;

  p1Checks.push({
    id: "seo-internal-linking",
    label: "Maillage interne absolu vers /services/",
    weight: 5,
    score: linksOk ? 5 : uniqueLinks.length >= 2 && brokenLinks.length === 0 ? 2 : 0,
    passed: linksOk,
    value: `${uniqueLinks.length} lien(s) unique(s) (${brokenLinks.length} lien(s) brisé(s))`,
    expected: "≥ 3 liens uniques vers des services réels en base",
  });
  if (uniqueLinks.length < 3) {
    criticalFailures.push(`Maillage interne insuffisant (${uniqueLinks.length} lien(s) vers /services/, ≥ 3 requis).`);
  }
  if (brokenLinks.length > 0) {
    criticalFailures.push(`Lien(s) brisé(s) vers des services inexistants : ${brokenLinks.join(", ")}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PILIER 2 : DOMINATION GEO & MOTEURS IA (25 points)
  // ═══════════════════════════════════════════════════════════════════════════
  const p2Checks: CheckResult[] = [];

  // 2.1 Answer-First (Réponse en 30 secondes dans les 350 premiers caractères)
  const first350 = content.slice(0, 450);
  const answerFirstRegex = /\*\*La réponse en 30 secondes\s*:\*\*/i;
  const hasAnswerFirst = answerFirstRegex.test(first350);
  p2Checks.push({
    id: "geo-answer-first",
    label: "Answer-First immédiat (Citable LLM)",
    weight: 7,
    score: hasAnswerFirst ? 7 : 0,
    passed: hasAnswerFirst,
    value: hasAnswerFirst ? "Présent en ouverture d'article" : "Absent ou mal positionné",
    expected: "« **La réponse en 30 secondes :** » en ouverture d'article",
  });
  if (!hasAnswerFirst) {
    criticalFailures.push("L'ouverture Answer-First (« **La réponse en 30 secondes :** ») est absente ou trop basse.");
  }

  // 2.2 Densité de faits chiffrés et statistiques (≥ 4 occurrences de chiffres / % / €)
  const statsMatches = content.match(/\b\d+(?:,\d+)?\s*(?:%|€|euros?|jours?|heures?|mois|fois|ans?|kvi\b)/gi) ?? [];
  const statsCount = statsMatches.length;
  const statsOk = statsCount >= 4;
  p2Checks.push({
    id: "geo-stats-density",
    label: "Densité de statistiques et métriques",
    weight: 6,
    score: statsCount >= 5 ? 6 : statsCount >= 3 ? 4 : 1,
    passed: statsOk,
    value: `${statsCount} données chiffrées relevées`,
    expected: "≥ 4 statistiques ou métriques (+115 % de citabilité IA)",
  });
  if (!statsOk) {
    warnings.push(`Densité de statistiques un peu faible (${statsCount} données chiffrées détectées, ≥ 4 recommandé).`);
  }

  // 2.3 Tableau comparatif Markdown (Format structuré haute extraction)
  const tableRegex = /\|(.+)\|[\r\n]+\|([-:\s|]+)\|[\r\n]+(\|(.+)[\r\n]+)+/;
  const hasTable = tableRegex.test(content);
  p2Checks.push({
    id: "geo-markdown-table",
    label: "Tableau comparatif Markdown structuré",
    weight: 5,
    score: hasTable ? 5 : 0,
    passed: hasTable,
    value: hasTable ? "Tableau comparatif détecté" : "Aucun tableau",
    expected: "≥ 1 tableau Markdown complet (cible prioritaire Perplexity et Google AI Overviews)",
  });
  if (!hasTable) {
    criticalFailures.push("Aucun tableau comparatif Markdown présent dans l'article.");
  }

  // 2.4 FAQ activatrice GEO (≥ 3 Q/R et 1re question en « Comment… »)
  const faqQuestions = [...content.matchAll(/###\s+([^\r\n]+)/g)].map((m) => m[1].trim());
  const faqCount = faqQuestions.length;
  const firstFaqHow = faqQuestions.some((q) => /^comment\b/i.test(q));
  const faqOk = faqCount >= 3 && firstFaqHow;

  p2Checks.push({
    id: "geo-faq-activator",
    label: "FAQ activatrice GEO (Question « Comment… »)",
    weight: 4,
    score: faqOk ? 4 : faqCount >= 3 ? 2 : 0,
    passed: faqOk,
    value: `${faqCount} questions dont au moins une en « Comment… »`,
    expected: "≥ 3 questions avec question en « Comment… » (activateur n°4)",
  });
  if (!faqOk) {
    if (faqCount < 3) criticalFailures.push(`FAQ trop courte (${faqCount} questions détectées, ≥ 3 attendu).`);
    else warnings.push("Aucune question de FAQ ne s'ouvre explicitement par « Comment… ».");
  }

  // 2.5 Autorités et études citées (Gartner, McKinsey, Princeton, CNIL, etc.)
  const authoritiesRegex = /(gartner|mckinsey|princeton|harvard|cnil|google|statista|insee|kdd|forrester|searchengineland|semrush|ahrefs|later|hypeauditor|boamp|bofip|dgccrf)/i;
  const hasAuthority = authoritiesRegex.test(content);
  p2Checks.push({
    id: "geo-authorities-cited",
    label: "Sources d'autorité tierces citées",
    weight: 3,
    score: hasAuthority ? 3 : 1,
    passed: hasAuthority,
    value: hasAuthority ? "Étude / Source institutionnelle citée" : "Aucune source externe reconnue",
    expected: "Mention d'études d'autorité (Gartner, McKinsey, Princeton, etc.)",
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PILIER 3 : ZÉRO TRACE D'IA & STYLE 100 % HUMAIN AUTHENTIQUE (25 points)
  // ═══════════════════════════════════════════════════════════════════════════
  const p3Checks: CheckResult[] = [];

  // 3.1 Zéro Caractères Invisibles & Watermarks Unicode
  const invisibleUnicodeRegex = /[\u200B-\u200D\u200E\u200F\u00AD\uFEFF]|\uDB40[\uDC00-\uDC7F]/g;
  const unicodeMatches = (content.match(invisibleUnicodeRegex) ?? []).length + (title.match(invisibleUnicodeRegex) ?? []).length;
  const unicodeOk = unicodeMatches === 0;
  p3Checks.push({
    id: "human-zero-unicode-watermarks",
    label: "Zéro caractère invisible Unicode",
    weight: 5,
    score: unicodeOk ? 5 : 0,
    passed: unicodeOk,
    value: `${unicodeMatches} glyphe(s) invisible(s)`,
    expected: "0 glyphe non imprimable (anti-watermark)",
  });
  if (!unicodeOk) {
    criticalFailures.push(`Détection de ${unicodeMatches} caractère(s) Unicode invisible(s) (watermark potentiel).`);
  }

  // 3.2 Zéro Cadratin (—) (Le marqueur statistique n°1 des détecteurs d'IA)
  const emdashCount = (content.match(/—/g) ?? []).length + (title.match(/—/g) ?? []).length;
  const emdashOk = emdashCount === 0;
  p3Checks.push({
    id: "human-zero-em-dash",
    label: "Zéro tiret cadratin (—)",
    weight: 5,
    score: emdashOk ? 5 : 0,
    passed: emdashOk,
    value: `${emdashCount} cadratin(s)`,
    expected: "0 cadratin (remplacer par virgule, parenthèse ou deux-points)",
  });
  if (!emdashOk) {
    criticalFailures.push(`Présence de ${emdashCount} tiret(s) cadratin (« — ») typique des modèles de langage.`);
  }

  // 3.3 Zéro Marqueurs Lexicaux d'IA (120+ tics banni du skill ai-writing-humanizer)
  const aiLexicalMarkers = [
    { pattern: /\bdans un monde en (?:constante|perpétuelle) évolution\b/i, name: "Dans un monde en constante évolution" },
    { pattern: /\bplonger au cœur de\b|\bplongeons au cœur de\b/i, name: "Plonger au cœur de" },
    { pattern: /\bforce est de constater\b/i, name: "Force est de constater" },
    { pattern: /\bil convient de (?:noter|souligner)\b/i, name: "Il convient de noter/souligner" },
    { pattern: /\bnon seulement\b[\s\S]{1,60}\bmais (?:aussi|encore)\b/i, name: "Non seulement X, mais aussi Y" },
    { pattern: /\b(?:véritable )?catalyseur de\b/i, name: "Catalyseur de" },
    { pattern: /\btapestry\b|\btapisserie\b|\bmosaïque complexe\b/i, name: "Mosaïque / Tapisserie" },
    { pattern: /\bapproche holistique\b|\bvision holistique\b/i, name: "Holistique" },
    { pattern: /\bsans couture\b/i, name: "Sans couture (seamless)" },
    { pattern: /\bnaviguer (?:dans|à travers) (?:ce|le|les)\b/i, name: "Naviguer à travers" },
    { pattern: /\bdelve\b|\bleverage\b|\bfoster\b|\bstreamline\b/i, name: "Anglicismes IA (delve, leverage, etc.)" },
  ];

  const detectedAiMarkers: string[] = [];
  for (const m of aiLexicalMarkers) {
    if (m.pattern.test(content) || m.pattern.test(title)) {
      detectedAiMarkers.push(m.name);
    }
  }
  const aiMarkersOk = detectedAiMarkers.length === 0;
  p3Checks.push({
    id: "human-zero-ai-markers",
    label: "Zéro tic ou tournure robotique d'IA",
    weight: 6,
    score: aiMarkersOk ? 6 : Math.max(0, 6 - detectedAiMarkers.length * 2),
    passed: aiMarkersOk,
    value: aiMarkersOk ? "Aucun marqueur détecté" : `${detectedAiMarkers.length} détecté(s) : ${detectedAiMarkers.join(", ")}`,
    expected: "0 expression robotique bannie (lexique humain authentique)",
  });
  if (!aiMarkersOk) {
    criticalFailures.push(`Présence de tics lexicaux d'IA : ${detectedAiMarkers.join(", ")}.`);
  }

  // 3.4 Zéro mention artificielle de "100% humain" ou auto-référence d'IA
  const forbiddenClaims = [
    { pattern: /\b100\s*%\s*humain\b/i, name: "Mention artificielle '100% humain'" },
    { pattern: /\brédigé sans ia\b|\bzéro trace d'ia\b/i, name: "Mention 'rédigé sans IA / zéro trace d'IA'" },
    { pattern: /\ben tant qu'ia\b|\ben tant qu'intelligence artificielle\b/i, name: "Auto-référence d'IA" },
  ];
  const detectedClaims: string[] = [];
  for (const cl of forbiddenClaims) {
    if (cl.pattern.test(content) || cl.pattern.test(title)) {
      detectedClaims.push(cl.name);
    }
  }
  const claimsOk = detectedClaims.length === 0;
  p3Checks.push({
    id: "human-zero-forbidden-claims",
    label: "Absence de badge ou disclaimer artificiel",
    weight: 4,
    score: claimsOk ? 4 : 0,
    passed: claimsOk,
    value: claimsOk ? "Aucune mention artificielle" : detectedClaims.join(", "),
    expected: "Ne jamais proclamer artificiellement être '100% humain'",
  });
  if (!claimsOk) {
    criticalFailures.push(`Présence de claims interdits : ${detectedClaims.join(", ")}.`);
  }

  // 3.5 Burstiness & Rythme de phrase (Variation de longueur)
  const burst = calculateBurstiness(content);
  const burstOk = burst.stdDev >= 5.0 && burst.shortSentences >= 2;
  p3Checks.push({
    id: "human-burstiness-rhythm",
    label: "Burstiness & Rythme humain (Phrases courtes)",
    weight: 5,
    score: burstOk ? 5 : burst.stdDev >= 4.0 ? 3 : 1,
    passed: burstOk,
    value: `Écart-type : ${burst.stdDev} · ${burst.shortSentences} phrases courtes (≤ 8 mots)`,
    expected: "Écart-type ≥ 5.0 + ≥ 2 phrases courtes (brise le rythme métronome des IA)",
  });
  if (!burstOk) {
    warnings.push(`Rythme de phrase un peu uniforme (écart-type ${burst.stdDev}, ≥ 5.0 recommandé).`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PILIER 4 : MARKETING, CONVERSION CRO & RASSURANCE B2B (10 points)
  // ═══════════════════════════════════════════════════════════════════════════
  const p4Checks: CheckResult[] = [];

  // 4.1 Positionnement tarifaire clair et accessible
  const pricingRegex = /(dès|à partir de|tarif|prix|coût|plancher)\s+\d+(?:,\d+)?\s*€/i;
  const hasPricing = pricingRegex.test(content);
  p4Checks.push({
    id: "cro-pricing-anchor",
    label: "Ancrage tarifaire transparent",
    weight: 3,
    score: hasPricing ? 3 : 1,
    passed: hasPricing,
    value: hasPricing ? "Ancrage tarifaire présent (ex : dès 20 € / 25 € / 30 €)" : "Non explicite",
    expected: "Tarif plancher accessible ou comparatif de prix clair",
  });

  // 4.2 Rassurance et garantie (Séquestre / Entiercement / Escrow)
  const escrowRegex = /(séquestre|sequestre|entiercement|escrow|bloqué|garantie|sécurisé)/i;
  const hasEscrow = escrowRegex.test(content);
  p4Checks.push({
    id: "cro-escrow-reassurance",
    label: "Rassurance paiement et garantie d'achat",
    weight: 4,
    score: hasEscrow ? 4 : 1,
    passed: hasEscrow,
    value: hasEscrow ? "Rassurance séquestre / entiercement présente" : "Absente",
    expected: "Mention du système de paiement sous séquestre sécurisé",
  });
  if (!hasEscrow) {
    warnings.push("La mention du séquestre ou de la protection d'achat n'est pas explicitement formulée.");
  }

  // 4.3 Appel à l'action contextuel (Call to Action vers b2bpro.store)
  const ctaRegex = /(b2bpro\.store|marketplace|commander|déléguer|faire appel|réserver)/i;
  const hasCta = ctaRegex.test(content);
  p4Checks.push({
    id: "cro-action-trigger",
    label: "Appel à l'action contextuel (CTA)",
    weight: 3,
    score: hasCta ? 3 : 0,
    passed: hasCta,
    value: hasCta ? "CTA orienté solution b2bpro.store" : "Aucun CTA",
    expected: "Incitation claire à déléguer à un prestataire b2bpro.store",
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PILIER 5 : ASSETS VISUELS WEBP & VERCEL BLOB CDN (10 points)
  // ═══════════════════════════════════════════════════════════════════════════
  const p5Checks: CheckResult[] = [];

  const localWebpPath = path.join(process.cwd(), "public", "img", "blog", `${slug}.webp`);
  const hasLocalWebp = existsSync(localWebpPath);
  let webpSize = 0;
  if (hasLocalWebp) {
    try {
      webpSize = Math.round(readFileSync(localWebpPath).length / 1024);
    } catch {
      webpSize = 0;
    }
  }

  p5Checks.push({
    id: "visual-local-webp",
    label: "Couverture WebP 1200×630 sur disque",
    weight: 5,
    score: hasLocalWebp && webpSize < 80 ? 5 : hasLocalWebp ? 3 : 0,
    passed: hasLocalWebp,
    value: hasLocalWebp ? `${webpSize} Ko (public/img/blog/${slug}.webp)` : "Fichier manquant",
    expected: "Image WebP 1200×630 présente (< 80 Ko)",
  });
  if (!hasLocalWebp) {
    criticalFailures.push(`Le visuel local public/img/blog/${slug}.webp n'existe pas.`);
  }

  // Manifest Blob URL
  const manifestEntry = manifest[slug];
  const hasBlobUrl = Boolean(manifestEntry?.blobUrl);
  p5Checks.push({
    id: "visual-blob-cdn",
    label: "Hébergement Vercel Blob CDN",
    weight: 5,
    score: hasBlobUrl ? 5 : 2,
    passed: hasBlobUrl,
    value: hasBlobUrl ? (manifestEntry.blobUrl as string) : "Enregistré uniquement en local",
    expected: "URL publique https://...blob.vercel-storage.com/blog/...",
  });
  if (!hasBlobUrl) {
    warnings.push("L'image n'est pas encore téléversée sur le Blob Vercel (URL CDN manquante dans manifest.json).");
  }

  // Contrôles anti-obsolescence
  const fixedCount = (content.match(/\b\d{2,3}\s+services\b/g) ?? []).length;
  if (fixedCount > 0) {
    criticalFailures.push(`Mention interdite d'un nombre figé de services (${fixedCount} occurrence(s)).`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCUL DES SCORES
  // ═══════════════════════════════════════════════════════════════════════════
  const sumScores = (checks: CheckResult[]) => checks.reduce((acc, ch) => acc + ch.score, 0);
  const sumMax = (checks: CheckResult[]) => checks.reduce((acc, ch) => acc + ch.weight, 0);

  const pillars: Record<string, PillarScore> = {
    seo: { name: "Domination Google & SEO", points: sumScores(p1Checks), maxPoints: sumMax(p1Checks), checks: p1Checks },
    geo: { name: "Domination GEO & Moteurs IA", points: sumScores(p2Checks), maxPoints: sumMax(p2Checks), checks: p2Checks },
    human: { name: "Zéro Trace d'IA & Style Humain", points: sumScores(p3Checks), maxPoints: sumMax(p3Checks), checks: p3Checks },
    cro: { name: "Marketing, Conversion & Rassurance", points: sumScores(p4Checks), maxPoints: sumMax(p4Checks), checks: p4Checks },
    visual: { name: "Assets Visuels & CDN Blob", points: sumScores(p5Checks), maxPoints: sumMax(p5Checks), checks: p5Checks },
  };

  let totalScore = Object.values(pillars).reduce((acc, p) => acc + p.points, 0);

  if (criticalFailures.length > 0) {
    totalScore = Math.min(totalScore, 65);
  }

  let grade: "S+" | "A" | "B" | "C" | "F" = "F";
  if (totalScore >= 95 && criticalFailures.length === 0) grade = "S+";
  else if (totalScore >= 85 && criticalFailures.length === 0) grade = "A";
  else if (totalScore >= 75) grade = "B";
  else if (totalScore >= 60) grade = "C";
  else grade = "F";

  return {
    slug,
    title,
    category,
    wordsCount,
    totalScore,
    grade,
    pillars,
    criticalFailures,
    warnings,
  };
}

// ── FONCTION PRINCIPALE ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  const fileArg = args.find((a) => a.startsWith("--file="))?.split("=")[1];

  console.log(`\n${c.bold}${c.cyan}═════════════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}${c.white}  AUDIT ÉLITE BLOG POST-RÉDACTION — b2bpro.store${c.reset}`);
  console.log(`${c.dim}  Google Top 1 · GEO / Moteurs IA · Zéro Trace d'IA · CRO & Rassurance${c.reset}`);
  console.log(`${c.bold}${c.cyan}═════════════════════════════════════════════════════════════════════${c.reset}\n`);

  const services = await db.service.findMany({ select: { slug: true } });
  const validServiceSlugs = new Set(services.map((s) => s.slug));

  const manifestPath = path.join(process.cwd(), "public", "img", "blog", "manifest.json");
  let manifest: Record<string, { slug: string; localPath: string; blobUrl?: string; bytes: number }> = {};
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      manifest = {};
    }
  }

  let articlesToAudit: {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    category: string;
    keywords?: string;
  }[] = [];

  if (fileArg) {
    if (!existsSync(fileArg)) {
      console.error(`${c.red}✗ Fichier introuvable : ${fileArg}${c.reset}`);
      process.exit(1);
    }
    const { frontmatter, content } = parseMarkdownFile(fileArg);
    const slug = frontmatter.slug || path.basename(fileArg, ".md");
    articlesToAudit.push({
      slug,
      title: frontmatter.title || "",
      excerpt: frontmatter.excerpt || "",
      content,
      category: frontmatter.category || "Général",
      keywords: frontmatter.keywords,
    });
  } else if (slugArg) {
    let mdFrontmatter: Record<string, string> = {};
    let mdContent = "";
    const mdPath = path.join(process.cwd(), "data", "blog", `${slugArg}.md`);
    if (existsSync(mdPath)) {
      const parsed = parseMarkdownFile(mdPath);
      mdFrontmatter = parsed.frontmatter;
      mdContent = parsed.content;
    }

    const post = await db.blogPost.findUnique({ where: { slug: slugArg } });
    if (!post && !mdContent) {
      console.error(`${c.red}✗ Article introuvable ni en base ni dans data/blog/ : ${slugArg}${c.reset}`);
      process.exit(1);
    }

    articlesToAudit.push({
      slug: slugArg,
      title: mdFrontmatter.title || post?.title || "",
      excerpt: mdFrontmatter.excerpt || post?.excerpt || "",
      content: mdContent || post?.content || "",
      category: mdFrontmatter.category || post?.category || "Général",
      keywords: mdFrontmatter.keywords,
    });
  } else {
    const posts = await db.blogPost.findMany({ orderBy: { publishedAt: "asc" } });
    for (const p of posts) {
      let mdKw: string | undefined = undefined;
      const mdPath = path.join(process.cwd(), "data", "blog", `${p.slug}.md`);
      if (existsSync(mdPath)) {
        try {
          const parsed = parseMarkdownFile(mdPath);
          mdKw = parsed.frontmatter.keywords;
        } catch {
          // ignore
        }
      }
      articlesToAudit.push({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        category: p.category,
        keywords: mdKw,
      });
    }
  }

  console.log(`→ Analyse approfondie de ${c.bold}${articlesToAudit.length}${c.reset} article(s) de blog…\n`);

  const audits: ArticleAudit[] = [];
  let totalScoreSum = 0;
  let perfectCount = 0;
  let warningCount = 0;
  let failureCount = 0;

  for (let i = 0; i < articlesToAudit.length; i++) {
    const art = articlesToAudit[i];
    const audit = await auditArticle(art, validServiceSlugs, manifest);
    audits.push(audit);
    totalScoreSum += audit.totalScore;

    if (audit.criticalFailures.length > 0 || audit.grade === "F") {
      failureCount++;
    } else if (audit.grade === "S+" || audit.grade === "A") {
      perfectCount++;
      if (audit.warnings.length > 0) warningCount++;
    } else {
      warningCount++;
    }

    const gradeColor =
      audit.grade === "S+"
        ? c.green
        : audit.grade === "A"
        ? c.cyan
        : audit.grade === "B"
        ? c.yellow
        : c.red;

    console.log(
      `[${String(i + 1).padStart(2, "0")}/${articlesToAudit.length}] ` +
        `${gradeColor}${c.bold}[${audit.grade}]${c.reset} ` +
        `${audit.totalScore.toString().padStart(3, " ")}/100 · ` +
        `${c.bold}${art.slug}${c.reset} ` +
        `(${audit.wordsCount} mots)`
    );

    if (audit.criticalFailures.length > 0) {
      for (const fail of audit.criticalFailures) {
        console.log(`      ${c.red}✗ ${fail}${c.reset}`);
      }
    }
    if (audit.warnings.length > 0 && (slugArg || fileArg || audit.criticalFailures.length > 0)) {
      for (const warn of audit.warnings) {
        console.log(`      ${c.yellow}⚠ ${warn}${c.reset}`);
      }
    }
  }

  if (articlesToAudit.length === 1) {
    const single = audits[0];
    console.log(`\n${c.bold}${c.cyan}─────────────────────────────────────────────────────────────────────${c.reset}`);
    console.log(`${c.bold}DIAGNOSTIC DÉTAILLÉ DE L'ARTICLE :${c.reset} « ${single.title} »`);
    console.log(`${c.bold}${c.cyan}─────────────────────────────────────────────────────────────────────${c.reset}`);

    for (const [key, pillar] of Object.entries(single.pillars)) {
      console.log(`\n${c.bold}${c.magenta}◆ ${pillar.name} (${pillar.points}/${pillar.maxPoints} pts)${c.reset}`);
      for (const chk of pillar.checks) {
        const icon = chk.passed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
        console.log(`  ${icon} ${chk.label.padEnd(38, " ")} [${chk.score}/${chk.weight}]`);
        console.log(`     ${c.dim}Valeur : ${chk.value} | Attendu : ${chk.expected}${c.reset}`);
      }
    }
  }

  const avgScore = (totalScoreSum / audits.length).toFixed(1);
  console.log(`\n${c.bold}${c.cyan}═════════════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}BILAN GLOBAL DE CONFORMITÉ SEO / GEO / AIO / ZERO TRACE D'IA :${c.reset}`);
  console.log(`  • Articles analysés : ${c.bold}${audits.length}${c.reset}`);
  console.log(`  • Score moyen       : ${c.bold}${avgScore}/100${c.reset}`);
  console.log(`  • Rang S+ & A (Élite) : ${c.green}${perfectCount}${c.reset}`);
  console.log(`  • Rang B (Mineurs)    : ${c.yellow}${warningCount}${c.reset}`);
  console.log(`  • Rang F (Bloquants)  : ${c.red}${failureCount}${c.reset}`);
  console.log(`${c.bold}${c.cyan}═════════════════════════════════════════════════════════════════════${c.reset}\n`);

  const dateStr = new Date().toISOString().slice(0, 10);
  const auditDir = path.join(process.cwd(), "docs", "audits");
  if (!existsSync(auditDir)) mkdirSync(auditDir, { recursive: true });
  const reportPath = path.join(auditDir, `audit-blog-elite-${dateStr}.md`);

  const mdLines: string[] = [];
  mdLines.push(`# 🛡️ Rapport d'Audit Élite Blog : Domination Google & IA — ${dateStr}`);
  mdLines.push("");
  mdLines.push(`> **Échantillon :** ${audits.length} article(s) audité(s) · **Score moyen :** ${avgScore}/100`);
  mdLines.push(`> **Statut :** ${failureCount === 0 ? "✅ 100 % CONFORME ÉLITE" : "❌ ANOMALIES BLOQUANTES DÉTECTÉES"}`);
  mdLines.push("");
  mdLines.push("## 📊 Tableau récapitulatif");
  mdLines.push("");
  mdLines.push("| Rang | Score | Slug | Mots | SEO (30) | GEO (25) | Humain (25) | CRO (10) | Médias (10) | Statut |");
  mdLines.push("|---|---|---|---|---|---|---|---|---|---|");

  for (const a of audits) {
    const s = a.pillars;
    const status = a.criticalFailures.length === 0 ? "✓ Validé" : "✗ Rejeté";
    mdLines.push(
      `| **${a.grade}** | **${a.totalScore}/100** | \`${a.slug}\` | ${a.wordsCount} | ${s.seo.points}/${s.seo.maxPoints} | ${s.geo.points}/${s.geo.maxPoints} | ${s.human.points}/${s.human.maxPoints} | ${s.cro.points}/${s.cro.maxPoints} | ${s.visual.points}/${s.visual.maxPoints} | ${status} |`
    );
  }

  if (failureCount > 0) {
    mdLines.push("");
    mdLines.push("## 🚨 Anomalies bloquantes par article");
    mdLines.push("");
    for (const a of audits.filter((x) => x.criticalFailures.length > 0)) {
      mdLines.push(`### \`${a.slug}\``);
      for (const f of a.criticalFailures) {
        mdLines.push(`- ❌ ${f}`);
      }
      mdLines.push("");
    }
  }

  writeFileSync(reportPath, mdLines.join("\n"), "utf8");
  console.log(`✓ Rapport détaillé généré dans : ${c.dim}${reportPath}${c.reset}\n`);

  await db.$disconnect();

  if (failureCount > 0) {
    console.error(`${c.bgRed}${c.white}${c.bold} ÉCHEC : ${failureCount} article(s) ne respectent pas les standards d'autorité. ${c.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${c.bgGreen}${c.white}${c.bold} SUCCÈS : 100 % des articles audités sont taillés pour dominer Google et les IA. ${c.reset}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Erreur critique d'exécution :", err);
  process.exit(1);
});

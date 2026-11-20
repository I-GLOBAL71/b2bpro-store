/**
 * CLI : `bun run audit:ai-traces`
 *
 * AUDIT PROFOND ANTI-TRACES D'IA — chaque service et chaque article de blog est passé
 * au crible sur cinq familles de signatures d'écriture automatique :
 *
 *  1. DUPLICATION TRANSVERSE : phrases, titres H2, questions de FAQ, puces et détails
 *     de process répétés mot pour mot d'une fiche à l'autre (coutures de gabarits —
 *     ce qu'un lecteur qui ouvre deux onglets repère immédiatement).
 *  2. TYPOGRAPHIE MÉCANIQUE : tirets cadratins « — », décimales à point (« 98.6 % »),
 *     guillemets droits, doubles espaces, points de suspension en milieu de phrase.
 *  3. LEXIQUE TÉLÉGUIDÉ : connecteurs et clichés caractéristiques d'une génération
 *     automatique (« il est important de noter », « en conclusion », « à l'ère du »,
 *     « permettant de » en densité, etc.) — sévérité HAUT / MOYEN / FAIBLE.
 *  4. RYTHME UNIFORME : longueur des phrases quasi constante (faible « burstiness »)
 *     dans une même description.
 *  5. BLOG : duplication inter-articles + mêmes familles de contrôles.
 *
 * Passerelles complémentaires : vendeurs (bios) et avis (échantillon) balayés en
 * priorité FAIBLE — le périmètre prioritaire reste fiches services + articles.
 *
 * Sortie : rapport console + docs/audits/audit-ai-traces-<date>.md (versionné).
 * Code sortie 1 si signature HAUT, erreur typographique, ou phrase répétée sur
 * ≥ SEUIL_DUP fiches — sinon 0.
 *
 * Complément de `bun run guard` (porte binaire de contenu) et de `bun run audit:content`
 * (SEO/GEO/AIO) : le présent audit couvre ce qu'aucun des deux ne regarde — la voix.
 */
import { mkdirSync, writeFileSync } from "fs";
import { db } from "../src/lib/db";

/* ── Paramètres du standard ─────────────────────────────────────────────── */
const SEUIL_DUP = 4; // une phrase répétée sur ≥ 4 fiches = signature de gabarit
const BURSTINESS_MIN = 4.0; // écart-type minimal des longueurs de phrases (mots)
const MAX_PERMETTRE = 3; // occurrences max de « permet(tant) de » par fiche

type Sev = "HAUT" | "MOYEN" | "FAIBLE";

interface Finding {
  sev: Sev;
  cat: string;
  detail: string;
}

interface LexRule {
  id: string;
  sev: Sev;
  re: RegExp;
  note: string;
}

/* ── 3. Lexique téléguidé — règles (insensibles à la casse) ─────────────── */
const LEX_RULES: LexRule[] = [
  // HAUT — connecteurs/clichés que l'écriture humaine spontanée n'emploie pas en masse
  { id: "il-est-important", sev: "HAUT", re: /\bil (est|convient) (important|essentiel|crucial) de (noter|préciser|mentionner|souligner|comprendre)/i, note: "connecteur d'apparat" },
  { id: "il-faut-noter", sev: "HAUT", re: /\bil faut (savoir|noter|retenir) que\b|\bil faut (noter|retenir)\b/i, note: "connecteur d'apparat" },
  { id: "il-vaut-la-peine", sev: "HAUT", re: /\bil vaut la peine/i, note: "calque d'anglais" },
  { id: "en-conclusion", sev: "HAUT", re: /\b(en conclusion|en somme|en résumé|pour conclure|pour résumer|en guise de conclusion)\b/i, note: "boucle de conclusion automatique" },
  { id: "connecteur-tete", sev: "HAUT", re: /(?:^|(?<=[.!?…]\s))(de plus|en outre|de surcroît|par ailleurs|par conséquent|dès lors)[,\s]/i, note: "connecteur en tête de phrase" },
  { id: "en-tant-que", sev: "HAUT", re: /\ben tant que\b/i, note: "calque d'anglais" },
  { id: "ere-numerique", sev: "HAUT", re: /\bà l'era (du|de)|à l'ère (du|de la|des)|dans un monde où\b/i, note: "cliché d'introduction" },
  { id: "plongeons", sev: "HAUT", re: /\b(plongeons|plongez dans|décortiquons|entamons|explorons ensemble)\b/i, note: "verbe de démonstration" },
  { id: "non-seulement", sev: "HAUT", re: /\bnon seulement\b.{0,80}\bmais (aussi|encore)\b/i, note: "balancier binaire" },
  { id: "pas-seulement", sev: "HAUT", re: /\b(ce n'est pas (juste|seulement)|pas seulement)\b/i, note: "balancier binaire" },
  { id: "points-cles", sev: "HAUT", re: /\b(points? clés?|l'essentiel à retenir|à retenir :)\b/i, note: "étiquette de synthèse" },
  // MOYEN — clichés lexicaux récurrents dans les générateurs
  { id: "revolutionner", sev: "MOYEN", re: /\b(révolutionn\w+|repousser les limites|propuls\w+|booster|débloquer (tout )?(le )?potentiel)\b/i, note: "grandiloquence promo" },
  { id: "a-la-hauteur", sev: "MOYEN", re: /\bà la hauteur de (vos|votre) (attentes|exigences)\b/i, note: "formule passe-partout" },
  { id: "sans-compromis", sev: "MOYEN", re: /\bsans (le moindre )?compromis\b/i, note: "formule passe-partout" },
  { id: "adn", sev: "MOYEN", re: /\bnotre (adn|identité)\b/i, note: "jargon corporate" },
  { id: "exigence-exception", sev: "MOYEN", re: /\bexigence[s]? (exceptionnelle[s]?|particulière[s]?)\b/i, note: "jargon corporate" },
  // FAIBLE — densité surveillée
  { id: "permettant-de", sev: "FAIBLE", re: /\bpermettant de\b/i, note: "cruche syntaxique (densité)" },
  { id: "notamment", sev: "FAIBLE", re: /\bnotamment\b/i, note: "densité" },
  { id: "sur-mesure", sev: "FAIBLE", re: /\bsur mesure\b/i, note: "densité" },
  { id: "dynamique", sev: "FAIBLE", re: /\bdynamique\b/i, note: "densité" },
];

/* ── Outils ──────────────────────────────────────────────────────────────── */
function normKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Découpe en unités comparables : lignes, puces, phrases. */
function units(text: string): string[] {
  const out: string[] = [];
  for (const rawLine of text.split(/\n+/)) {
    const line = rawLine.replace(/^[-•✓✔]+\s*/, "").replace(/^#+\s*/, "").trim();
    if (!line) continue;
    for (const s of line.split(/(?<=[.!?…])\s+/)) {
      const t = s.trim();
      if (t.length >= 25) out.push(t); // fragments trop courts = bruit
    }
  }
  return out;
}

function scanLex(text: string): Finding[] {
  const hits: Finding[] = [];
  for (const r of LEX_RULES) {
    const m = text.match(r.re);
    if (m) {
      hits.push({ sev: r.sev, cat: `lexique:${r.id}`, detail: `« ${m[0].slice(0, 60)} » — ${r.note}` });
    }
  }
  // Densités (comptes absolus par texte long)
  const nPermet = (text.match(/\bpermet(?:tant)? de\b/gi) || []).length;
  if (nPermet > MAX_PERMETTRE) {
    hits.push({ sev: "FAIBLE", cat: "lexique:permet-densite", detail: `${nPermet} occurrences de « permet(tant) de »` });
  }
  return hits;
}

function scanTypo(text: string): Finding[] {
  const hits: Finding[] = [];
  const dotDec = text.match(/\d+[.]\d+\s?%/g);
  if (dotDec) hits.push({ sev: "HAUT", cat: "typo:decimal-point", detail: `décimale à point : ${dotDec.slice(0, 3).join(" ")}` });
  const glue = text.match(/\d%/g);
  if (glue) hits.push({ sev: "MOYEN", cat: "typo:percent-colle", detail: `% collé au chiffre : ${glue.slice(0, 3).join(" ")}` });
  if (/—/.test(text)) {
    const n = (text.match(/—/g) || []).length;
    hits.push({ sev: "HAUT", cat: "typo:cadratin", detail: `${n} tiret(s) cadratin(s)` });
  }
  const dq = text.match(/"[^"\n]{4,}"/g);
  if (dq) hits.push({ sev: "MOYEN", cat: "typo:guillemets-droits", detail: `${dq.length} paire(s) de guillemets droits` });
  if (/ {2,}/.test(text)) {
    const n = (text.match(/ {2,}/g) || []).length;
    hits.push({ sev: "MOYEN", cat: "typo:double-espace", detail: `${n} double(s) espace(s)` });
  }
  const ell = (text.match(/…/g) || []).length;
  if (ell > 1) hits.push({ sev: "FAIBLE", cat: "typo:ellipsis", detail: `${ell} points de suspension` });
  return hits;
}

function stdev(nums: number[]): number {
  if (nums.length < 3) return Infinity; // pas assez de phrases pour juger
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
}

/* ── Audit principal ─────────────────────────────────────────────────────── */
async function main() {
  const services = await db.service.findMany();
  const posts = await db.blogPost.findMany();
  const sellers = await db.seller.findMany();
  const reviews = await db.review.findMany({ take: 400 });

  const findings: Finding[] = [];
  const svcBySlug = new Map<string, Finding[]>();
  const dupSentences = new Map<string, Set<string>>(); // phrase normalisée → slugs
  const dupH2 = new Map<string, Set<string>>();
  const dupFaqQ = new Map<string, Set<string>>();
  const dupBullets = new Map<string, Set<string>>(); // features + deliverables + process details

  /* ── Services ── */
  for (const s of services) {
    const local: Finding[] = [];
    const fullText = `${s.title}\n${s.shortDesc}\n${s.description}\n${s.faq}`;
    local.push(...scanLex(fullText));
    local.push(...scanTypo(`${s.shortDesc}\n${s.description}`));

    // Titres H2 → duplication transverse
    for (const m of s.description.matchAll(/^##\s+(.+)$/gm)) {
      const k = normKey(m[1]);
      if (!dupH2.has(k)) dupH2.set(k, new Set());
      dupH2.get(k)!.add(s.slug);
    }

    // Phrases (description + FAQ réponses) → duplication transverse
    for (const u of units(`${s.description}\n${s.faq}`)) {
      const k = normKey(u);
      if (!dupSentences.has(k)) dupSentences.set(k, new Set());
      dupSentences.get(k)!.add(s.slug);
    }

    // Questions FAQ → duplication
    try {
      for (const f of JSON.parse(s.faq) as { q: string; a: string }[]) {
        const k = normKey(f.q);
        if (!dupFaqQ.has(k)) dupFaqQ.set(k, new Set());
        dupFaqQ.get(k)!.add(s.slug);
      }
    } catch { /* FAQ illisible : ignorée (le guard la couvre) */ }

    // Puces (features, deliverables, process) → duplication
    for (const field of [s.features, s.deliverables]) {
      try {
        for (const item of JSON.parse(field) as string[]) {
          const k = normKey(item);
          if (!dupBullets.has(k)) dupBullets.set(k, new Set());
          dupBullets.get(k)!.add(s.slug);
        }
      } catch { /* JSON invalide : le guard le signale déjà */ }
    }
    try {
      for (const step of JSON.parse(s.process) as { detail: string }[]) {
        for (const u of units(step.detail)) {
          const k = normKey(u);
          if (!dupBullets.has(k)) dupBullets.set(k, new Set());
          dupBullets.get(k)!.add(s.slug);
        }
      }
    } catch { /* idem */ }

    // Rythme — burstiness de la description seule
    const descUnits = units(s.description);
    const lengths = descUnits.map((u) => u.split(/\s+/).length);
    const sd = stdev(lengths);
    if (sd !== Infinity && sd < BURSTINESS_MIN) {
      local.push({ sev: "MOYEN", cat: "rythme:uniforme", detail: `écart-type ${sd.toFixed(1)} sur ${lengths.length} phrases` });
    }

    svcBySlug.set(s.slug, local);
    findings.push(...local);
  }

  /* ── Blog ── */
  const postFindings: { slug: string; findings: Finding[] }[] = [];
  const blogDup = new Map<string, Set<string>>();
  for (const p of posts) {
    const local: Finding[] = [];
    const full = `${p.title}\n${p.excerpt}\n${p.content}`;
    local.push(...scanLex(full));
    local.push(...scanTypo(p.content));
    for (const u of units(p.content)) {
      const k = normKey(u);
      if (!blogDup.has(k)) blogDup.set(k, new Set());
      blogDup.get(k)!.add(p.slug);
    }
    postFindings.push({ slug: p.slug, findings: local });
    findings.push(...local);
  }

  /* ── Vendeurs (bios) + avis (échantillon) — priorité FAIBLE ── */
  let sellersFlagged = 0;
  for (const s of sellers) {
    const f = [...scanLex(s.bio), ...scanTypo(s.bio)];
    if (f.length > 0) sellersFlagged++;
    findings.push(...f.map((x) => ({ ...x, cat: `vendeur:${x.cat}` })));
  }
  let reviewsFlagged = 0;
  for (const r of reviews) {
    const f = [...scanLex(r.comment), ...scanTypo(r.comment)];
    if (f.length > 0) reviewsFlagged++;
    findings.push(...f.map((x) => ({ ...x, cat: `avis:${x.cat}` })));
  }

  /* ── Consolidation des duplications ── */
  const dupSentenceHits = [...dupSentences.entries()].filter(([, slugs]) => slugs.size >= 2)
    .sort((a, b) => b[1].size - a[1].size);
  const dupSentenceHigh = [...dupSentences.entries()].filter(([, slugs]) => slugs.size >= SEUIL_DUP)
    .sort((a, b) => b[1].size - a[1].size);
  const dupH2Hits = [...dupH2.entries()].filter(([, slugs]) => slugs.size >= SEUIL_DUP)
    .sort((a, b) => b[1].size - a[1].size);
  const dupFaqHits = [...dupFaqQ.entries()].filter(([, slugs]) => slugs.size >= SEUIL_DUP)
    .sort((a, b) => b[1].size - a[1].size);
  const dupBulletHits = [...dupBullets.entries()].filter(([, slugs]) => slugs.size >= SEUIL_DUP)
    .sort((a, b) => b[1].size - a[1].size);
  const blogDupHits = [...blogDup.entries()].filter(([, slugs]) => slugs.size >= 2)
    .sort((a, b) => b[1].size - a[1].size);

  /* ── Verdict ── */
  const haut = findings.filter((f) => f.sev === "HAUT").length;
  const moyen = findings.filter((f) => f.sev === "MOYEN").length;
  const faible = findings.filter((f) => f.sev === "FAIBLE").length;

  console.log("═════════════════════════════════════════════════════");
  console.log("  AUDIT ANTI-TRACES D'IA — b2bpro.store");
  console.log(`  ${services.length} services · ${posts.length} articles · ${sellers.length} vendeurs · ${reviews.length} avis (échantillon)`);
  console.log("═════════════════════════════════════════════════════");
  console.log(`  Signatures lexicales/typo : HAUT ${haut} · MOYEN ${moyen} · FAIBLE ${faible}`);
  console.log(`  Phrases partagées ≥ 2 fiches : ${dupSentenceHits.length}`);
  console.log(`  Titres H2 partagés ≥ ${SEUIL_DUP} fiches : ${dupH2Hits.length}`);
  console.log(`  Questions FAQ partagées ≥ ${SEUIL_DUP} fiches : ${dupFaqHits.length}`);
  console.log(`  Puces/détails partagés ≥ ${SEUIL_DUP} fiches : ${dupBulletHits.length}`);
  console.log(`  Phrases partagées entre articles : ${blogDupHits.length}`);
  console.log(`  Vendeurs avec signature : ${sellersFlagged}/${sellers.length} · avis : ${reviewsFlagged}/${reviews.length}`);

  console.log("\n  ── Top phrases mot pour mot répétées entre fiches ──");
  for (const [k, slugs] of dupSentenceHits.slice(0, 12)) {
    console.log(`  [${slugs.size}×] ${k.slice(0, 90)}`);
  }
  console.log("\n  ── Top titres H2 répétés ──");
  for (const [k, slugs] of dupH2Hits.slice(0, 10)) {
    console.log(`  [${slugs.size}×] ${k.slice(0, 80)}`);
  }
  console.log("\n  ── Top questions FAQ répétées ──");
  for (const [k, slugs] of dupFaqHits.slice(0, 8)) {
    console.log(`  [${slugs.size}×] ${k.slice(0, 80)}`);
  }
  console.log("\n  ── Top puces/détails répétés ──");
  for (const [k, slugs] of dupBulletHits.slice(0, 12)) {
    console.log(`  [${slugs.size}×] ${k.slice(0, 90)}`);
  }
  if (blogDupHits.length) {
    console.log("\n  ── Phrases répétées entre articles de blog ──");
    for (const [k, slugs] of blogDupHits.slice(0, 8)) {
      console.log(`  [${slugs.size}×] ${k.slice(0, 90)}`);
    }
  }

  const servFail = [...svcBySlug.entries()].filter(([, f]) => f.some((x) => x.sev === "HAUT"));
  if (servFail.length) {
    console.log(`\n  ── ${servFail.length} fiche(s) avec signature HAUT ──`);
    for (const [slug, f] of servFail.slice(0, 15)) {
      for (const x of f.filter((y) => y.sev === "HAUT").slice(0, 2)) {
        console.log(`  [${slug.slice(0, 40)}] ${x.cat} → ${x.detail.slice(0, 70)}`);
      }
    }
  }
  const postFail = postFindings.filter((p) => p.findings.some((x) => x.sev === "HAUT"));
  if (postFail.length) {
    console.log(`\n  ── ${postFail.length} article(s) avec signature HAUT ──`);
    for (const p of postFail) {
      for (const x of p.findings.filter((y) => y.sev === "HAUT").slice(0, 3)) {
        console.log(`  [${p.slug.slice(0, 40)}] ${x.cat} → ${x.detail.slice(0, 70)}`);
      }
    }
  }

  /* ── Rapport markdown versionné ── */
  const L: string[] = [];
  L.push(`# Audit anti-traces d'IA — ${new Date().toISOString().slice(0, 10)}`);
  L.push("");
  L.push(`**${services.length} services** · **${posts.length} articles** · ${sellers.length} vendeurs · ${reviews.length} avis (échantillon).`);
  L.push(`Signatures : HAUT **${haut}** · MOYEN **${moyen}** · FAIBLE **${faible}**.`);
  L.push(`Phrases répétées ≥ 2 fiches : **${dupSentenceHits.length}** · H2 ≥ ${SEUIL_DUP} fiches : **${dupH2Hits.length}** · FAQ ≥ ${SEUIL_DUP} : **${dupFaqHits.length}** · puces ≥ ${SEUIL_DUP} : **${dupBulletHits.length}** · entre articles : **${blogDupHits.length}**.`);
  L.push("");
  L.push("## Phrases mot pour mot partagées entre fiches (top 40)");
  L.push("");
  L.push("| Fiches | Phrase |");
  L.push("|---|---|");
  for (const [k, slugs] of dupSentenceHits.slice(0, 40)) {
    L.push(`| ${slugs.size} | ${k.slice(0, 110).replace(/\|/g, "/")} |`);
  }
  L.push("");
  L.push("## Titres H2 partagés");
  L.push("");
  L.push("| Fiches | Titre |");
  L.push("|---|---|");
  for (const [k, slugs] of dupH2Hits) {
    L.push(`| ${slugs.size} | ${k.slice(0, 80).replace(/\|/g, "/")} |`);
  }
  L.push("");
  L.push("## Questions FAQ partagées");
  L.push("");
  L.push("| Fiches | Question |");
  L.push("|---|---|");
  for (const [k, slugs] of dupFaqHits) {
    L.push(`| ${slugs.size} | ${k.slice(0, 80).replace(/\|/g, "/")} |`);
  }
  L.push("");
  L.push("## Puces et détails de process partagés (top 40)");
  L.push("");
  L.push("| Fiches | Puce / détail |");
  L.push("|---|---|");
  for (const [k, slugs] of dupBulletHits.slice(0, 40)) {
    L.push(`| ${slugs.size} | ${k.slice(0, 110).replace(/\|/g, "/")} |`);
  }
  if (blogDupHits.length) {
    L.push("");
    L.push("## Phrases partagées entre articles");
    L.push("");
    L.push("| Articles | Phrase |");
    L.push("|---|---|");
    for (const [k, slugs] of blogDupHits.slice(0, 20)) {
      L.push(`| ${slugs.size} | ${k.slice(0, 110).replace(/\|/g, "/")} |`);
    }
  }
  L.push("");
  L.push("## Signatures par fiche (HAUT uniquement)");
  L.push("");
  for (const [slug, f] of svcBySlug.entries()) {
    const hauts = f.filter((x) => x.sev === "HAUT");
    if (hauts.length) {
      L.push(`- **${slug}** : ${hauts.map((x) => `${x.cat} (${x.detail})`).join(" · ")}`);
    }
  }
  L.push("");
  L.push("## Signatures par article (HAUT uniquement)");
  L.push("");
  for (const p of postFindings) {
    const hauts = p.findings.filter((x) => x.sev === "HAUT");
    if (hauts.length) {
      L.push(`- **${p.slug}** : ${hauts.map((x) => `${x.cat} (${x.detail})`).join(" · ")}`);
    }
  }
  mkdirSync("docs/audits", { recursive: true });
  const file = `docs/audits/audit-ai-traces-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(file, L.join("\n") + "\n");
  console.log(`\n  Rapport détaillé : ${file}`);

  const failure =
    haut > 0 ||
    dupSentenceHigh.length > 0 ||
    dupH2Hits.length > 0 ||
    dupFaqHits.length > 0 ||
    dupBulletHits.length > 0 ||
    blogDupHits.length > 0;
  console.log("───────────────────────────────────────────────────────");
  console.log(failure
    ? `  RÉSULTAT : ✗ ${haut} signature(s) HAUT · ${dupSentenceHigh.length} phrase(s) répétée(s) sur ≥ ${SEUIL_DUP} fiches · ${dupH2Hits.length + dupFaqHits.length + dupBulletHits.length} familles de répétitions transverses · ${blogDupHits.length} répétition(s) inter-articles.`
    : "  RÉSULTAT : ✓ aucune signature transverse ni téléguidée détectée.");
  process.exit(failure ? 1 : 0);
}

main()
  .catch((e) => {
    console.error("✗ Échec de l'audit :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

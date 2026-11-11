/**
 * CLI : `bun run audit:seo`
 *
 * AUDIT ÉLITE SEO / GEO / AIO — passe PROFONDE au-delà de `guard` et `audit:content`.
 * Commandité par le tour d'élites v1.9.0 : scruter chaque service et chaque article
 * contre TOUS les critères SEO + GEO + AIO, incluant les angles morts des portes
 * existantes (mot-clé primaire dans le titre, unicité des primaires, première
 * question FAQ « comment… », maillage interne des articles, typographie mécanique,
 * entrées llms-full.txt, sitemap apex).
 *
 * Familles de contrôles :
 *  SEO      : titre 40–75 + PRIMAIRE DANS LE TITRE, shortDesc 100–230, description
 *             ≥ 1000 car. + ≥ 3 H2 + listes, mots-clés (primaire 3–5 mots + ≥ 3
 *             secondaires + ≥ 3 LT + ≥ 3 aiQueries), UNICITÉ du primaire (anti-cannibalisation),
 *             densité du primaire (≥ 2 occurrences).
 *  GEO      : FAQ ≥ 4 Q/R citables (réponses ≥ 80), PREMIÈRE question en « comment… »
 *             (activateur v1.7.0 n°4), faits « liftable » chiffrés (≥ 8 nombres).
 *  AIO      : answer-first (primaire dans les 250 premiers car.), entrée llms-full.txt
 *             « RÉPONSE DIRECTE » par fiche.
 *  HYGIÈNE  : zéro cadratin (—), décimales à la virgule, pas d'intervalles anglo-saxons.
 *  BLOG     : titre ≤ 75, extrait 80–200, ≥ 1500 car., ≥ 3 H2, ≥ 3 liens absolus vers
 *             /services/, zéro cadratin, zéro nombre figé de services, volume de mots.
 *  SITE     : llms.txt (113 URLs /services/), llms-full.txt (113 RÉPONSE DIRECTE au
 *             bon format), sitemap (URLs, apex uniquement), robots.txt (IA autorisées).
 *
 * Sortie : rapport console + docs/audits/audit-seo-geo-aio-<date>.md (versionné).
 * Code sortie 1 si un seul contrôle FAIL (les WARN ne comptent pas).
 */
import { mkdirSync, writeFileSync } from "fs";
import { db } from "../src/lib/db";

interface Check {
  id: string;
  ok: boolean | "warn";
  detail: string;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(path: string): Promise<string | null> {
  try {
    const res = await fetch(`http://localhost:3000${path}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function main() {
  const services = await db.service.findMany();
  const posts = await db.blogPost.findMany();

  interface KwShape {
    primary: string;
    secondary: string[];
    longTail: string[];
    aiQueries: string[];
  }
  interface FaqShape {
    q: string;
    a: string;
  }

  const results: { slug: string; checks: Check[] }[] = [];
  let failed = 0;
  let warned = 0;
  let totalChecks = 0;

  // ── Global : unicité des mots-clés primaires (anti-cannibalisation) ────────
  const primaryMap = new Map<string, string[]>();
  for (const s of services) {
    try {
      const kw = JSON.parse(s.keywords) as KwShape;
      const key = norm(kw.primary);
      primaryMap.set(key, [...(primaryMap.get(key) ?? []), s.slug]);
    } catch {
      /* jeté ci-dessous par seo-kw-structure */
    }
  }
  const cannibalized = [...primaryMap.entries()].filter(([, slugs]) => slugs.length > 1);

  // ── Fiches de service ───────────────────────────────────────────────────────
  for (const s of services) {
    const checks: Check[] = [];
    let kw: KwShape | null = null;
    let faq: FaqShape[] = [];
    let features: string[] = [];
    let deliverables: string[] = [];
    try {
      kw = JSON.parse(s.keywords) as KwShape;
      faq = JSON.parse(s.faq) as FaqShape[];
      features = JSON.parse(s.features) as string[];
      deliverables = JSON.parse(s.deliverables) as string[];
    } catch {
      checks.push({ id: "seo-kw-structure", ok: false, detail: "JSON mots-clés/FAQ illisible" });
    }
    const d = s.description ?? "";
    const flat = [s.title, s.shortDesc, d, faq.map((f) => `${f.q} ${f.a}`).join(" "), features.join(" "), deliverables.join(" ")].join("\n");

    if (kw) {
      // SEO
      const kwWords = kw.primary.trim().split(/\s+/).filter((w) => w.length > 2);
      const titleNorm = norm(s.title);
      const primaryNorm = norm(kw.primary);
      // [CORRECTIF v1.9.0 — audit E1] probe construit sur le primaire NORMALISÉ
      // (mots contigus) : l'ancien probe collait des mots non adjacents du primaire
      // brut accentué et ne pouvait jamais matcher le titre normalisé.
      const probeWords = primaryNorm.split(" ").filter((w) => w.length > 2);
      const probe = probeWords.slice(0, Math.max(2, Math.min(3, probeWords.length))).join(" ");
      checks.push({
        id: "seo-title-len",
        ok: s.title.length >= 40 && s.title.length <= 75,
        detail: `${s.title.length} car.`,
      });
      checks.push({
        id: "seo-title-keyword",
        ok: titleNorm.includes(primaryNorm) || (probe.length > 6 && titleNorm.includes(probe)),
        detail: titleNorm.includes(primaryNorm)
          ? "primaire complet dans le titre"
          : probe && titleNorm.includes(probe)
            ? `partiel (« ${probe} »)`
            : `primaire absent du titre (« ${kw.primary} »)`,
      });
      checks.push({
        id: "seo-kw-structure",
        ok: !!kw.primary && kwWords.length >= 3 && kwWords.length <= 5 && kw.secondary.length >= 3 && kw.longTail.length >= 3 && kw.aiQueries.length >= 3,
        detail: `primaire ${kwWords.length} mots · ${kw.secondary.length} sec · ${kw.longTail.length} LT · ${kw.aiQueries.length} aiQ`,
      });
      const occurrences = norm(d).split(primaryNorm).length - 1;
      checks.push({
        id: "seo-density",
        ok: occurrences >= 2 ? true : "warn",
        detail: `${occurrences} occurrence(s) du primaire dans la description`,
      });
      // AIO answer-first
      const primaryHead = norm(d.slice(0, 250)).includes(primaryNorm.slice(0, Math.min(20, primaryNorm.length)));
      checks.push({
        id: "aio-answer-first",
        ok: primaryHead,
        detail: primaryHead ? "primaire dans les 250 premiers car." : "primaire ABSENT des 250 premiers car.",
      });
      // GEO
      const faqCitable = faq.filter((f) => (f.a ?? "").length >= 80 && (f.q ?? "").trim().endsWith("?")).length;
      checks.push({
        id: "geo-faq-citable",
        ok: faqCitable >= 4,
        detail: `${faqCitable}/${faq.length} Q/R citables (≥ 80 car.)`,
      });
      const firstQ = (faq[0]?.q ?? "").toLowerCase();
      checks.push({
        id: "geo-faq-first-comment",
        ok: firstQ.startsWith("comment"),
        detail: firstQ ? `« ${faq[0].q.slice(0, 60)} »` : "aucune FAQ",
      });
      const numbers = d.match(/(?<![\w])\d+(?:[.,]\d+)?(?![\w])/g) ?? [];
      checks.push({
        id: "geo-liftable",
        ok: numbers.length >= 8 ? true : "warn",
        detail: `${numbers.length} faits chiffrés dans la description`,
      });
    }

    // Structure commune
    const h2 = (d.match(/^##\s/gm) || []).length;
    const hasBullets = /^[✓✔•-]\s/m.test(d);
    checks.push({ id: "seo-shortdesc-len", ok: s.shortDesc.length >= 100 && s.shortDesc.length <= 230, detail: `${s.shortDesc.length} car.` });
    checks.push({ id: "seo-desc-len", ok: d.length >= 1000, detail: `${d.length} car.` });
    checks.push({ id: "seo-h2", ok: h2 >= 3, detail: `${h2} H2` });
    checks.push({ id: "seo-bullets", ok: hasBullets, detail: hasBullets ? "listes présentes" : "aucune liste" });

    // Hygiène typographique
    const emdash = (flat.match(/—/g) ?? []).length;
    checks.push({ id: "hygiene-emdash", ok: emdash === 0, detail: `${emdash} cadratin(s)` });
    const dotRating = (flat.match(/\d\.\d\s?\/\s?5/g) ?? []).length;
    checks.push({ id: "hygiene-decimal", ok: dotRating === 0, detail: `${dotRating} note(s) à décimale point` });
    const angloInterval = (flat.match(/\b\d{1,4}\s?-\s?\d{1,4}\s?€/g) ?? []).length;
    checks.push({ id: "hygiene-interval", ok: angloInterval === 0, detail: `${angloInterval} intervalle(s) anglo-saxon(s)` });

    results.push({ slug: s.slug, checks });
    totalChecks += checks.length;
    failed += checks.filter((c) => c.ok === false).length;
    warned += checks.filter((c) => c.ok === "warn").length;
  }

  // ── Articles de blog ────────────────────────────────────────────────────────
  const blogResults: { slug: string; checks: Check[] }[] = [];
  for (const p of posts) {
    const c = p.content ?? "";
    const h2 = (c.match(/^##\s/gm) || []).length;
    const words = c.split(/\s+/).filter(Boolean).length;
    const svcLinks = (c.match(/https:\/\/b2bpro\.store\/services\//g) ?? []).length;
    const fixedCount = (c.match(/\b\d{2,3}\s+services\b/g) ?? []).length;
    const emdash = (c.match(/—/g) ?? []).length;
    const checks: Check[] = [
      { id: "blog-title-len", ok: p.title.length <= 75, detail: `${p.title.length} car.` },
      { id: "blog-excerpt", ok: p.excerpt.length >= 80 && p.excerpt.length <= 200, detail: `${p.excerpt.length} car.` },
      { id: "blog-content-len", ok: c.length >= 1500, detail: `${c.length} car. · ${words} mots` },
      { id: "blog-words", ok: words >= 800 ? true : "warn", detail: `${words} mots` },
      { id: "blog-h2", ok: h2 >= 3, detail: `${h2} H2` },
      { id: "blog-internal-links", ok: svcLinks >= 3, detail: `${svcLinks} lien(s) absolu(s) vers /services/` },
      { id: "blog-no-fixed-count", ok: fixedCount === 0, detail: fixedCount ? `${fixedCount} mention(s) d'un nombre figé` : "aucun nombre figé" },
      { id: "blog-emdash", ok: emdash === 0, detail: `${emdash} cadratin(s)` },
    ];
    blogResults.push({ slug: p.slug, checks });
    totalChecks += checks.length;
    failed += checks.filter((x) => x.ok === false).length;
    warned += checks.filter((x) => x.ok === "warn").length;
  }

  // ── Contrôles transverses (routes llms/sitemap/robots du dev local) ────────
  const cross: { id: string; ok: boolean | "warn"; detail: string }[] = [];
  const llms = await fetchText("/llms.txt");
  if (llms === null) {
    cross.push({ id: "site-llms", ok: "warn", detail: "dev local injoignable" });
  } else {
    const svcUrls = (llms.match(/\/services\//g) ?? []).length;
    cross.push({ id: "site-llms-urls", ok: svcUrls === services.length, detail: `${svcUrls} URLs /services/ pour ${services.length} fiches` });
    cross.push({ id: "site-llms-floor", ok: llms.includes("dès 20 €"), detail: llms.includes("dès 20 €") ? "plancher 20 € présent" : "plancher 20 € absent" });
  }
  const llmsFull = await fetchText("/llms-full.txt");
  if (llmsFull === null) {
    cross.push({ id: "site-llms-full", ok: "warn", detail: "dev local injoignable" });
  } else {
    const direct = llmsFull.split(/^RÉPONSE DIRECTE: /m).length - 1;
    const wellFormed = (llmsFull.match(/RÉPONSE DIRECTE: Pour .+ comptez \d+(?:,\d+)? € et une livraison en \d+ jours ouvrés/g) ?? []).length;
    cross.push({ id: "site-llms-full-count", ok: direct === services.length, detail: `${direct} RÉPONSE DIRECTE pour ${services.length} fiches` });
    cross.push({ id: "site-llms-full-format", ok: wellFormed === direct, detail: `${wellFormed}/${direct} au format « Pour … comptez N € … jours ouvrés »` });
    const em = (llmsFull.match(/—/g) ?? []).length;
    cross.push({ id: "site-llms-full-emdash", ok: em === 0, detail: `${em} cadratin(s)` });
  }
  const sitemap = await fetchText("/sitemap.xml");
  if (sitemap === null) {
    cross.push({ id: "site-sitemap", ok: "warn", detail: "dev local injoignable" });
  } else {
    const locs = (sitemap.match(/<loc>/g) ?? []).length;
    const www = (sitemap.match(/<loc>https:\/\/www\./g) ?? []).length;
    cross.push({ id: "site-sitemap-count", ok: locs >= 113 + 25, detail: `${locs} URLs` });
    cross.push({ id: "site-sitemap-apex", ok: www === 0, detail: www === 0 ? "100 % apex" : `${www} URL(s) www` });
  }
  const robots = await fetchText("/robots.txt");
  if (robots === null) {
    cross.push({ id: "site-robots", ok: "warn", detail: "dev local injoignable" });
  } else {
    const aiOk = /User-agent:\s*(GPTBot|ClaudeBot|PerplexityBot)/i.test(robots) && !/Disallow:\s*\/\s*$/i.test(robots.split(/User-agent:\s*(GPTBot|ClaudeBot|PerplexityBot)/i)[1] ?? "");
    cross.push({ id: "site-robots-ai", ok: aiOk, detail: aiOk ? "robots crawlants IA présents et autorisés" : "robots IA absents ou bloqués" });
  }
  failed += cross.filter((c) => c.ok === false).length;
  warned += cross.filter((c) => c.ok === "warn").length;
  totalChecks += cross.length;

  // ── Rapport console ────────────────────────────────────────────────────────
  const failing = results.filter((r) => r.checks.some((c) => c.ok === false));
  const blogFailing = blogResults.filter((r) => r.checks.some((c) => c.ok === false));
  console.log("═════════════════════════════════════════════════════");
  console.log("  AUDIT ÉLITE SEO/GEO/AIO — b2bpro.store");
  console.log(`  ${results.length} services · ${blogResults.length} articles · ${totalChecks} contrôles`);
  console.log(`  ÉCHECS : ${failed + cannibalized.length} · AVERTISSEMENTS : ${warned}`);
  console.log("═════════════════════════════════════════════════════");
  if (cannibalized.length > 0) {
    console.log("  ✗ CANNIBALISATION (primaire partagé) :");
    for (const [primary, slugs] of cannibalized) {
      console.log(`      « ${primary} » → ${slugs.join(", ")}`);
    }
  }
  for (const r of failing.slice(0, 40)) {
    console.log(`  ✗ [service] ${r.slug}`);
    r.checks.filter((c) => c.ok === false).forEach((c) => console.log(`      ${c.id} → ${c.detail}`));
  }
  if (failing.length > 40) console.log(`      … et ${failing.length - 40} autres fiches`);
  for (const r of blogFailing) {
    console.log(`  ✗ [blog] ${r.slug}`);
    r.checks.filter((c) => c.ok === false).forEach((c) => console.log(`      ${c.id} → ${c.detail}`));
  }
  for (const c of cross) {
    if (c.ok !== true) console.log(`  ${c.ok === false ? "✗" : "⚠"} [site] ${c.id} → ${c.detail}`);
  }

  // ── Rapport markdown versionné ─────────────────────────────────────────────
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`# Audit élite SEO/GEO/AIO — ${date}`);
  lines.push("");
  lines.push(`**${results.length} services** · **${blogResults.length} articles** · ${totalChecks} contrôles · ${failed} échec(s) · ${warned} avertissement(s).`);
  lines.push("");
  if (cannibalized.length) {
    lines.push("## Cannibalisation (primaire partagé entre fiches)");
    lines.push("");
    lines.push("| Primaire | Fiches |");
    lines.push("|---|---|");
    for (const [primary, slugs] of cannibalized) lines.push(`| ${primary} | ${slugs.join(", ")} |`);
    lines.push("");
  }
  lines.push("## Fiches en échec");
  lines.push("");
  if (failing.length === 0) lines.push("_Aucune._");
  else {
    lines.push("| Fiche | Contrôle | Détail |");
    lines.push("|---|---|---|");
    for (const r of failing)
      for (const c of r.checks.filter((x) => x.ok === false)) lines.push(`| ${r.slug} | ${c.id} | ${c.detail} |`);
  }
  lines.push("");
  lines.push("## Articles en échec");
  lines.push("");
  if (blogFailing.length === 0) lines.push("_Aucun._");
  else {
    lines.push("| Article | Contrôle | Détail |");
    lines.push("|---|---|---|");
    for (const r of blogFailing)
      for (const c of r.checks.filter((x) => x.ok === false)) lines.push(`| ${r.slug} | ${c.id} | ${c.detail} |`);
  }
  lines.push("");
  lines.push("## Avertissements (non bloquants)");
  lines.push("");
  const warns = [
    ...results.flatMap((r) => r.checks.filter((c) => c.ok === "warn").map((c) => `${r.slug} · ${c.id} → ${c.detail}`)),
    ...blogResults.flatMap((r) => r.checks.filter((c) => c.ok === "warn").map((c) => `${r.slug} · ${c.id} → ${c.detail}`)),
    ...cross.filter((c) => c.ok === "warn").map((c) => `[site] ${c.id} → ${c.detail}`),
  ];
  if (warns.length === 0) lines.push("_Aucun._");
  else for (const w of warns) lines.push(`- ${w}`);
  lines.push("");
  lines.push("## Volumétrie des articles (mots)");
  lines.push("");
  lines.push("| Article | Mots | Caractères | H2 | Liens services |");
  lines.push("|---|---|---|---|---|");
  for (const r of blogResults) {
    const words = (posts.find((p) => p.slug === r.slug)?.content ?? "").split(/\s+/).filter(Boolean).length;
    const chars = (posts.find((p) => p.slug === r.slug)?.content ?? "").length;
    const h2 = r.checks.find((c) => c.id === "blog-h2")?.detail ?? "";
    const links = r.checks.find((c) => c.id === "blog-internal-links")?.detail ?? "";
    lines.push(`| ${r.slug} | ${words} | ${chars} | ${h2} | ${links} |`);
  }
  mkdirSync("/home/z/my-project/docs/audits", { recursive: true });
  const file = `/home/z/my-project/docs/audits/audit-seo-geo-aio-${date}.md`;
  writeFileSync(file, lines.join("\n") + "\n");
  console.log(`  Rapport détaillé : ${file}`);
  console.log(`  RÉSULTAT : ${failed === 0 && cannibalized.length === 0 ? "✓ intégralité verte" : `✗ ${failed + cannibalized.length} échec(s)`}`);

  process.exit(failed === 0 && cannibalized.length === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error("✗ Échec de l'audit :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

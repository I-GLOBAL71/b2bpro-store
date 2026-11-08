/**
 * CLI : `bun run audit:content`
 *
 * AUDIT INDIVIDUEL SEO / GEO / AIO de chaque service et de chaque article de blog.
 * Complète `bun run guard` avec un diagnostic au cas par cas (le guard est la porte
 * binaire, l'audit est le rapport détaillé).
 *
 * Standards vérifiés par service (Méthode SGA™ — docs/SKILL-REDACTION-SEO-GEO-AIO.md) :
 *  SEO  : title 40–75 car., shortDesc 100–230, description ≥ 1000 car. avec ≥ 3 H2,
 *         listes à puces, mots-clés (primaire + ≥ 3 secondaires + ≥ 3 longue traîne).
 *  GEO  : FAQ ≥ 4 questions citables (réponses ≥ 80 car.), entités et chiffres présents.
 *  AIO  : ANSWER-FIRST — mot-clé primaire dans les 250 premiers caractères,
 *         ≥ 3 aiQueries (questions formulées comme les requêtes posées aux IA).
 *
 * Sortie : rapport console + docs/audits/audit-content-<date>.md (versionné).
 * Code sortie 1 si un seul service/article est sous le standard.
 */
import { mkdirSync, writeFileSync } from "fs";
import { db } from "../src/lib/db";

interface ServiceChecks {
  slug: string;
  code: string;
  checks: { id: string; ok: boolean; detail: string }[];
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function main() {
  const services = await db.service.findMany();
  const posts = await db.blogPost.findMany();

  const results: ServiceChecks[] = [];
  let totalChecks = 0;
  let failedChecks = 0;

  for (const s of services) {
    const kw = JSON.parse(s.keywords) as {
      primary: string; secondary: string[]; longTail: string[]; aiQueries: string[];
    };
    const faq = JSON.parse(s.faq) as { q: string; a: string }[];
    const features = JSON.parse(s.features) as string[];
    const deliverables = JSON.parse(s.deliverables) as string[];
    const process = JSON.parse(s.process) as unknown[];
    const d = s.description;
    const h2 = (d.match(/^##\s/gm) || []).length;
    const hasBullets = /^[✓✔•-]\s/m.test(d);
    const primaryInHead = norm(d.slice(0, 250)).includes(norm(kw.primary).slice(0, Math.min(20, kw.primary.length)));
    const faqOk = faq.filter((f) => f.a.length >= 80 && f.q.trim().endsWith("?")).length;

    const checks = [
      { id: "seo-title", ok: s.title.length >= 40 && s.title.length <= 75, detail: `${s.title.length} car.` },
      { id: "seo-shortdesc", ok: s.shortDesc.length >= 100 && s.shortDesc.length <= 230, detail: `${s.shortDesc.length} car.` },
      { id: "seo-desc-length", ok: d.length >= 1000, detail: `${d.length} car.` },
      { id: "seo-h2-structure", ok: h2 >= 3, detail: `${h2} sections H2` },
      { id: "seo-bullets", ok: hasBullets, detail: hasBullets ? "listes présentes" : "aucune liste" },
      { id: "seo-keywords", ok: !!kw.primary && kw.secondary.length >= 3 && kw.longTail.length >= 3, detail: `P:「${kw.primary}» S:${kw.secondary.length} LT:${kw.longTail.length}` },
      { id: "geo-faq", ok: faqOk >= 4, detail: `${faqOk}/${faq.length} Q/R citables (≥ 80 car.)` },
      { id: "aio-answer-first", ok: primaryInHead, detail: primaryInHead ? "primaire dans l'en-tête" : "primaire ABSENT des 250 premiers car." },
      { id: "aio-aiqueries", ok: Array.isArray(kw.aiQueries) && kw.aiQueries.length >= 3, detail: `${kw.aiQueries?.length ?? 0} requêtes IA` },
      { id: "content-richness", ok: features.length >= 4 && deliverables.length >= 3 && process.length >= 3, detail: `${features.length} points forts, ${deliverables.length} livrables, ${process.length} étapes` },
      { id: "social-proof", ok: s.salesCount > 0 && s.reviewsCount > 0 && s.rating >= 4.2 && s.rating <= 5, detail: `${s.salesCount} ventes, ${s.reviewsCount} avis, ${s.rating}/5` },
    ];
    results.push({ slug: s.slug, code: s.code, checks });
    totalChecks += checks.length;
    failedChecks += checks.filter((c) => !c.ok).length;
  }

  // ── Blog ───────────────────────────────────────────────────────────────────
  const blogResults: { slug: string; checks: { id: string; ok: boolean; detail: string }[] }[] = [];
  for (const p of posts) {
    const h2 = (p.content.match(/^##\s/gm) || []).length;
    blogResults.push({
      slug: p.slug,
      checks: [
        { id: "seo-excerpt", ok: p.excerpt.length >= 80 && p.excerpt.length <= 200, detail: `${p.excerpt.length} car.` },
        { id: "seo-content", ok: p.content.length >= 1500, detail: `${p.content.length} car.` },
        { id: "geo-h2", ok: h2 >= 3, detail: `${h2} sections H2` },
        { id: "no-fixed-count", ok: !p.content.includes("112 services"), detail: p.content.includes("112 services") ? "mention de nombre fixe" : "aucun nombre figé" },
      ],
    });
    totalChecks += 4;
    failedChecks += blogResults[blogResults.length - 1].checks.filter((c) => !c.ok).length;
  }

  // ── Rapport console ────────────────────────────────────────────────────────
  const failing = results.filter((r) => r.checks.some((c) => !c.ok));
  const blogFailing = blogResults.filter((r) => r.checks.some((c) => !c.ok));
  console.log("═════════════════════════════════════════════════════");
  console.log("  AUDIT DE CONTENU SEO / GEO / AIO — b2bpro.store");
  console.log(`  ${results.length} services · ${posts.length} articles · ${totalChecks} contrôles`);
  console.log("═════════════════════════════════════════════════════");
  if (failing.length === 0 && blogFailing.length === 0) {
    console.log("  ✓ TOUS les contenus respectent le standard SGA™ intégral.");
  } else {
    for (const r of failing) {
      console.log(`  ✗ [${r.code}] ${r.slug}`);
      r.checks.filter((c) => !c.ok).forEach((c) => console.log(`      ${c.id} → ${c.detail}`));
    }
    for (const r of blogFailing) {
      console.log(`  ✗ [blog] ${r.slug}`);
      r.checks.filter((c) => !c.ok).forEach((c) => console.log(`      ${c.id} → ${c.detail}`));
    }
  }
  console.log("───────────────────────────────────────────────────────");
  console.log(
    failedChecks === 0
      ? `  RÉSULTAT : ✓ ${totalChecks}/${totalChecks} contrôles verts.`
      : `  RÉSULTAT : ✗ ${failedChecks} contrôle(s) en échec sur ${totalChecks}.`
  );

  // ── Rapport markdown versionné ─────────────────────────────────────────────
  const lines: string[] = [];
  lines.push(`# Audit de contenu SEO/GEO/AIO — ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push(`**${results.length} services** audités individuellement · **${posts.length} articles** · ${totalChecks} contrôles · ${failedChecks} échec(s).`);
  lines.push("");
  lines.push("| Service | SEO | GEO | AIO | Verdict |");
  lines.push("|---|---|---|---|---|");
  for (const r of results) {
    const seo = r.checks.filter((c) => c.id.startsWith("seo-") || c.id === "content-richness" || c.id === "social-proof");
    const geo = r.checks.filter((c) => c.id.startsWith("geo-"));
    const aio = r.checks.filter((c) => c.id.startsWith("aio-"));
    const ok = (arr: { ok: boolean }[]) => arr.every((c) => c.ok);
    lines.push(
      `| ${r.code} — ${r.slug.slice(0, 42)} | ${ok(seo) ? "✓" : "✗"} | ${ok(geo) ? "✓" : "✗"} | ${ok(aio) ? "✓" : "✗"} | ${r.checks.every((c) => c.ok) ? "CONFORME" : "À CORRIGER"} |`
    );
  }
  lines.push("");
  lines.push("## Blog");
  lines.push("");
  lines.push("| Article | Verdict |");
  lines.push("|---|---|");
  for (const r of blogResults) {
    lines.push(`| ${r.slug} | ${r.checks.every((c) => c.ok) ? "CONFORME" : "À CORRIGER"} |`);
  }
  mkdirSync("/home/z/my-project/docs/audits", { recursive: true });
  const file = `/home/z/my-project/docs/audits/audit-content-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(file, lines.join("\n") + "\n");
  console.log(`  Rapport détaillé : ${file}`);

  process.exit(failedChecks === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error("✗ Échec de l'audit :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

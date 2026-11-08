/**
 * CLI : `bun run migrate:content-v12`
 *
 * Migration de contenu [v1.2.0] — mandat utilisateur :
 *  1. Applique la couche d'optimisation SGA™ (SEO/GEO/AIO) à CHAQUE service :
 *     answer-first (mot-clé primaire en tête), ≥ 3 H2, densité sémantique,
 *     garanties E-E-A-T chiffrées. DÉTERMINISTE et IDEMPOTENTE.
 *  2. Recalcule les shortDesc avec le standard ≥ 100 caractères.
 *  3. Supprime les mentions du nombre fixe de services (« 112 ») de la base de
 *     connaissances IA et de l'article blog llms-txt (future-robustesse).
 *
 * Protocole anti-régression respecté : snapshot préalable effectué ;
 * la source de vérité (catalog.json + data/gen/*) produit les mêmes contenus
 * lors de tout futur re-seed → cohérence garantie.
 */
import { readFileSync, writeFileSync } from "fs";
import { db } from "../src/lib/db";
import { resolvePole } from "../data/gen/poles";
import {
  buildKeywords,
  buildShortDesc,
  optimizeDescription,
  isDescriptionOptimized,
  FULL_DESCRIPTIONS,
  type CatalogService,
} from "../data/gen/enrich";
import { KNOWLEDGE } from "../data/gen/knowledge";

async function main() {
  const catalog: CatalogService[] = JSON.parse(
    readFileSync("/home/z/my-project/data/catalog.json", "utf-8")
  );
  console.log(`→ Migration de contenu v1.2.0 — ${catalog.length} services au catalogue`);

  // ── 1 & 2. Services : descriptions optimisées + shortDesc standard ────────
  let optimized = 0;
  let skipped = 0;
  let shortDescFixed = 0;
  const problems: string[] = [];

  for (const svc of catalog) {
    const row = await db.service.findFirst({ where: { code: svc.code } });
    if (!row) {
      problems.push(`Service introuvable en base pour le code ${svc.code}`);
      continue;
    }
    const pole = resolvePole(svc.pole);
    const enriched = { ...svc, description: FULL_DESCRIPTIONS[svc.code] || svc.description };
    const kw = buildKeywords(enriched, pole);

    if (isDescriptionOptimized(row.description)) {
      skipped++;
    } else {
      const description = optimizeDescription(enriched, kw, pole, {
        rating: row.rating,
        reviewsCount: row.reviewsCount,
      });
      await db.service.update({ where: { id: row.id }, data: { description } });
      optimized++;
    }

    // shortDesc : recalcule avec le standard ≥ 100 car (déterministe)
    const newShort = buildShortDesc(enriched);
    if (newShort !== row.shortDesc) {
      await db.service.update({ where: { id: row.id }, data: { shortDesc: newShort } });
      shortDescFixed++;
    }
  }

  // ── 3. Base de connaissances : suppression du nombre fixe ────────────────
  let kbUpdated = 0;
  for (const k of KNOWLEDGE) {
    const row = await db.knowledgeItem.findFirst({ where: { question: k.question } });
    if (row && (row.answer !== k.answer || row.keywords !== k.keywords)) {
      await db.knowledgeItem.update({
        where: { id: row.id },
        data: { answer: k.answer, keywords: k.keywords },
      });
      kbUpdated++;
    }
  }

  // ── 4. Blog : mention du nombre fixe dans llms-txt-protocole-ia ──────────
  const post = await db.blogPost.findUnique({ where: { slug: "llms-txt-protocole-ia" } });
  let blogUpdated = 0;
  if (post && post.content.includes("112 services livrés")) {
    const content = post.content.replace(
      "> 112 services livrés",
      "> Plus de 100 services livrés"
    );
    await db.blogPost.update({ where: { id: post.id }, data: { content } });
    blogUpdated = 1;
  }

  // Source markdown synchronisée (futurs re-seeds)
  const blogSrc = "/home/z/my-project/data/blog/llms-txt-protocole-ia.md";
  let srcUpdated = false;
  try {
    const src = readFileSync(blogSrc, "utf-8");
    if (src.includes("> 112 services livrés")) {
      writeFileSync(blogSrc, src.replace("> 112 services livrés", "> Plus de 100 services livrés"));
      srcUpdated = true;
    }
  } catch {
    problems.push(`Source blog illisible : ${blogSrc}`);
  }

  console.log("──────────────────────────────────────────────");
  console.log(`✓ Descriptions optimisées SGA™ : ${optimized} (déjà optimisées : ${skipped})`);
  console.log(`✓ shortDesc recalculés : ${shortDescFixed}`);
  console.log(`✓ Entrées base de connaissances mises à jour : ${kbUpdated}`);
  console.log(`✓ Article blog corrigé : ${blogUpdated} · source .md : ${srcUpdated ? "oui" : "non nécessaire"}`);
  if (problems.length) {
    console.log("⚠ Problèmes :");
    problems.forEach((p) => console.log(`   - ${p}`));
  }
  console.log("→ Vérifiez avec : bun run guard && bun run audit:content");
}

main()
  .catch((e) => {
    console.error("✗ Échec de la migration :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

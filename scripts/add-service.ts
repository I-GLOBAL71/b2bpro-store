/**
 * CLI : `bun run add:service -- --code=#101`
 *       (équivalent : `bun run scripts/add-service.ts --code=#101`)
 *
 * Insertion ADDITIVE d'un service du catalogue (data/catalog.json) dans la base
 * courante — sans toucher à aucune ligne existante (leads, commandes,
 * conversations IA, avis et services actuels intégralement préservés).
 *
 * Réplique EXACTEMENT la logique du seed (data/seed.ts) pour le service visé :
 *   • même vendeur (round-robin déterministe recalculé sur les entrées
 *     précédentes du catalogue) ;
 *   • mêmes mots-clés (override sourcis `keywords` ?? buildKeywords) ;
 *   • mêmes stats (`launchStats` ?? randomSalesStats(idx + 17)) ;
 *   • mêmes options, avis (generateReviews(idx * 31 + 7)) et miniatures SVG.
 * → Une reconstruction complète via `data/seed.ts` produit un résultat
 *   IDENTIQUE : la reproductibilité de la garde d'intégrité est préservée.
 *
 * Pipeline conforme au skill obligatoire docs/SKILL-REDACTION-SEO-GEO-AIO.md
 * (ÉTAPE 5) : catalog.json → enrichissement → insertion base → 3 miniatures.
 * La validation machine reste de rigueur ensuite : `bun run audit:content`
 * puis `bun run guard` (une fiche sous-standard est REFUSÉE par la garde).
 *
 * Idempotent : code déjà présent en base → aucune action, code sortie 0.
 *
 * Après insertion en production : `bun run thumbs:blob --service=<slug>`
 * (WebP Blob) puis `NEON_DATABASE_URL="…" bun run db:migrate:neon`
 * (cf. docs/DEPLOIEMENT-VERCEL.md §8).
 */
import { db } from "../src/lib/db";
import { submitNewOrUpdatedContent } from "../src/lib/gsc";
import { POLES, resolvePole } from "../data/gen/poles";
import { SELLERS } from "../data/gen/sellers";
import {
  buildKeywords,
  buildFaq,
  buildFeatures,
  buildDeliverables,
  buildProcess,
  buildShortDesc,
  optimizeDescription,
  randomSalesStats,
  slugify,
  FULL_DESCRIPTIONS,
  type CatalogService,
} from "../data/gen/enrich";
import { buildHumanizedBundle, REAL_POLE_QUERIES } from "../data/gen/humanize";
import { generateReviews } from "../data/gen/reviews";
import { generateThumb } from "../data/gen/thumbs";

const args = process.argv.slice(2);
const codeArg = args.find((a) => a.startsWith("--code="))?.split("=").slice(1).join("=");

if (!codeArg) {
  console.error('✗ Code requis : bun run scripts/add-service.ts --code="#101"');
  process.exit(1);
}

async function main() {
  console.log(`→ Ajout du service « ${codeArg} » (insertion additive)…`);

  // ── 1. Entrée du catalogue + index (détermine stats/vendeur/avis) ──────────
  const catalog: CatalogService[] = JSON.parse(
    await Bun.file("data/catalog.json").text()
  );
  const idx = catalog.findIndex((s) => s.code === codeArg);
  if (idx === -1) {
    console.error(`✗ Code « ${codeArg} » introuvable dans data/catalog.json.`);
    process.exit(1);
  }
  const svc = catalog[idx];

  // ── 2. Idempotence : déjà en base ? ────────────────────────────────────────
  const existing = await db.service.findFirst({ where: { code: svc.code } });
  if (existing) {
    console.log(`✓ Déjà présent en base : /services/${existing.slug} — aucune action.`);
    return;
  }

  // ── 3. Pôle + vendeur (round-robin recalculé à l'identique du seed) ───────
  const pole = resolvePole(svc.pole);
  const poleCursor = new Map<string, number>();
  for (const prev of catalog.slice(0, idx)) {
    const p = resolvePole(prev.pole);
    poleCursor.set(p.slug, (poleCursor.get(p.slug) ?? 0) + 1);
  }
  const specialists = SELLERS.filter((s) => s.specialtyPoles.includes(pole.slug));
  const cur = poleCursor.get(pole.slug) ?? 0;
  const sellerSlug = specialists.length > 0 ? specialists[cur % specialists.length].slug : undefined;
  if (!sellerSlug) {
    console.error(`✗ Aucun vendeur disponible pour le pôle ${pole.slug}.`);
    process.exit(1);
  }
  const seller = await db.seller.findUnique({ where: { slug: sellerSlug } });
  if (!seller) {
    console.error(`✗ Vendeur « ${sellerSlug} » introuvable en base.`);
    process.exit(1);
  }

  // ── 4. Slug unique (même règle que le seed) ───────────────────────────────
  let slug = slugify(svc.comeupTitle || svc.name);
  if (slug.length < 8) slug = slugify(`${svc.code}-${svc.name}`);
  const taken = new Set((await db.service.findMany({ select: { slug: true } })).map((s) => s.slug));
  while (taken.has(slug)) slug = `${slug}-${svc.code.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  // ── 5. Enrichissement (identique au seed, overrides inclus) ───────────────
  const keywords = svc.keywords ?? buildKeywords(svc, pole);
  const stats = svc.launchStats ?? randomSalesStats(idx + 17);
  const description = FULL_DESCRIPTIONS[svc.code] || svc.description;
  const enriched: CatalogService = { ...svc, description };
  const faq = buildFaq(enriched, pole);
  const features = buildFeatures(enriched);
  const deliverables = buildDeliverables(enriched, pole);
  const process = buildProcess(enriched);
  const shortDesc = buildShortDesc(enriched);

  // [CORRECTIF v1.9.0 — audit E4 B3] Ce script passait par les builders v1 sans
  // la couche humanisée : double pipeline divergent. Désormais le MÊME funnel
  // que data/seed.ts (buildKeywordsV2 + primaires curatés + FAQ « comment… »
  // en tête + accroches contextuelles vendeur) — un nouveau service est conforme
  // au skill SGA™ dès l'insertion, ou REFUSÉ par la garde d'intégrité ensuite.
  const poleSiblings = await db.service.findMany({
    where: { poleSlug: pole.slug },
    select: { title: true },
  });
  const poleCount = poleSiblings.length + 1;
  const poleIndex = poleSiblings.length;
  let sellerSkills: string[] = [];
  try {
    sellerSkills = JSON.parse(seller.skills) as string[];
  } catch {
    sellerSkills = [];
  }
  const bundle = buildHumanizedBundle({
    slug,
    title: svc.comeupTitle || svc.name,
    category: svc.category,
    poleLabel: pole.label,
    poleSlug: pole.slug,
    poleIndex,
    poleCount,
    siblingTitles: poleSiblings
      .map((p) => p.title.replace(/^Je vais\s+/, ""))
      .slice(0, 6),
    basePrice: svc.basePrice,
    deliveryDays: svc.deliveryDays,
    rating: stats.rating,
    reviewsCount: stats.reviewsCount,
    salesCount: stats.salesCount,
    options: svc.options.map((o) => ({ name: o.name, priceExtra: o.priceExtra })),
    sellerName: seller.name,
    sellerSkills,
    sellerResponseTime: seller.responseTime,
    sellerCountryLabel: seller.countryLabel,
    sellerLevel: seller.level,
    currentDescription: optimizeDescription(enriched, keywords, pole, stats),
    currentFeatures: features,
    currentDeliverables: deliverables,
    currentProcess: process,
    hotKeywords: pole.hotKeywords,
    realQueries: REAL_POLE_QUERIES[pole.slug] ?? [],
    manualKeywords: svc.keywords
      ? {
          primary: "",
          secondary: [svc.keywords.primary, ...svc.keywords.secondary].filter(Boolean),
          longTail: svc.keywords.longTail,
          aiQueries: svc.keywords.aiQueries,
        }
      : undefined,
  });
  void shortDesc; // remplacé par bundle.shortDesc (conservé pour la lisibilité du funnel v1)

  // ── 6. Insertion (service → options → avis → miniatures) ──────────────────
  const created = await db.service.create({
    data: {
      slug,
      code: svc.code,
      name: svc.name,
      title: svc.comeupTitle || svc.name,
      category: svc.category,
      pole: pole.fullLabel,
      poleSlug: pole.slug,
      poleIcon: pole.icon,
      basePrice: svc.basePrice,
      deliveryDays: svc.deliveryDays,
      description: bundle.description,
      shortDesc: bundle.shortDesc,
      keywords: JSON.stringify(bundle.keywords),
      faq: JSON.stringify(bundle.faq),
      features: JSON.stringify(bundle.features),
      deliverables: JSON.stringify(bundle.deliverables),
      process: JSON.stringify(bundle.process),
      rating: stats.rating,
      reviewsCount: stats.reviewsCount,
      salesCount: stats.salesCount,
      views: stats.views,
      featured: false,
      isFounder: svc.isFounder,
      sellerId: seller.id,
    },
  });

  let pos = 0;
  for (const opt of svc.options) {
    await db.serviceOption.create({
      data: {
        serviceId: created.id,
        name: opt.name,
        description:
          opt.description ||
          `Renforcement « ${opt.name} » : périmètre étendu et valeur ajoutée immédiate sur ce livrable.`,
        priceExtra: opt.priceExtra,
        daysExtra: opt.daysExtra,
        monthly: opt.monthly,
        position: pos++,
      },
    });
  }

  const reviews = generateReviews(
    idx * 31 + 7,
    stats.rating,
    stats.reviewsCount,
    svc.options.map((o) => o.name)
  );
  for (const r of reviews) {
    const date = new Date();
    date.setDate(date.getDate() - r.daysAgo);
    await db.review.create({
      data: {
        serviceId: created.id,
        authorName: r.authorName,
        country: r.country,
        rating: r.rating,
        comment: r.comment,
        orderLabel: r.orderLabel,
        createdAt: date,
      },
    });
  }

  const titleClean = (svc.comeupTitle || svc.name).replace(/^Je vais\s+/i, "");
  generateThumb(
    {
      slug,
      title: titleClean,
      category: svc.category.split(/[>&]/)[0].trim(),
      basePrice: svc.basePrice,
      deliveryDays: svc.deliveryDays,
      pole,
    },
    "public/thumbs"
  );

  console.log("───────────────────────────────────────────────────────");
  console.log(`✓ Service inséré : « ${created.title} »`);
  console.log(`  URL        : /services/${slug}`);
  console.log(`  Pôle       : ${pole.fullLabel}`);
  console.log(`  Vendeur    : ${seller.name} — ${seller.title} (${seller.countryLabel})`);
  console.log(`  Prix       : ${svc.basePrice} € · ${svc.deliveryDays} j · ${svc.options.length} options`);
  console.log(`  Preuve     : ${stats.rating}/5 · ${stats.reviewsCount} avis · ${stats.salesCount} ventes`);
  console.log(`  Miniatures : public/thumbs/${slug}-{1,2,3}.svg`);

  // Soumission automatique Google Search Console & IndexNow pour le nouveau service
  await submitNewOrUpdatedContent({
    type: "service",
    slug,
    title: created.title,
  });

  console.log("  Prochaine étape : bun run audit:content && bun run audit:seo && bun run guard");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });

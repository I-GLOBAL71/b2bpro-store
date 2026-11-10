/** Seed principal b2bpro.store : services enrichis, vendeurs, options, avis, blog, connaissances, miniatures. */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { db } from "../src/lib/db";
import { POLES, resolvePole } from "./gen/poles";
import { SELLERS } from "./gen/sellers";
import {
  buildKeywords,
  buildFaq,
  buildFeatures,
  buildDeliverables,
  buildProcess,
  buildShortDesc,
  buildMeta,
  optimizeDescription,
  randomSalesStats,
  slugify,
  FULL_DESCRIPTIONS,
  type CatalogService,
} from "./gen/enrich";
import { generateReviews } from "./gen/reviews";
import { KNOWLEDGE } from "./gen/knowledge";
import { generateThumb, generateAvatar } from "./gen/thumbs";
import { buildHumanizedBundle, REAL_POLE_QUERIES } from "./gen/humanize";

async function main() {
  console.log("→ Lecture du catalogue…");
  const catalog: CatalogService[] = JSON.parse(
    readFileSync("/home/z/my-project/data/catalog.json", "utf-8")
  );
  console.log(`   ${catalog.length} services chargés.`);

  // ── 1. Vendeurs ────────────────────────────────────────────────────────────
  console.log("→ Création des vendeurs…");
  const sellerMap = new Map<string, { id: string; db: typeof SELLERS[number] }>();
  for (const s of SELLERS) {
    const created = await db.seller.create({
      data: {
        slug: s.slug,
        name: s.name,
        country: s.country,
        countryLabel: s.countryLabel,
        city: s.city,
        title: s.title,
        bio: s.bio,
        skills: JSON.stringify(s.skills),
        languages: JSON.stringify(s.languages),
        rating: s.rating,
        reviewsCount: s.reviewsCount,
        totalSales: s.totalSales,
        responseTime: s.responseTime,
        memberSince: s.memberSince,
        level: s.level,
        avatarColors: JSON.stringify(s.avatarColors),
        isTop: s.isTop,
      },
    });
    sellerMap.set(s.slug, { id: created.id, db: s });
    generateAvatar(s.name, s.avatarColors, `public/avatars/${s.slug}.svg`);
  }

  // ── 2. Services enrichis ───────────────────────────────────────────────────
  console.log("→ Enrichissement et création des services…");
  const usedSlugs = new Set<string>();
  const featuredCodes = new Set(["F-01", "F-03", "F-06", "F-08", "#2", "#9", "#21", "#81", "#37", "#11"]);

  // affectation vendeurs par pôle (round-robin sur les spécialistes du pôle)
  const poleCursor = new Map<string, number>();
  const poleSellers = new Map<string, string[]>();
  for (const p of POLES) {
    poleSellers.set(
      p.slug,
      SELLERS.filter((s) => s.specialtyPoles.includes(p.slug)).map((s) => s.slug)
    );
  }
  // file d'attente globale pour les vendeurs peu sollicités
  const allSellerSlugs = SELLERS.map((s) => s.slug);

  // [ADDITIF v1.6.0] Contextes de pôle pour la couche d'humanisation — mêmes
  // générateurs que scripts/humanize-content.ts : un seed neuf produit
  // EXACTEMENT le format de la base migrée (accroches/H2 variés, mots-clés V2
  // avec requêtes réelles à fort trafic, FAQ contextuelle).
  const poleCounts = new Map<string, number>();
  const poleAllTitles = new Map<string, string[]>();
  for (const svc of catalog) {
    const p = resolvePole(svc.pole);
    poleCounts.set(p.slug, (poleCounts.get(p.slug) ?? 0) + 1);
    if (!poleAllTitles.has(p.slug)) poleAllTitles.set(p.slug, []);
    poleAllTitles.get(p.slug)!.push((svc.comeupTitle || svc.name).replace(/^Je vais\s+/, ""));
  }
  const poleSeen = new Map<string, number>();

  const serviceIds: { id: string; slug: string; rating: number; reviewsCount: number; options: { name: string; priceExtra: number }[]; poleSlug: string; sellerSlug: string; title: string; basePrice: number }[] = [];

  let idx = 0;
  for (const svc of catalog) {
    const pole = resolvePole(svc.pole);
    // slug unique
    let slug = slugify(svc.comeupTitle || svc.name);
    if (slug.length < 8) slug = slugify(`${svc.code}-${svc.name}`);
    while (usedSlugs.has(slug)) slug = `${slug}-${svc.code.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    usedSlugs.add(slug);

    // vendeur : spécialiste du pôle en priorité
    const specialists = poleSellers.get(pole.slug) || [];
    let sellerSlug: string;
    if (specialists.length > 0) {
      const cur = poleCursor.get(pole.slug) ?? 0;
      sellerSlug = specialists[cur % specialists.length];
      poleCursor.set(pole.slug, cur + 1);
    } else {
      sellerSlug = allSellerSlugs[idx % allSellerSlugs.length];
    }

    const description = FULL_DESCRIPTIONS[svc.code] || svc.description;
    // [ADDITIF v1.4.0] Mots-clés sourcis à la main (skill ÉTAPE 1/2) en priorité,
    // sinon dérivation automatique — comportement historique inchangé sans champ.
    const keywords = svc.keywords ?? buildKeywords(svc, pole);
    // [ADDITIF v1.4.0] Stats de lancement explicites pour un service réellement
    // nouveau (traction initiale), sinon génération déterministe inchangée.
    const stats = svc.launchStats ?? randomSalesStats(idx + 17);
    const enriched = {
      ...svc,
      description,
    };
    const faq = buildFaq(enriched, pole);
    const features = buildFeatures(enriched);
    const deliverables = buildDeliverables(enriched, pole);
    const process = buildProcess(enriched);
    const shortDesc = buildShortDesc(enriched);
    const meta = buildMeta(enriched, keywords);

    // [ADDITIF v1.6.0] Couche d'humanisation par-dessus les builders legacy :
    // accroches answer-first naturelles, titres H2 variés (pools rotationnels
    // par hash de slug), mots-clés V2 (primary grammatical + requêtes réelles
    // des pôles), FAQ autonome contextuelle. Identique à la base migrée.
    const poleIdx = poleSeen.get(pole.slug) ?? 0;
    poleSeen.set(pole.slug, poleIdx + 1);
    const displayTitle = svc.comeupTitle || svc.name;
    const bundle = buildHumanizedBundle({
      slug,
      title: displayTitle,
      category: svc.category,
      poleLabel: pole.label,
      poleSlug: pole.slug,
      poleIndex: poleIdx,
      poleCount: poleCounts.get(pole.slug) ?? 1,
      siblingTitles: (poleAllTitles.get(pole.slug) ?? [])
        .filter((t) => t !== displayTitle.replace(/^Je vais\s+/, ""))
        .slice(0, 6),
      basePrice: svc.basePrice,
      deliveryDays: svc.deliveryDays,
      rating: stats.rating,
      reviewsCount: stats.reviewsCount,
      salesCount: stats.salesCount,
      options: svc.options.map((o) => ({ name: o.name, priceExtra: o.priceExtra })),
      // [ADDITIF v1.8.0] Contexte vendeur réel : expertise issue des skills du
      // vendeur, réactivité exacte du badge, pays pour le bloc francophonie.
      ...(sellerMap.get(sellerSlug)
        ? {
            sellerName: sellerMap.get(sellerSlug)!.db.name,
            sellerSkills: sellerMap.get(sellerSlug)!.db.skills,
            sellerResponseTime: sellerMap.get(sellerSlug)!.db.responseTime,
            sellerCountryLabel: sellerMap.get(sellerSlug)!.db.countryLabel,
            sellerLevel: sellerMap.get(sellerSlug)!.db.level,
          }
        : {}),
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
        featured: featuredCodes.has(svc.code),
        isFounder: svc.isFounder,
        sellerId: sellerMap.get(sellerSlug)!.id,
      },
    });

    // options
    let pos = 0;
    for (const opt of svc.options) {
      await db.serviceOption.create({
        data: {
          serviceId: created.id,
          name: opt.name,
          description: opt.description || `Renforcement « ${opt.name} » : périmètre étendu et valeur ajoutée immédiate sur ce livrable.`,
          priceExtra: opt.priceExtra,
          daysExtra: opt.daysExtra,
          monthly: opt.monthly,
          position: pos++,
        },
      });
    }

    // avis
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

    // miniatures
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

    serviceIds.push({
      id: created.id,
      slug,
      rating: stats.rating,
      reviewsCount: stats.reviewsCount,
      options: svc.options.map((o) => ({ name: o.name, priceExtra: o.priceExtra })),
      poleSlug: pole.slug,
      sellerSlug,
      title: svc.comeupTitle,
      basePrice: svc.basePrice,
    });
    idx++;
  }
  console.log(`   ${serviceIds.length} services créés avec options, avis et miniatures.`);

  // ── 3. Blog ────────────────────────────────────────────────────────────────
  console.log("→ Import des articles de blog…");
  const blogDir = "/home/z/my-project/data/blog";
  const files = readdirSync(blogDir).filter((f) => f.endsWith(".md"));
  let published = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const raw = readFileSync(`${blogDir}/${f}`, "utf-8");
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) continue;
    const fm: Record<string, string> = {};
    for (const line of fmMatch[1].split("\n")) {
      const m = line.match(/^(\w+):\s*"?(.+?)"?$/);
      if (m) fm[m[1]] = m[2];
    }
    const content = fmMatch[2].trim();
    const words = content.split(/\s+/).length;
    const date = new Date();
    date.setDate(date.getDate() - (files.length - i) * 6); // échelonnés
    await db.blogPost.create({
      data: {
        slug: fm.slug || f.replace(".md", ""),
        title: fm.title || "Article",
        excerpt: fm.excerpt || content.substring(0, 155),
        content,
        category: fm.category || "SEO & Visibilité IA",
        coverTheme: fm.coverTheme || "default",
        readMinutes: Math.max(4, Math.round(words / 220)),
        publishedAt: date,
        author: fm.author || "Rédaction b2bpro.store",
      },
    });
    published++;
  }
  console.log(`   ${published} articles importés.`);

  // ── 4. Base de connaissances ───────────────────────────────────────────────
  console.log("→ Base de connaissances du support IA…");
  for (const k of KNOWLEDGE) {
    await db.knowledgeItem.create({
      data: {
        category: k.category,
        question: k.question,
        answer: k.answer,
        keywords: k.keywords,
      },
    });
  }
  console.log(`   ${KNOWLEDGE.length} entrées générales + FAQ de tous les services via requête dynamique.`);

  console.log("✅ Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  GARDE D'INTÉGRITÉ b2bpro.store — Moteur d'invariants anti-régression
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Exécuté via :
 *   • `bun run guard`                      (CLI, code sortie 1 si échec)
 *   • GET /api/integrity                   (rapport JSON live, HTTP 503 si échec)
 *
 *  ZONE PROTÉGÉE — n'étendre que de façon ADDITIVE :
 *   ✅ Ajouter un contrôle (nouveau CheckResult avec id stable unique)
 *   ❌ Retirer, renommer ou relâcher un contrôle existant
 *
 *  Chaque implémentation future DOIT passer `bun run guard` AVANT et APRÈS
 *  (voir docs/REGRESSION-GUARD.md).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { POLE_LABELS } from "@/lib/site";
import { getSiteSettings } from "@/lib/settings";
import { rotationWindowIndices } from "@/lib/rotation";
import {
  BUSINESS_RULES,
  CONTRACT_VERSION,
  ROTATION_RULES,
  safeJsonParse,
  siteSettingsSchema,
  type CheckResult,
  type CheckStatus,
  type IntegrityIssue,
  type IntegrityReport,
} from "@/lib/contracts";

/** Racine du projet (fonctionne en dev Next, en script bun et en standalone). */
function root(...parts: string[]): string {
  // Les fichiers requis en production sur /api/integrity sont déclarés explicitement
  // dans next.config.ts (outputFileTracingIncludes) afin d'éviter le traçage de tout le dépôt.
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ...parts);
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fileNonEmpty(p: string): boolean {
  try {
    return existsSync(p) && statSync(p).size > 0;
  } catch {
    return false;
  }
}

function makeCheck(
  id: string,
  label: string,
  status: CheckStatus,
  details?: string,
  issues?: IntegrityIssue[]
): CheckResult {
  return { id, label, status, details, issues: issues?.length ? issues : undefined };
}

/** Fichiers vitaux de l'application — leur disparition casse des pages indexées. */
const CRITICAL_FILES: string[] = [
  // Socle
  "src/app/layout.tsx",
  "src/app/(public)/layout.tsx", // v1.5.0 — chrome public + maintenance (page.tsx déplacée dans le groupe (public))
  "src/app/(public)/page.tsx",
  "src/app/globals.css",
  "src/lib/db.ts",
  "src/lib/queries.ts",
  "src/lib/site.ts",
  "src/lib/blog-image.ts",
  "src/lib/contracts.ts",
  "src/lib/guard.ts",
  "public/img/blog/manifest.json",
  "src/lib/settings.ts", // v1.5.0 — réglages dynamiques
  "src/lib/rotation.ts", // v1.5.0 — rotation équitable
  "src/lib/admin-auth.ts", // v1.5.0 — sessions admin
  // Pages publiques (SEO : URLs déjà référencables)
  "src/app/(public)/services/page.tsx",
  "src/app/(public)/services/[slug]/page.tsx",
  "src/app/(public)/blog/page.tsx",
  "src/app/(public)/blog/[slug]/page.tsx",
  "src/components/site/markdown.tsx",
  "src/app/(public)/categories/[slug]/page.tsx",
  "src/app/(public)/vendeurs/[slug]/page.tsx",
  "src/app/(public)/support/page.tsx",
  // Panneau d'administration (v1.5.0)
  "src/app/admin/login/page.tsx",
  "src/app/admin/(panel)/layout.tsx",
  "src/app/admin/(panel)/page.tsx",
  "src/app/admin/(panel)/vitrine/page.tsx",
  "src/app/admin/(panel)/accueil/page.tsx",
  "src/app/admin/(panel)/support/page.tsx",
  "src/app/admin/(panel)/general/page.tsx",
  "src/app/admin/(panel)/services/page.tsx",
  "src/app/admin/(panel)/journal/page.tsx",
  // Endpoints API (contrats consommés par le front)
  "src/app/api/orders/route.ts",
  "src/app/api/reviews/route.ts",
  "src/app/api/leads/route.ts",
  "src/app/api/services/route.ts",
  "src/app/api/support/chat/route.ts",
  "src/app/api/admin/login/route.ts", // v1.5.0
  "src/app/api/admin/config/route.ts", // v1.5.0
  // SEO technique
  "src/app/sitemap.ts",
  "src/app/robots.ts",
  "src/app/llms.txt/route.ts",
  // Composants structurants
  "src/components/site/site-header.tsx",
  "src/components/site/site-footer.tsx",
  "src/components/site/service-card.tsx",
  "src/components/site/option-selector.tsx",
  "src/components/site/service-gallery.tsx",
  "src/components/site/review-form.tsx",
  "src/components/site/support-chat.tsx",
  "src/components/site/rating-stars.tsx",
  "src/components/site/markdown.tsx",
  "src/components/site/pole-icon.tsx",
  // Identité
  "public/logo.svg",
  // Reproductibilité des données
  "data/seed.ts",
  "data/catalog.json",
];

/** Exécute tous les contrôles et produit le rapport. Ne lève JAMAIS. */
export async function runIntegrityChecks(): Promise<IntegrityReport> {
  const checks: CheckResult[] = [];
  const counts = {
    services: 0,
    sellers: 0,
    options: 0,
    reviews: 0,
    blogPosts: 0,
    knowledgeItems: 0,
    leads: 0,
    chatMessages: 0,
    thumbs: 0,
    avatars: 0,
  };

  // ── 0. Connexion base de données ──────────────────────────────────────────
  let dbOk = true;
  type ServiceRow = Awaited<ReturnType<typeof db.service.findMany>>[number];
  type SellerRow = Awaited<ReturnType<typeof db.seller.findMany>>[number];
  let services: ServiceRow[] = [];
  let sellers: SellerRow[] = [];
  let options: Awaited<ReturnType<typeof db.serviceOption.findMany>> = [];
  let reviews: Awaited<ReturnType<typeof db.review.findMany>> = [];
  let blogPosts: Awaited<ReturnType<typeof db.blogPost.findMany>> = [];
  let kbItems: Awaited<ReturnType<typeof db.knowledgeItem.findMany>> = [];
  let leads: Awaited<ReturnType<typeof db.lead.findMany>> = [];
  let chatMessages: Awaited<ReturnType<typeof db.chatMessage.findMany>> = [];

  try {
    [
      services,
      sellers,
      options,
      reviews,
      blogPosts,
      kbItems,
      leads,
      chatMessages,
    ] = await Promise.all([
      db.service.findMany(),
      db.seller.findMany(),
      db.serviceOption.findMany(),
      db.review.findMany(),
      db.blogPost.findMany(),
      db.knowledgeItem.findMany(),
      db.lead.findMany(),
      db.chatMessage.findMany(),
    ]);
    counts.services = services.length;
    counts.sellers = sellers.length;
    counts.options = options.length;
    counts.reviews = reviews.length;
    counts.blogPosts = blogPosts.length;
    counts.knowledgeItems = kbItems.length;
    counts.leads = leads.length;
    counts.chatMessages = chatMessages.length;
    checks.push(
      makeCheck(
        "db-connection",
        "Connexion à la base de données (SQLite)",
        "pass",
        `${counts.services} services, ${counts.sellers} vendeurs, ${counts.options} options, ${counts.reviews} avis, ${counts.blogPosts} articles, ${counts.knowledgeItems} entrées IA.`
      )
    );
  } catch (e) {
    dbOk = false;
    checks.push(
      makeCheck(
        "db-connection",
        "Connexion à la base de données (SQLite)",
        "fail",
        `Base inaccessible : ${e instanceof Error ? e.message : String(e)}`
      )
    );
  }

  if (dbOk) {
    const sellerIds = new Set(sellers.map((s) => s.id));
    const serviceIds = new Set(services.map((s) => s.id));
    const serviceSlugs = new Map<string, number>();

    // ── 1. Invariants des SERVICES ─────────────────────────────────────────
    {
      const issues: IntegrityIssue[] = [];
      const ratingOutOfBounds: string[] = [];
      const badJson: string[] = [];
      const badPrice: string[] = [];
      const orphanSeller: string[] = [];
      const unknownPole: string[] = [];
      const emptyTitle: string[] = [];

      for (const s of services) {
        serviceSlugs.set(s.slug, (serviceSlugs.get(s.slug) ?? 0) + 1);
        if (s.rating < BUSINESS_RULES.MIN_RATING || s.rating > BUSINESS_RULES.MAX_RATING) {
          ratingOutOfBounds.push(`${s.slug} (${s.rating})`);
        }
        if (s.basePrice < BUSINESS_RULES.MIN_BASE_PRICE || s.deliveryDays < BUSINESS_RULES.MIN_DELIVERY_DAYS) {
          badPrice.push(`${s.slug} (prix ${s.basePrice} €, ${s.deliveryDays} j)`);
        }
        if (!s.title || s.title.trim().length < 5) emptyTitle.push(s.slug);
        if (!sellerIds.has(s.sellerId)) orphanSeller.push(`${s.slug} → vendeur ${s.sellerId}`);
        if (!POLE_LABELS[s.poleSlug]) unknownPole.push(`${s.slug} → pôle ${s.poleSlug}`);
        // Champs JSON : doivent se parser ET avoir la forme attendue
        const kw = safeJsonParse<ServiceKeywordsShape | null>(s.keywords, null);
        if (!kw || !kw.primary || !Array.isArray(kw.secondary)) badJson.push(`${s.slug} : keywords`);
        if (!Array.isArray(safeJsonParse<string[] | null>(s.features, null))) badJson.push(`${s.slug} : features`);
        if (!Array.isArray(safeJsonParse<string[] | null>(s.deliverables, null))) badJson.push(`${s.slug} : deliverables`);
        if (!Array.isArray(safeJsonParse<unknown[] | null>(s.process, null))) badJson.push(`${s.slug} : process`);
        if (!Array.isArray(safeJsonParse<unknown[] | null>(s.faq, null))) badJson.push(`${s.slug} : faq`);
      }

      const dupSlugs = [...serviceSlugs.entries()].filter(([, n]) => n > 1).map(([slug, n]) => `${slug} ×${n}`);
      if (dupSlugs.length) issues.push({ ref: "services/slugs", problem: `Slugs dupliqués (URLs dupliquées) : ${dupSlugs.join(", ")}` });
      if (ratingOutOfBounds.length)
        issues.push({
          ref: "services/rating",
          problem: `Notes hors bornes ${BUSINESS_RULES.MIN_RATING}–${BUSINESS_RULES.MAX_RATING} : ${ratingOutOfBounds.slice(0, 10).join(", ")}${ratingOutOfBounds.length > 10 ? "…" : ""}`,
        });
      if (badPrice.length) issues.push({ ref: "services/price", problem: `Prix ou délais invalides : ${badPrice.slice(0, 10).join(", ")}` });
      if (emptyTitle.length) issues.push({ ref: "services/title", problem: `Titres vides ou trop courts : ${emptyTitle.join(", ")}` });
      if (orphanSeller.length) issues.push({ ref: "services/seller", problem: `Vendeur introuvable : ${orphanSeller.join(", ")}` });
      if (unknownPole.length) issues.push({ ref: "services/pole", problem: `Pôle inconnu dans POLE_LABELS : ${unknownPole.join(", ")}` });
      if (badJson.length) issues.push({ ref: "services/json", problem: `Champs JSON malformés : ${badJson.join(", ")}` });

      checks.push(
        makeCheck(
          "services-invariants",
          "Services : slugs uniques, notes 4,2–5, prix/délais, JSON valides, pôles connus",
          issues.length ? "fail" : "pass",
          `${counts.services} services vérifiés.`,
          issues
        )
      );
    }

    // ── 2. Miniatures : exactement 3 par service, fichiers non vides ────────
    {
      const issues: IntegrityIssue[] = [];
      let present = 0;
      for (const s of services) {
        for (let v = 1; v <= BUSINESS_RULES.THUMBS_PER_SERVICE; v++) {
          const p = root("public", "thumbs", `${s.slug}-${v}.svg`);
          if (fileNonEmpty(p)) present++;
          else issues.push({ ref: p, problem: `Miniature manquante ou vide pour « ${s.title.slice(0, 50)} »` });
        }
      }
      checks.push(
        makeCheck(
          "services-thumbnails",
          `Miniatures : ${BUSINESS_RULES.THUMBS_PER_SERVICE} fichiers SVG non vides par service`,
          issues.length ? "fail" : "pass",
          `${present}/${counts.services * BUSINESS_RULES.THUMBS_PER_SERVICE} miniatures présentes.`,
          issues.slice(0, 20)
        )
      );
      if (issues.length > 20) {
        checks[checks.length - 1].details += ` (+${issues.length - 20} autres manquantes)`;
      }
    }

    // ── 3. Vendeurs : unicité des bios et noms, notes, avatars ──────────────
    {
      const issues: IntegrityIssue[] = [];
      const seenBios = new Map<string, string>();
      const seenNames = new Map<string, string>();
      const seenSlugs = new Map<string, number>();
      for (const s of sellers) {
        seenSlugs.set(s.slug, (seenSlugs.get(s.slug) ?? 0) + 1);
        const bioKey = norm(s.bio);
        if (seenBios.has(bioKey)) {
          issues.push({ ref: `sellers/${s.slug}`, problem: `Bio dupliquée avec ${seenBios.get(bioKey)} (cahier des charges : descriptions uniques)` });
        } else {
          seenBios.set(bioKey, s.slug);
        }
        const nameKey = norm(s.name);
        if (seenNames.has(nameKey)) {
          issues.push({ ref: `sellers/${s.slug}`, problem: `Nom dupliqué avec ${seenNames.get(nameKey)}` });
        } else {
          seenNames.set(nameKey, s.slug);
        }
        if (s.rating < BUSINESS_RULES.MIN_RATING || s.rating > BUSINESS_RULES.MAX_RATING) {
          issues.push({ ref: `sellers/${s.slug}`, problem: `Note ${s.rating} hors bornes 4,2–5` });
        }
        if (!Array.isArray(safeJsonParse<string[] | null>(s.skills, null)) || !Array.isArray(safeJsonParse<string[] | null>(s.languages, null))) {
          issues.push({ ref: `sellers/${s.slug}`, problem: "Champs skills/languages JSON malformés" });
        }
        if (!fileNonEmpty(root("public", "avatars", `${s.slug}.svg`))) {
          issues.push({ ref: `public/avatars/${s.slug}.svg`, problem: "Avatar manquant ou vide" });
        }
      }
      const dupSlugs = [...seenSlugs.entries()].filter(([, n]) => n > 1).map(([slug]) => slug);
      if (dupSlugs.length) issues.push({ ref: "sellers/slugs", problem: `Slugs dupliqués : ${dupSlugs.join(", ")}` });

      checks.push(
        makeCheck(
          "sellers-invariants",
          "Vendeurs : bios uniques, noms uniques, notes 4,2–5, avatars SVG présents",
          issues.length ? "fail" : "pass",
          `${counts.sellers} vendeurs vérifiés.`,
          issues.slice(0, 20)
        )
      );
    }

    // ── 4. Options additionnelles ───────────────────────────────────────────
    {
      const issues: IntegrityIssue[] = [];
      const seenIds = new Map<string, number>();
      for (const o of options) {
        seenIds.set(o.id, (seenIds.get(o.id) ?? 0) + 1);
        if (o.priceExtra < 0 || o.daysExtra < 0) {
          issues.push({ ref: `options/${o.id}`, problem: `Valeurs négatives (+${o.priceExtra} €, +${o.daysExtra} j)` });
        }
        if (!serviceIds.has(o.serviceId)) {
          issues.push({ ref: `options/${o.id}`, problem: `Service parent introuvable : ${o.serviceId}` });
        }
        if (!o.name || !o.name.trim()) {
          issues.push({ ref: `options/${o.id}`, problem: "Option sans nom" });
        }
      }
      const dup = [...seenIds.entries()].filter(([, n]) => n > 1).map(([id]) => id);
      if (dup.length) issues.push({ ref: "options/ids", problem: `IDs dupliqués : ${dup.join(", ")}` });
      checks.push(
        makeCheck(
          "options-invariants",
          "Options additionnelles : IDs uniques, montants ≥ 0, parents résolus",
          issues.length ? "fail" : "pass",
          `${counts.options} options vérifiées.`,
          issues
        )
      );
    }

    // ── 5. Avis clients ────────────────────────────────────────────────────
    {
      const issues: IntegrityIssue[] = [];
      for (const r of reviews) {
        if (r.rating < BUSINESS_RULES.REVIEW_RATING_MIN || r.rating > BUSINESS_RULES.REVIEW_RATING_MAX) {
          issues.push({ ref: `reviews/${r.id}`, problem: `Note ${r.rating} hors bornes 1–5` });
        }
        if (!serviceIds.has(r.serviceId)) {
          issues.push({ ref: `reviews/${r.id}`, problem: `Service introuvable : ${r.serviceId}` });
        }
        if (!r.authorName?.trim() || !r.comment?.trim()) {
          issues.push({ ref: `reviews/${r.id}`, problem: "Avis sans auteur ou sans commentaire" });
        }
      }
      checks.push(
        makeCheck(
          "reviews-invariants",
          "Avis : notes 1–5, auteurs et commentaires présents, services résolus",
          issues.length ? "fail" : "pass",
          `${counts.reviews} avis vérifiés.`,
          issues
        )
      );
    }

    // ── 6. Blog ─────────────────────────────────────────────────────────────
    {
      const issues: IntegrityIssue[] = [];
      const seen = new Map<string, number>();
      for (const b of blogPosts) {
        seen.set(b.slug, (seen.get(b.slug) ?? 0) + 1);
        if (!b.content || b.content.trim().length < 200) {
          issues.push({ ref: `blog/${b.slug}`, problem: "Contenu trop court (< 200 caractères)" });
        }
        if (!b.title?.trim() || !b.excerpt?.trim()) {
          issues.push({ ref: `blog/${b.slug}`, problem: "Titre ou extrait manquant" });
        }
      }
      const dup = [...seen.entries()].filter(([, n]) => n > 1).map(([slug]) => slug);
      if (dup.length) issues.push({ ref: "blog/slugs", problem: `Slugs dupliqués : ${dup.join(", ")}` });
      checks.push(
        makeCheck(
          "blog-invariants",
          "Blog : slugs uniques, titres/extraits et contenus substantiels",
          issues.length ? "fail" : "pass",
          `${counts.blogPosts} articles vérifiés.`,
          issues
        )
      );
    }

    // ── 6bis. [RÈGLE ANTI-404] Intégrité des visuels du Blog (Disque + CDN Vercel Blob) ──
    {
      const issues: IntegrityIssue[] = [];
      const blogImgDir = root("public", "img", "blog");
      const manifestPath = path.join(blogImgDir, "manifest.json");
      let manifestData: Record<string, { slug?: string; blobUrl?: string; bytes?: number }> = {};

      if (!existsSync(manifestPath)) {
        issues.push({ ref: "public/img/blog/manifest.json", problem: "Fichier manifest.json introuvable" });
      } else {
        try {
          manifestData = JSON.parse(readFileSync(manifestPath, "utf8"));
        } catch {
          issues.push({ ref: "public/img/blog/manifest.json", problem: "Manifest JSON invalide" });
        }
      }

      for (const b of blogPosts) {
        const localImg = path.join(blogImgDir, `${b.slug}.webp`);
        if (!existsSync(localImg)) {
          issues.push({ ref: `blog/${b.slug}`, problem: `Visuel WebP absent sur disque : public/img/blog/${b.slug}.webp` });
        } else {
          try {
            const st = statSync(localImg);
            if (st.size < 5000) {
              issues.push({ ref: `blog/${b.slug}`, problem: `Visuel WebP trop petit/corrompu (${st.size} octets < 5 Ko)` });
            }
          } catch {
            issues.push({ ref: `blog/${b.slug}`, problem: `Impossible de lire la taille de public/img/blog/${b.slug}.webp` });
          }
        }

        const entry = manifestData[b.slug];
        if (!entry?.blobUrl) {
          issues.push({ ref: `blog/${b.slug}`, problem: `Entrée manquante ou sans blobUrl dans public/img/blog/manifest.json` });
        }
      }

      checks.push(
        makeCheck(
          "blog-visuals-integrity",
          "Visuels du Blog : présence WebP locale (≥ 5 Ko) et synchronisation CDN Vercel Blob",
          issues.length ? "fail" : "pass",
          `${counts.blogPosts} visuels d'articles vérifiés (100 % WebP sur disque et CDN Vercel Blob actif).`,
          issues.slice(0, 15)
        )
      );
    }

    // ── 7. Base de connaissances du support IA ──────────────────────────────
    {
      const issues: IntegrityIssue[] = [];
      for (const k of kbItems) {
        if (!k.question?.trim() || !k.answer?.trim() || k.answer.trim().length < 30) {
          issues.push({ ref: `kb/${k.id}`, problem: "Question/réponse vide ou trop courte" });
        }
        if (!k.keywords?.trim()) {
          issues.push({ ref: `kb/${k.id}`, problem: "Mots-clés de déclenchement manquants" });
        }
      }
      checks.push(
        makeCheck(
          "kb-invariants",
          "Base de connaissances IA : questions, réponses substantielles, mots-clés",
          issues.length ? "fail" : "pass",
          `${counts.knowledgeItems} entrées vérifiées.`,
          issues
        )
      );
      if (counts.knowledgeItems === 0) {
        checks[checks.length - 1].status = "fail";
        checks[checks.length - 1].details = "Base de connaissances VIDE — le support IA ne pourra rien répondre.";
      }
    }

    // ── 8. Cohérence agrégée du catalogue ───────────────────────────────────
    {
      const issues: IntegrityIssue[] = [];
      const avg = services.length ? services.reduce((sum, s) => sum + s.rating, 0) / services.length : 0;
      const totalSales = services.reduce((sum, s) => sum + s.salesCount, 0);
      if (avg < BUSINESS_RULES.MIN_RATING || avg > BUSINESS_RULES.MAX_RATING) {
        issues.push({ ref: "catalog/avg-rating", problem: `Note moyenne ${avg.toFixed(2)} hors bornes` });
      }
      if (counts.services > 0 && totalSales <= 0) {
        issues.push({ ref: "catalog/sales", problem: "Aucun service réalisé comptabilisé (preuve sociale absente)" });
      }
      checks.push(
        makeCheck(
          "catalog-aggregates",
          "Catalogue : note moyenne dans les bornes, preuve sociale présente",
          issues.length ? "fail" : "pass",
          `Note moyenne ${avg.toFixed(2)}/5 · ${totalSales.toLocaleString("fr-FR")} services réalisés cumulés.`,
          issues
        )
      );
    }

    // ── 8bis. Standards rédactionnels SGA™ de CHAQUE service (SEO/GEO/AIO) ──
    // Contrat du skill obligatoire docs/SKILL-REDACTION-SEO-GEO-AIO.md :
    // toute future fiche de service DOIT respecter ce standard intégral.
    {
      const issues: IntegrityIssue[] = [];
      interface KwShape { primary?: string; secondary?: string[]; longTail?: string[]; aiQueries?: string[] }
      for (const s of services) {
        const kw = safeJsonParse<KwShape | null>(s.keywords, null);
        const faq = safeJsonParse<{ q?: string; a?: string }[] | null>(s.faq, null) ?? [];
        const features = safeJsonParse<string[] | null>(s.features, null) ?? [];
        const deliverables = safeJsonParse<string[] | null>(s.deliverables, null) ?? [];
        const process = safeJsonParse<unknown[] | null>(s.process, null) ?? [];
        const d = s.description ?? "";
        const h2 = (d.match(/^##\s/gm) || []).length;
        const hasBullets = /^[✓✔•-]\s/m.test(d);
        const primaryHead = !!(kw?.primary && norm(d.slice(0, 250)).includes(norm(kw.primary).slice(0, Math.min(20, kw.primary.length))));
        const faqCitable = faq.filter((f) => (f.a ?? "").length >= 80 && (f.q ?? "").trim().endsWith("?")).length;
        const problems: string[] = [];
        if (d.length < 1000) problems.push(`description ${d.length} car. (< 1000)`);
        if (h2 < 3) problems.push(`${h2} H2 (< 3)`);
        if (!hasBullets) problems.push("aucune liste à puces");
        if (!primaryHead) problems.push("answer-first absent (primaire hors des 250 premiers car.)");
        if (!kw?.primary || (kw.secondary ?? []).length < 3 || (kw.longTail ?? []).length < 3) problems.push("mots-clés incomplets (primaire/secondaires/longue traîne)");
        if ((kw?.aiQueries ?? []).length < 3) problems.push(`${(kw?.aiQueries ?? []).length} aiQueries (< 3)`);
        if (faqCitable < 4) problems.push(`${faqCitable} FAQ citables (< 4)`);
        if (features.length < 4) problems.push(`${features.length} points forts (< 4)`);
        if (deliverables.length < 3) problems.push(`${deliverables.length} livrables (< 3)`);
        if (process.length < 3) problems.push(`${process.length} étapes (< 3)`);
        if (s.shortDesc.length < 100 || s.shortDesc.length > 230) problems.push(`shortDesc ${s.shortDesc.length} car. (hors 100-230)`);
        if (s.title.length > 75 || s.title.length < 40) problems.push(`title ${s.title.length} car. (hors 40-75)`);
        if (problems.length) issues.push({ ref: `services/${s.slug}`, problem: problems.join(" ; ") });
      }
      checks.push(
        makeCheck(
          "services-content-standards",
          "Standards rédactionnels SGA™ par service : answer-first, ≥ 3 H2, mots-clés, aiQueries, FAQ citables",
          issues.length ? "fail" : "pass",
          `${counts.services} fiches vérifiées contre le skill rédactionnel obligatoire (docs/SKILL-REDACTION-SEO-GEO-AIO.md).`,
          issues.slice(0, 15)
        )
      );
    }

    // ── 8ter. Standards rédactionnels SGA™ du blog ───────────────────────────
    {
      const issues: IntegrityIssue[] = [];
      for (const b of blogPosts) {
        const problems: string[] = [];
        const h2 = ((b.content ?? "").match(/^##\s/gm) || []).length;
        if ((b.content ?? "").length < 1500) problems.push(`contenu ${b.content.length} car. (< 1500)`);
        if (h2 < 3) problems.push(`${h2} H2 (< 3)`);
        if ((b.excerpt ?? "").length < 80 || (b.excerpt ?? "").length > 200) problems.push(`extrait ${b.excerpt.length} car. (hors 80-200)`);
        if (/\b\d{2,3}\s+services\b/.test(b.content ?? "")) problems.push("mention d'un nombre figé de services (future-robustesse)");
        if (problems.length) issues.push({ ref: `blog/${b.slug}`, problem: problems.join(" ; ") });
      }
      checks.push(
        makeCheck(
          "blog-content-standards",
          "Standards rédactionnels SGA™ du blog : structure H2, extraits, aucun nombre de services figé",
          issues.length ? "fail" : "pass",
          `${counts.blogPosts} articles vérifiés contre le skill rédactionnel obligatoire.`,
          issues
        )
      );
    }

    // ── 8quater. [ADDITIF v1.9.0 — tour d'élites] Primaire 3-5 mots + ancré dans le titre ──
    // Skill ÉTAPE 2 : le primaire est une TÊTE commerciale de 3 à 5 mots
    // significatifs, sous-chaîne du titre (H1/title) — audit E4 P0-3.
    {
      const issues: IntegrityIssue[] = [];
      const n2 = (x: string) => norm(x).replace(/['’]/g, "'");
      for (const s of services) {
        const kw = safeJsonParse<{ primary?: string } | null>(s.keywords, null);
        if (!kw?.primary) {
          issues.push({ ref: `services/${s.slug}`, problem: "mot-clé primaire absent" });
          continue;
        }
        const words = kw.primary.trim().split(/\s+/).filter((w) => w.length > 2);
        const problems: string[] = [];
        if (words.length < 3 || words.length > 5) problems.push(`primaire ${words.length} mots significatifs (hors 3-5)`);
        if (!n2(s.title).includes(n2(kw.primary))) problems.push("primaire absent du titre (ancrage H1/title)");
        if (problems.length) issues.push({ ref: `services/${s.slug}`, problem: problems.join(" ; ") });
      }
      checks.push(
        makeCheck(
          "services-primary-wordcount",
          "Skill SGA™ É2 : primaire = tête commerciale 3-5 mots ancrée dans le titre",
          issues.length ? "fail" : "pass",
          `${counts.services} fiches : primaire 3-5 mots + présent dans le titre.`,
          issues.slice(0, 15)
        )
      );
    }

    // ── 8quinquies. [ADDITIF v1.9.0] Unicité des primaires (anti-cannibalisation) ──
    // Skill ÉTAPE 1 : une intention de recherche = une page — audit E4 P0-3.
    {
      const issues: IntegrityIssue[] = [];
      const vus = new Map<string, string>();
      for (const s of services) {
        const kw = safeJsonParse<{ primary?: string } | null>(s.keywords, null);
        const primary = kw?.primary ?? "";
        const key = primary ? norm(primary).replace(/['’]/g, "'") : "";
        if (!key) continue;
        if (vus.has(key)) {
          issues.push({ ref: `services/${s.slug}`, problem: `cannibalisation : « ${primary} » déjà porté par services/${vus.get(key)}` });
        } else {
          vus.set(key, s.slug);
        }
      }
      checks.push(
        makeCheck(
          "services-primary-unique",
          "Skill SGA™ É1 : un primaire = une intention = une fiche (anti-cannibalisation)",
          issues.length ? "fail" : "pass",
          `${vus.size} primaires distincts pour ${counts.services} fiches.`,
          issues.slice(0, 15)
        )
      );
    }

    // ── 8sexies. [ADDITIF v1.9.0] FAQ : la 1ère question commence par « comment… » ──
    // Activateur GEO v1.7.0 n°4 : les réponses FAQ sont le format le plus repris
    // par les assistants IA — la question d'ouverture doit être un « comment… » réel.
    {
      const issues: IntegrityIssue[] = [];
      for (const s of services) {
        const faq = safeJsonParse<{ q?: string }[] | null>(s.faq, null) ?? [];
        const first = (faq[0]?.q ?? "").trim();
        if (!/^comment/i.test(first)) {
          issues.push({ ref: `services/${s.slug}`, problem: `1ère question sans « comment… » : « ${first.slice(0, 50)} »` });
        }
      }
      checks.push(
        makeCheck(
          "services-faq-first-comment",
          "Activateur GEO v1.7.0 n°4 : la FAQ s'ouvre sur la question « comment… »",
          issues.length ? "fail" : "pass",
          `${counts.services} fiches : question d'ouverture « comment… ».`,
          issues.slice(0, 15)
        )
      );
    }

    // ── 8septies. [ADDITIF v1.9.0] Blog : titre ≤ 75, liens internes ≥ 3, zéro cadratin ──
    {
      const issues: IntegrityIssue[] = [];
      for (const b of blogPosts) {
        const problems: string[] = [];
        if ((b.title ?? "").length > 75) problems.push(`titre ${b.title.length} car. (> 75)`);
        const links = ((b.content ?? "").match(/https:\/\/b2bpro\.store\/services\//g) ?? []).length;
        if (links < 3) problems.push(`${links} liens absolus vers /services/ (< 3)`);
        const serviceSlugs = new Set(services.map((s) => s.slug));
        const svcMatches = [...((b.content ?? "").matchAll(/https:\/\/b2bpro\.store\/services\/([a-z0-9-]+)/g))].map((m) => m[1]);
        const invalidSlugs = [...new Set(svcMatches.filter((slug) => !serviceSlugs.has(slug)))];
        if (invalidSlugs.length > 0) problems.push(`lien(s) cassé(s) vers /services/ : ${invalidSlugs.join(", ")}`);
        const em = (((b.title ?? "") + (b.excerpt ?? "") + (b.content ?? "")).match(/—/g) ?? []).length;
        if (em > 0) problems.push(`${em} cadratin(s)`);
        if (problems.length) issues.push({ ref: `blog/${b.slug}`, problem: problems.join(" ; ") });
      }
      checks.push(
        makeCheck(
          "blog-seo-standards",
          "Skill SGA™ É4/É7 blog : titre ≤ 75 car., ≥ 3 liens vers /services/, zéro cadratin",
          issues.length ? "fail" : "pass",
          `${counts.blogPosts} articles : titre, maillage interne, hygiène typographique.`,
          issues.slice(0, 15)
        )
      );

      // ── 8.b. Responsiveness mobile & protection anti-débordement horizontal
      const mobileIssues: IntegrityIssue[] = [];
      const markdownPath = root("src", "components", "site", "markdown.tsx");
      const layoutPath = root("src", "app", "(public)", "layout.tsx");
      const blogSlugPage = root("src", "app", "(public)", "blog", "[slug]", "page.tsx");

      if (existsSync(markdownPath)) {
        const mdSrc = readFileSync(markdownPath, "utf-8");
        if (!mdSrc.includes("overflow-x-auto") || !mdSrc.includes("touch-pan-x")) {
          mobileIssues.push({ ref: "src/components/site/markdown.tsx", problem: "Composant Markdown sans conteneur de défilement tactile (touch-pan-x / overflow-x-auto)" });
        }
        if (!mdSrc.includes("min-w-[560px]")) {
          mobileIssues.push({ ref: "src/components/site/markdown.tsx", problem: "Tableaux Markdown sans largeur minimale garantie (min-w-[560px])" });
        }
      } else {
        mobileIssues.push({ ref: "src/components/site/markdown.tsx", problem: "Fichier Markdown manquant" });
      }

      if (existsSync(layoutPath)) {
        const layoutSrc = readFileSync(layoutPath, "utf-8");
        if (!layoutSrc.includes("overflow-x-clip") || !layoutSrc.includes("min-w-0")) {
          mobileIssues.push({ ref: "src/app/(public)/layout.tsx", problem: "Layout public sans garde-fou anti-débordement (overflow-x-clip / min-w-0)" });
        }
      }

      if (existsSync(blogSlugPage)) {
        const pageSrc = readFileSync(blogSlugPage, "utf-8");
        if (!pageSrc.includes("min-w-0") || !pageSrc.includes("w-full")) {
          mobileIssues.push({ ref: "src/app/(public)/blog/[slug]/page.tsx", problem: "Page d'article sans containment fluide (min-w-0 / w-full)" });
        }
      }

      for (const b of blogPosts) {
        const codeBlocks = (b.content.match(/```/g) ?? []).length;
        if (codeBlocks % 2 !== 0) {
          mobileIssues.push({ ref: `blog/${b.slug}`, problem: "Bloc de code markdown non fermé (nombre impair de ```)" });
        }
      }

      checks.push(
        makeCheck(
          "blog-mobile-responsiveness",
          "Responsiveness & Mobile-Friendly Blog : zéro débordement horizontal, tableaux/codes tactiles et containment",
          mobileIssues.length ? "fail" : "pass",
          mobileIssues.length ? undefined : `${counts.blogPosts} articles et composants sécurisés contre tout débordement mobile.`,
          mobileIssues.slice(0, 15)
        )
      );
    }
  }

  // ── 9. Assets sur disque (miniatures / avatars orphelins) ────────────────
  {
    const thumbsDir = root("public", "thumbs");
    const avatarsDir = root("public", "avatars");
    const thumbs = existsSync(thumbsDir) ? readdirSync(thumbsDir).filter((f) => f.endsWith(".svg")) : [];
    const avatars = existsSync(avatarsDir) ? readdirSync(avatarsDir).filter((f) => f.endsWith(".svg")) : [];
    counts.thumbs = thumbs.length;
    counts.avatars = avatars.length;
    const expectedThumbs = counts.services * BUSINESS_RULES.THUMBS_PER_SERVICE;
    const expectedAvatars = counts.sellers;
    const status: CheckStatus =
      (expectedThumbs > 0 && thumbs.length < expectedThumbs) || (expectedAvatars > 0 && avatars.length < expectedAvatars)
        ? "fail"
        : thumbs.length > expectedThumbs || avatars.length > expectedAvatars
          ? "warn"
          : "pass";
    checks.push(
      makeCheck(
        "assets-disk",
        "Assets sur disque : volume de miniatures et d'avatars cohérent avec la base",
        status,
        `${thumbs.length} miniatures (attendu ${expectedThumbs}) · ${avatars.length} avatars (attendu ${expectedAvatars}).${
          thumbs.length > expectedThumbs ? " Des miniatures orphelines existent (nettoyage optionnel)." : ""
        }`
      )
    );
  }

  // ── 10. Fichiers critiques du code source ─────────────────────────────────
  {
    const missing = CRITICAL_FILES.filter((f) => !fileNonEmpty(root(f)));
    checks.push(
      makeCheck(
        "critical-files",
        `Fichiers critiques présents et non vides (${CRITICAL_FILES.length} gardés)`,
        missing.length ? "fail" : "pass",
        missing.length ? undefined : "Tous les fichiers vitaux (pages SEO, API, composants, socle) sont en place.",
        missing.map((f) => ({ ref: f, problem: "Fichier vital manquant ou vide — page/endpoint cassé" }))
      )
    );
  }

  // ── 11. Reproductibilité des données de référence ─────────────────────────
  {
    const issues: IntegrityIssue[] = [];
    if (!fileNonEmpty(root("data", "seed.ts"))) issues.push({ ref: "data/seed.ts", problem: "Script de seed absent — la base n'est plus reproductible" });
    if (!fileNonEmpty(root("data", "catalog.json"))) issues.push({ ref: "data/catalog.json", problem: "Catalogue source absent" });
    checks.push(
      makeCheck(
        "data-reproducibility",
        "Reproductibilité : sources de données (seed.ts, catalog.json) présentes",
        issues.length ? "fail" : "pass",
        "La base peut être reconstruite à l'identique via data/seed.ts.",
        issues
      )
    );
  }

  // ── 12. [ADDITIF v1.5.0] Rotation équitable de la vitrine ────────────────
  // Contrôle que la configuration est valide ET que l'algorithme garantit
  // l'exigence produit : la 1ère position change à chaque fenêtre, et chaque
  // service éligible y passe exactement une fois par cycle complet.
  {
    const issues: IntegrityIssue[] = [];
    let rotationDetails = "Rotation désactivée (mode best-sellers figé).";
    try {
      const settings = await getSiteSettings();
      const parsedSettings = siteSettingsSchema.safeParse(settings);
      if (!parsedSettings.success) {
        issues.push({
          ref: "site-settings",
          problem: `Réglages invalides : ${parsedSettings.error.issues[0]?.path.join(".") ?? "?"} — ${parsedSettings.error.issues[0]?.message ?? "forme inattendue"}`,
        });
      }
      const v = settings.vitrine;
      if (
        v.windowMinutes < ROTATION_RULES.WINDOW_MIN_MINUTES ||
        v.windowMinutes > ROTATION_RULES.WINDOW_MAX_MINUTES ||
        v.slotCount < ROTATION_RULES.SLOTS_MIN ||
        v.slotCount > ROTATION_RULES.SLOTS_MAX ||
        v.minRating < ROTATION_RULES.MIN_RATING_FLOOR
      ) {
        issues.push({
          ref: "vitrine/bornes",
          problem: `Paramètres hors bornes (fenêtre ${v.windowMinutes} min, ${v.slotCount} cartes, note min ${v.minRating})`,
        });
      }
      if (v.enabled) {
        const eligible = await db.service.count({ where: { rating: { gte: v.minRating } } });
        if (eligible === 0) {
          issues.push({ ref: "vitrine/eligibles", problem: "Aucun service éligible — la vitrine serait vide" });
        } else {
          // Preuve d'équité sur un cycle complet simulé :
          const firsts = new Set<number>();
          let changes = 0;
          let prev = -1;
          for (let w = 0; w < eligible; w++) {
            const idx = rotationWindowIndices(eligible, v.slotCount, w);
            if (idx.length !== Math.min(v.slotCount, eligible)) {
              issues.push({ ref: "rotation/uniqueness", problem: `La fenêtre ${w} ne renvoie pas ${Math.min(v.slotCount, eligible)} indices uniques` });
              break;
            }
            const first = idx[0]!;
            if (prev !== -1 && first !== prev) changes++;
            prev = first;
            firsts.add(first);
          }
          if (firsts.size !== eligible) {
            issues.push({
              ref: "rotation/equite",
              problem: `Sur un cycle de ${eligible} fenêtres, seulement ${firsts.size} services différents atteignent la 1ère position (attendu : ${eligible})`,
            });
          }
          if (eligible > 1 && changes !== eligible - 1) {
            issues.push({
              ref: "rotation/cadence",
              problem: `La 1ère position ne change pas à chaque fenêtre (${changes}/${eligible - 1} changements observés)`,
            });
          }
          rotationDetails = `Rotation active : ${eligible} services éligibles, fenêtre de ${v.windowMinutes} min, cycle complet en ${Math.round((eligible * v.windowMinutes) / 60)} h — équité vérifiée sur un cycle simulé.`;
        }
      }
    } catch (e) {
      issues.push({ ref: "vitrine", problem: `Contrôle de rotation impossible : ${e instanceof Error ? e.message : String(e)}` });
    }
    checks.push(
      makeCheck(
        "home-rotation-fairness",
        "Vitrine rotative : réglages valides, cadence respectée, équité stricte du cycle complet",
        issues.length ? "fail" : "pass",
        rotationDetails,
        issues
      )
    );
  }

  // ── 13. [ADDITIF] Conformité Google Search Console (Extraits d'avis, Fiches de marchand, URLs GSC) ──
  {
    const issues: IntegrityIssue[] = [];
    try {
      const svcPage = readFileSync(root("src/app/(public)/services/[slug]/page.tsx"), "utf8");
      const sellerPage = readFileSync(root("src/app/(public)/vendeurs/[slug]/page.tsx"), "utf8");
      const blogPage = readFileSync(root("src/app/(public)/blog/[slug]/page.tsx"), "utf8");
      const catPage = readFileSync(root("src/app/(public)/categories/[slug]/page.tsx"), "utf8");

      // 1. Extraits d'avis GSC : `Service` ne doit JAMAIS porter `aggregateRating`
      const serviceBlock = svcPage.split('"@type": "Product"')[0] ?? "";
      if (serviceBlock.includes('"@type": "Service"') && /aggregateRating\s*:/.test(serviceBlock)) {
        issues.push({
          ref: "src/app/(public)/services/[slug]/page.tsx",
          problem: 'GSC Extraits d\'avis : `@type: "Service"` porte `aggregateRating` (erreur critique <parent_node>)',
        });
      }
      // 2. `Product` doit porter `aggregateRating`, `hasMerchantReturnPolicy` et `shippingDetails`
      const productBlock = svcPage.split('"@type": "Product"')[1]?.split('"@type": "FAQPage"')[0] ?? "";
      if (!/aggregateRating\s*:/.test(productBlock)) {
        issues.push({
          ref: "src/app/(public)/services/[slug]/page.tsx",
          problem: 'GSC Extraits d\'avis : `@type: "Product"` doit porter `aggregateRating`',
        });
      }
      if (!productBlock.includes("hasMerchantReturnPolicy") || !productBlock.includes("MerchantReturnPolicy")) {
        issues.push({
          ref: "src/app/(public)/services/[slug]/page.tsx",
          problem: 'GSC Fiches de marchand : `hasMerchantReturnPolicy` manquant dans `Product.offers`',
        });
      }
      if (!productBlock.includes("shippingDetails") || !productBlock.includes("OfferShippingDetails")) {
        issues.push({
          ref: "src/app/(public)/services/[slug]/page.tsx",
          problem: 'GSC Fiches de marchand : `shippingDetails` manquant dans `Product.offers`',
        });
      }
      // 3. `Person` sur /vendeurs/[slug] ne doit JAMAIS porter `aggregateRating`
      if (sellerPage.includes('"@type": "Person"') && /aggregateRating\s*:/.test(sellerPage)) {
        issues.push({
          ref: "src/app/(public)/vendeurs/[slug]/page.tsx",
          problem: 'GSC Extraits d\'avis : `@type: "Person"` porte `aggregateRating` (erreur critique <parent_node>)',
        });
      }
      // 4. `Article` sur /blog/[slug] doit porter `dateModified` et `publisher.logo`
      if (!blogPage.includes("dateModified")) {
        issues.push({
          ref: "src/app/(public)/blog/[slug]/page.tsx",
          problem: 'GSC Article : `dateModified` manquant dans `articleJsonLd`',
        });
      }
      // 5. `CollectionPage` sur /categories/[slug] doit encapsuler `numberOfItems` dans `ItemList`
      if (catPage.includes("numberOfItems") && !catPage.includes('"@type": "ItemList"')) {
        issues.push({
          ref: "src/app/(public)/categories/[slug]/page.tsx",
          problem: 'Schema.org : `numberOfItems` sur `CollectionPage` doit être dans `mainEntity` (`ItemList`)',
        });
      }

      // 6. Vérification de toutes les URLs de docs/GSC-REINDEXATION.txt contre la base active
      const gscPath = root("docs/GSC-REINDEXATION.txt");
      if (existsSync(gscPath) && dbOk) {
        const gscText = readFileSync(gscPath, "utf8");
        const urls = [...new Set(gscText.match(/https:\/\/b2bpro\.store[^\s)]*/g) ?? [])];
        const svcSlugs = new Set(services.map((s) => s.slug));
        const postSlugs = new Set(blogPosts.map((b) => b.slug));
        const sellerSlugs = new Set(sellers.map((s) => s.slug));
        for (const u of urls) {
          const pathname = new URL(u).pathname;
          if (pathname === "/" || pathname === "/blog" || pathname === "/services" || pathname === "/support") continue;
          const mSvc = pathname.match(/^\/services\/([a-z0-9-]+)$/);
          const mBlog = pathname.match(/^\/blog\/([a-z0-9-]+)$/);
          const mCat = pathname.match(/^\/categories\/([a-z0-9-]+)$/);
          const mSel = pathname.match(/^\/vendeurs\/([a-z0-9-]+)$/);
          if (mSvc && !svcSlugs.has(mSvc[1]!)) {
            issues.push({ ref: "docs/GSC-REINDEXATION.txt", problem: `Service introuvable en base : ${u}` });
          } else if (mBlog && !postSlugs.has(mBlog[1]!)) {
            issues.push({ ref: "docs/GSC-REINDEXATION.txt", problem: `Article introuvable en base : ${u}` });
          } else if (mCat && !POLE_LABELS[mCat[1]!]) {
            issues.push({ ref: "docs/GSC-REINDEXATION.txt", problem: `Catégorie inconnue : ${u}` });
          } else if (mSel && !sellerSlugs.has(mSel[1]!)) {
            issues.push({ ref: "docs/GSC-REINDEXATION.txt", problem: `Vendeur introuvable en base : ${u}` });
          } else if (!mSvc && !mBlog && !mCat && !mSel) {
            issues.push({ ref: "docs/GSC-REINDEXATION.txt", problem: `Route non reconnue : ${u}` });
          }
        }
      }
    } catch (e) {
      issues.push({ ref: "gsc-structured-data", problem: `Erreur lors de la vérification : ${e instanceof Error ? e.message : String(e)}` });
    }

    checks.push(
      makeCheck(
        "gsc-structured-data-compliance",
        "Conformité Google Search Console : Extraits d'avis (<parent_node>), Fiches de marchand (retours/livraison) et validité des URLs GSC",
        issues.length ? "fail" : "pass",
        "Schémas JSON-LD Service, Product, Person, Article, CollectionPage et 52 URLs GSC-REINDEXATION conformes.",
        issues
      )
    );
  }

  const ok = checks.every((c) => c.status !== "fail");
  return {
    ok,
    contractVersion: CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    counts,
    checks,
  };
}

/** Forme attendue du champ keywords (usage interne du guard). */
interface ServiceKeywordsShape {
  primary: string;
  secondary: string[];
  longTail: string[];
}

/** Affiche le rapport en console (script CLI). Code couleur terminal. */
export function formatReportText(report: IntegrityReport): string {
  const lines: string[] = [];
  const icon = (s: CheckStatus) => (s === "pass" ? "✓" : s === "warn" ? "⚠" : "✗");
  lines.push("═════════════════════════════════════════════════════════");
  lines.push(`  GARDE D'INTÉGRITÉ b2bpro.store — contrats v${report.contractVersion}`);
  lines.push(`  ${report.generatedAt}`);
  lines.push("═════════════════════════════════════════════════════════");
  for (const c of report.checks) {
    lines.push(`  [${icon(c.status)}] ${c.id} — ${c.label}`);
    if (c.details) lines.push(`        ${c.details}`);
    for (const i of c.issues ?? []) lines.push(`        → ${i.ref} : ${i.problem}`);
  }
  lines.push("───────────────────────────────────────────────────────────");
  lines.push(
    report.ok
      ? `  RÉSULTAT : ✓ CODE PROTÉGÉ — ${report.checks.length} contrôles, aucun échec.`
      : `  RÉSULTAT : ✗ RÉGRESSION DÉTECTÉE — corriger avant tout commit.`
  );
  lines.push("═════════════════════════════════════════════════════════");
  return lines.join("\n");
}

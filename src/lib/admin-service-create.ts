/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CRÉATION DE SERVICE — logique serveur du panneau d'administration (v2.6.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Point d'entrée : createServiceFromAdmin() — appelé par POST /api/admin/services
 *  derrière la garde ensureAdmin. Réplique le FUNNEL canonique du catalogue
 *  (scripts/add-service.ts) sous forme d'API :
 *
 *   1. validation éditoriale SGA™ MIROIR EXACT du garde-fou (guard.ts) :
 *      un service qui ne passerait pas `bun run guard` est REFUSÉ ici —
 *      la création ne peut JAMAIS transformer /api/integrity en 503 ;
 *   2. slug + code auto (#NNN) selon les mêmes règles que le seed ;
 *   3. unicité du mot-clé primaire (anti-cannibalisation, 409 si déjà porté) ;
 *   4. insertion transactionnelle service + options ;
 *   5. miniatures : le GÉNÉRATEUR OFFICIEL (data/gen/thumbs.ts) écrit les 3 SVG
 *      dans public/thumbs/ quand le système de fichiers est inscriptible
 *      (développement / self-hosted) ; sinon (production Vercel read-only) les
 *      3 SVG sont encodés en data URIs dans Service.thumbUrls — la fiche a des
 *      images immédiatement, et la réponse remet aussi les contenus à
 *      committer dans public/thumbs/ pour le runbook de déploiement ;
 *   6. trace d'audit journal admin (SERVICE_CREATE, best-effort).
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import {
  ADMIN_LOG_ACTIONS,
  BUSINESS_RULES,
  SERVICE_EDITORIAL_RULES,
  safeJsonParse,
  type AdminServiceCreateInput,
  type AdminServiceCreateResponse,
} from "@/lib/contracts";
import { logAdminAction } from "@/lib/settings";
import { POLES, type PoleDef } from "../../data/gen/poles";
import { slugify } from "../../data/gen/enrich";
import { thumbV1, thumbV2, thumbV3 } from "../../data/gen/thumbs";

/** Erreur métier de création — code HTTP + message orienté panneau admin. */
export class ServiceCreateError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ServiceCreateError";
  }
}

/** Normalisation identique au garde-fou (accents, espaces, casse). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Variante apostrophes du garde-fou (check services-primary-wordcount). */
const n2 = (x: string) => norm(x).replace(/['’]/g, "'");

/** Étendue de validation : { ok } ou { problem } — jamais d'exception. */
interface EditorialVerdict {
  problems: string[];
}

/**
 * Validation éditoriale complète — chaque règle est la copie du contrôle
 * correspondant de src/lib/guard.ts (mêmes regex, mêmes bornes).
 */
function validateEditorial(input: AdminServiceCreateInput, pole: PoleDef): EditorialVerdict {
  const problems: string[] = [];
  const d = input.description;

  // ── services-content-standards (guard §8bis) ─────────────────────────────
  const h2 = (d.match(/^##\s/gm) || []).length;
  const hasBullets = /^[✓✔•-]\s/m.test(d);
  const primaryHead = !!(
    input.keywords.primary &&
    norm(d.slice(0, 250)).includes(
      norm(input.keywords.primary).slice(0, Math.min(20, input.keywords.primary.length))
    )
  );
  const faqCitable = input.faq.filter(
    (f) => f.a.length >= SERVICE_EDITORIAL_RULES.FAQ_ANSWER_MIN && f.q.trim().endsWith("?")
  ).length;

  if (d.length < SERVICE_EDITORIAL_RULES.DESC_MIN)
    problems.push(`description ${d.length} caractères (min ${SERVICE_EDITORIAL_RULES.DESC_MIN})`);
  if (h2 < SERVICE_EDITORIAL_RULES.H2_MIN)
    problems.push(`${h2} sections H2 (min ${SERVICE_EDITORIAL_RULES.H2_MIN}) — utilisez « ## Titre »`);
  if (!hasBullets) problems.push("aucune liste à puces (commencez une ligne par « - » ou « ✓ »)");
  if (!primaryHead)
    problems.push("answer-first absent : le mot-clé primaire doit apparaître dans les 250 premiers caractères de la description");
  if (faqCitable < SERVICE_EDITORIAL_RULES.FAQ_MIN)
    problems.push(`${faqCitable} réponses FAQ citables (min ${SERVICE_EDITORIAL_RULES.FAQ_MIN}, réponse ≥ ${SERVICE_EDITORIAL_RULES.FAQ_ANSWER_MIN} caractères + question en « ? »)`);
  if (input.features.length < SERVICE_EDITORIAL_RULES.FEATURES_MIN)
    problems.push(`${input.features.length} points forts (min ${SERVICE_EDITORIAL_RULES.FEATURES_MIN})`);
  if (input.deliverables.length < SERVICE_EDITORIAL_RULES.DELIVERABLES_MIN)
    problems.push(`${input.deliverables.length} livrables (min ${SERVICE_EDITORIAL_RULES.DELIVERABLES_MIN})`);
  if (input.process.length < SERVICE_EDITORIAL_RULES.PROCESS_MIN)
    problems.push(`${input.process.length} étapes de méthode (min ${SERVICE_EDITORIAL_RULES.PROCESS_MIN})`);

  // ── services-primary-wordcount (guard §8quater) ──────────────────────────
  const primaryWords = input.keywords.primary.trim().split(/\s+/).filter((w) => w.length > 2);
  if (primaryWords.length < SERVICE_EDITORIAL_RULES.PRIMARY_WORDS_MIN || primaryWords.length > SERVICE_EDITORIAL_RULES.PRIMARY_WORDS_MAX)
    problems.push(
      `primaire : ${primaryWords.length} mots significatifs (bornes ${SERVICE_EDITORIAL_RULES.PRIMARY_WORDS_MIN}-${SERVICE_EDITORIAL_RULES.PRIMARY_WORDS_MAX})`
    );
  if (!n2(input.title).includes(n2(input.keywords.primary)))
    problems.push("primaire absent du titre (ancrage H1/title exigé par le skill SGA™)");

  // ── services-faq-first-comment (guard §8sexies) ─────────────────────────
  const first = (input.faq[0]?.q ?? "").trim();
  if (!/^comment/i.test(first))
    problems.push("la 1re question de la FAQ doit commencer par « comment… » (activateur GEO)");

  // ── services-invariants (guard §3) : pôle connu, bornes métier ──────────
  if (!POLES.some((p) => p.slug === pole.slug)) problems.push("pôle inconnu");
  if (input.rating < BUSINESS_RULES.MIN_RATING || input.rating > BUSINESS_RULES.MAX_RATING)
    problems.push(`note ${input.rating} hors bornes ${BUSINESS_RULES.MIN_RATING}-${BUSINESS_RULES.MAX_RATING}`);

  return { problems };
}

/** Prochain code catalogue « #NNN » (suite numérique du catalogue existant). */
async function nextCatalogCode(): Promise<string> {
  const rows = await db.service.findMany({ select: { code: true } });
  let max = 0;
  for (const r of rows) {
    const m = r.code.match(/^#(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `#${max + 1}`;
}

/** Slug unique selon les règles du seed (slugify + suffixes anti-collision). */
async function uniqueSlug(title: string, name: string, code: string): Promise<string> {
  let slug = slugify(title);
  if (slug.length < 8) slug = slugify(`${code}-${name}`);
  const taken = new Set((await db.service.findMany({ select: { slug: true } })).map((s) => s.slug));
  if (!taken.has(slug)) return slug;
  const codeSuffix = code.toLowerCase().replace(/[^a-z0-9]/g, "");
  let candidate = `${slug}-${codeSuffix}`;
  let n = 2;
  while (taken.has(candidate)) candidate = `${slug}-${codeSuffix}-${n++}`;
  return candidate;
}

/**
 * Miniatures : les 3 SVG du générateur officiel — écrit sur disque si possible
 * (dev/self-hosted), sinon encodés en data URIs (production read-only).
 */
function produceThumbs(params: {
  slug: string;
  title: string;
  category: string;
  basePrice: number;
  deliveryDays: number;
  pole: PoleDef;
}): { written: boolean; files: string[]; dataUrls?: string[]; thumbUrlsJson: string | null } {
  const svc = {
    slug: params.slug,
    title: params.title,
    category: params.category,
    basePrice: params.basePrice,
    deliveryDays: params.deliveryDays,
    pole: params.pole,
  };
  const svgs = [thumbV1(svc), thumbV2(svc), thumbV3(svc)];
  try {
    const dir = path.join(process.cwd(), "public", "thumbs");
    mkdirSync(dir, { recursive: true });
    const files: string[] = [];
    svgs.forEach((svg, i) => {
      const file = `public/thumbs/${params.slug}-${i + 1}.svg`;
      writeFileSync(path.join(process.cwd(), file), svg, "utf-8");
      files.push(file);
    });
    return { written: true, files, thumbUrlsJson: null };
  } catch {
    // Système de fichiers non inscriptible (Vercel) : data URIs — la fiche est
    // illustrée immédiatement ; les contenus sont aussi remis dans la réponse
    // pour être committés dans public/thumbs/ (runbook §déploiement).
    const dataUrls = svgs.map((svg) => `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`);
    return { written: false, files: [], dataUrls, thumbUrlsJson: JSON.stringify(dataUrls) };
  }
}

/**
 * Création complète d'un service — validation SGA™ miroir du garde-fou,
 * slug/code auto, unicité du primaire, insertion transactionnelle (service +
 * options), miniatures officielles, journal d'audit.
 */
export async function createServiceFromAdmin(
  input: AdminServiceCreateInput
): Promise<AdminServiceCreateResponse> {
  // ── 1. Pôle canonique ────────────────────────────────────────────────────
  const pole = POLES.find((p) => p.slug === input.poleSlug);
  if (!pole) {
    throw new ServiceCreateError("Pôle métier inconnu — choisissez-en un dans la liste.", 400);
  }

  // ── 2. Vendeur porteur ────────────────────────────────────────────────────
  const seller = await db.seller.findUnique({ where: { slug: input.sellerSlug } });
  if (!seller) {
    throw new ServiceCreateError("Vendeur inconnu — choisissez-en un dans la liste.", 404);
  }

  // ── 3. Validation éditoriale SGA™ (miroir intégral du garde-fou) ──────────
  const verdict = validateEditorial(input, pole);
  if (verdict.problems.length) {
    throw new ServiceCreateError(
      `Fiche refusée par le standard éditorial SGA™ (la garde d'intégrité la rejetterait aussi) : ${verdict.problems.join(" ; ")}`,
      400
    );
  }

  // ── 4. Unicité du primaire (anti-cannibalisation, guard §8quinquies) ─────
  const siblings = await db.service.findMany({ select: { slug: true, keywords: true } });
  const primaryNorm = n2(input.keywords.primary);
  for (const s of siblings) {
    const kw = safeJsonParse<{ primary?: string } | null>(s.keywords, null);
    if (kw?.primary && n2(kw.primary) === primaryNorm) {
      throw new ServiceCreateError(
        `Mot-clé primaire déjà porté par /services/${s.slug} (« ${kw.primary} ») — un primaire = une fiche (anti-cannibalisation). Reformulez l'intention.`,
        409
      );
    }
  }

  // ── 5. Slug + code canoniques ─────────────────────────────────────────────
  const code = await nextCatalogCode();
  const slug = await uniqueSlug(input.title, input.name, code);

  // ── 6. Insertion transactionnelle (service + options) ─────────────────────
  const created = await db.$transaction(async (tx) => {
    const service = await tx.service.create({
      data: {
        slug,
        code,
        name: input.name,
        title: input.title,
        category: input.category,
        pole: pole.fullLabel,
        poleSlug: pole.slug,
        poleIcon: pole.icon,
        basePrice: input.basePrice,
        deliveryDays: input.deliveryDays,
        description: input.description,
        shortDesc: input.shortDesc,
        keywords: JSON.stringify(input.keywords),
        faq: JSON.stringify(input.faq),
        features: JSON.stringify(input.features),
        deliverables: JSON.stringify(input.deliverables),
        process: JSON.stringify(
          input.process.map((p, i) => ({ step: i + 1, title: p.title, detail: p.detail }))
        ),
        rating: Math.round(input.rating * 10) / 10,
        reviewsCount: input.reviewsCount,
        salesCount: input.salesCount,
        views: input.views,
        featured: false,
        isFounder: false,
        sellerId: seller.id,
      },
    });
    let position = 0;
    for (const opt of input.options) {
      await tx.serviceOption.create({
        data: {
          serviceId: service.id,
          name: opt.name,
          description: opt.description,
          priceExtra: opt.priceExtra,
          daysExtra: opt.daysExtra,
          monthly: opt.monthly,
          position: position++,
        },
      });
    }
    return service;
  });

  // ── 7. Miniatures officielles (générateur du catalogue) ───────────────────
  const thumbs = produceThumbs({
    slug,
    title: input.title.replace(/^Je vais\s+/i, ""),
    category: input.category.split(/[>&]/)[0].trim(),
    basePrice: input.basePrice,
    deliveryDays: input.deliveryDays,
    pole,
  });
  if (thumbs.thumbUrlsJson) {
    await db.service
      .update({ where: { id: created.id }, data: { thumbUrls: thumbs.thumbUrlsJson } })
      .catch(() => undefined); // best-effort : le fallback local reste valide
  }

  // ── 8. Journal d'audit (best-effort, jamais bloquant) ─────────────────────
  await logAdminAction(
    ADMIN_LOG_ACTIONS.SERVICE_CREATE,
    `Service « ${input.title} » créé depuis le panneau (${code}, pôle ${pole.label}, ${input.basePrice} €, ${input.deliveryDays} j, vendeur ${seller.name}) — /services/${slug}`
  );

  return {
    ok: true,
    service: {
      id: created.id,
      slug,
      code,
      title: input.title,
      url: `/services/${slug}`,
      poleSlug: pole.slug,
      optionsCount: input.options.length,
    },
    thumbs: {
      written: thumbs.written,
      files: thumbs.files,
      ...(thumbs.dataUrls ? { dataUrls: thumbs.dataUrls } : {}),
    },
  };
}

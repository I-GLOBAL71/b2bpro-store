/**
 * CLI : `bun run humanize:content` — humanisation intégrale des fiches services.
 *
 * Applique data/gen/humanize.ts (couche rédactionnelle v2) aux 113 fiches de la
 * base locale : descriptions (accroche answer-first naturelle, H2 variés, phrase
 * d'expertise avec vraies requêtes, garanties reformulées), shortDesc (primary
 * intégré, zéro troncature), mots-clés V2 (primary grammatical + requêtes réelles
 * à fort trafic + aiQueries correctes), FAQ (5 réponses autonomes contextuelles,
 * dont une vraie question « comment… »), features/deliverables/process (libellés
 * variabilisés).
 *
 * INVARIANTS : ne modifie JAMAIS slug, title, name, prix, délais, notes, counts,
 * sellerId, createdAt, thumbUrls. Champ d'écriture strictement limité à :
 * description, shortDesc, keywords, faq, features, deliverables, process.
 *
 * Idempotent : les fiches déjà marquées keywords.v = 2 sont ignorées (sauf --force).
 * Déterministe : toutes les rotations proviennent du hash du slug (zéro aléatoire).
 *
 * Usage :
 *   bun run scripts/humanize-content.ts            # transformation (skip si déjà v2)
 *   bun run scripts/humanize-content.ts --force    # ré-applique partout (même résultat)
 *   bun run scripts/humanize-content.ts --dry-run  # rapport sans écriture
 */
import { db } from "../src/lib/db";
import {
  buildHumanizedBundle,
  isHumanizedKeywords,
  REAL_POLE_QUERIES,
  type ServiceKeywords,
} from "../data/gen/humanize";
import { POLES } from "../data/gen/poles";

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DRY = args.includes("--dry-run");

/** Le seul jeu de mots-clés rédigé à la main (v1.4.0) — son primary part en secondary. */
const MANUAL_KEYWORD_SLUG = "je-vais-rediger-votre-article-de-blog-ultra-optimise-seo-geo-et-aio";

function jsonTry<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** UPDATE avec re-essai : le dev server lit la base en parallèle (SQLITE_BUSY possible). */
async function updateWithRetry(slug: string, data: Record<string, string>, attempts = 5): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await db.service.update({ where: { slug }, data });
      return;
    } catch (e) {
      if (i === attempts) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      if (/locked|busy/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 250 * i));
        continue;
      }
      throw e;
    }
  }
}

async function main() {
  const services = await db.service.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const options = await db.serviceOption.findMany({ orderBy: { priceExtra: "asc" } });
  const optsByService = new Map<string, { name: string; priceExtra: number }[]>();
  for (const o of options) {
    const list = optsByService.get(o.serviceId) ?? [];
    list.push({ name: o.name, priceExtra: o.priceExtra });
    optsByService.set(o.serviceId, list);
  }

  // index de fiche dans son pôle + fratrie (ordre createdAt) + effectif par pôle
  const seenInPole = new Map<string, number>();
  const poleCount = new Map<string, number>();
  const poleTitles = new Map<string, string[]>();
  for (const s of services) poleCount.set(s.poleSlug, (poleCount.get(s.poleSlug) ?? 0) + 1);
  for (const s of services) {
    const i = seenInPole.get(s.poleSlug) ?? 0;
    seenInPole.set(s.poleSlug, i + 1);
    (poleTitles.get(s.poleSlug) ?? poleTitles.set(s.poleSlug, []).get(s.poleSlug)!).push(s.title);
  }
  const poleIndexOf = new Map<string, number>();
  {
    const counters = new Map<string, number>();
    for (const s of services) {
      const i = counters.get(s.poleSlug) ?? 0;
      counters.set(s.poleSlug, i + 1);
      poleIndexOf.set(s.slug, i);
    }
  }

  // ── stats AVANT ──────────────────────────────────────────────────────────────
  const before = await stats();

  let transformed = 0;
  let skipped = 0;
  let failed = 0;

  for (const s of services) {
    if (!FORCE && isHumanizedKeywords(s.keywords)) {
      skipped++;
      continue;
    }
    const pole = POLES.find((p) => p.slug === s.poleSlug);
    if (!pole) {
      console.error(`✗ Pôle inconnu pour ${s.slug} (${s.poleSlug}) — fiche ignorée.`);
      failed++;
      continue;
    }
    const siblings = (poleTitles.get(s.poleSlug) ?? [])
      .filter((t) => t !== s.title)
      .slice(0, 2)
      .map((t) => t.replace(/^Je vais\s+/, ""));

    const manual: ServiceKeywords | undefined =
      s.slug === MANUAL_KEYWORD_SLUG
        ? (() => {
            const old = jsonTry<ServiceKeywords>(s.keywords, { primary: "", secondary: [], longTail: [], aiQueries: [] });
            return {
              primary: "",
              secondary: old.primary ? [old.primary, ...old.secondary] : old.secondary,
              longTail: old.longTail,
              aiQueries: old.aiQueries,
            };
          })()
        : undefined;

    try {
      const bundle = buildHumanizedBundle({
        slug: s.slug,
        title: s.title,
        category: s.category,
        poleLabel: pole.label,
        poleSlug: s.poleSlug,
        poleIndex: poleIndexOf.get(s.slug) ?? 0,
        poleCount: poleCount.get(s.poleSlug) ?? 1,
        siblingTitles: siblings,
        basePrice: s.basePrice,
        deliveryDays: s.deliveryDays,
        rating: s.rating,
        reviewsCount: s.reviewsCount,
        salesCount: s.salesCount,
        options: optsByService.get(s.id) ?? [],
        currentDescription: s.description,
        currentFeatures: jsonTry<string[]>(s.features, []),
        currentDeliverables: jsonTry<string[]>(s.deliverables, []),
        currentProcess: jsonTry<{ step: number; title: string; detail: string }[]>(s.process, []),
        hotKeywords: pole.hotKeywords,
        realQueries: REAL_POLE_QUERIES[s.poleSlug] ?? [],
        manualKeywords: manual,
      });

      const data = {
        description: bundle.description,
        shortDesc: bundle.shortDesc,
        keywords: JSON.stringify(bundle.keywords),
        faq: JSON.stringify(bundle.faq),
        features: JSON.stringify(bundle.features),
        deliverables: JSON.stringify(bundle.deliverables),
        process: JSON.stringify(bundle.process),
      };

      if (DRY) {
        transformed++;
      } else {
        await updateWithRetry(s.slug, data);
        transformed++;
        if (transformed % 20 === 0) console.log(`   … ${transformed}/${services.length} fiches transformées`);
      }
    } catch (e) {
      console.error(`✗ Échec ${s.slug} :`, e instanceof Error ? e.message : e);
      failed++;
    }
  }

  // ── stats APRÈS ─────────────────────────────────────────────────────────────
  const after = DRY ? before : await stats();

  console.log("\n═════════════════════════════════════════════════════");
  console.log(`  HUMANISATION DES FICHES SERVICES ${DRY ? "(DRY-RUN)" : ""}`);
  console.log(`  ${transformed} transformées · ${skipped} déjà v2 · ${failed} échec(s)`);
  console.log("───────────────────────────────────────────────────────");
  console.log("  Métrique                              Avant   Après");
  console.log(`  « s'appuie sur : »                    ${String(before.appuie).padStart(5)}   ${String(after.appuie).padStart(5)}`);
  console.log(`  tirets cadratins « — »               ${String(before.emdash).padStart(5)}   ${String(after.emdash).padStart(5)}`);
  console.log(`  puces « ✓ »                           ${String(before.checks).padStart(5)}   ${String(after.checks).padStart(5)}`);
  console.log(`  shortDesc tronquées « … »             ${String(before.trunc).padStart(5)}   ${String(after.trunc).padStart(5)}`);
  console.log(`  guillemets anglais \" \"                ${String(before.dq).padStart(5)}   ${String(after.dq).padStart(5)}`);
  console.log(`  primary dans shortDesc                ${String(before.priSd).padStart(5)}   ${String(after.priSd).padStart(5)}`);
  console.log(`  titres H2 distincts (slot 1)         ${String(before.h2s1).padStart(5)}   ${String(after.h2s1).padStart(5)}`);
  console.log(`  mots-clés « pôle collé »              ${String(before.poleGlued).padStart(5)}   ${String(after.poleGlued).padStart(5)}`);
  console.log(`  fautes d'élision « de voyelle »      ${String(before.elision).padStart(5)}   ${String(after.elision).padStart(5)}`);
  console.log("═════════════════════════════════════════════════════");

  if (failed > 0) process.exit(1);
}

async function stats() {
  const services = await db.service.findMany();
  let appuie = 0, emdash = 0, checks = 0, trunc = 0, dq = 0, priSd = 0, h2s1Set = new Set<string>(), poleGlued = 0, elision = 0;
  for (const s of services) {
    const full = `${s.description}\n${s.shortDesc}`;
    if (/s['’]app[uo]ie sur\s*:/i.test(s.description)) appuie++;
    emdash += (full.match(/—/g) || []).length;
    checks += (full.match(/[✓✔]/g) || []).length;
    if (/…$|\.\.\.$/.test(s.shortDesc.trim())) trunc++;
    dq += (full.match(/"[^"]+"/g) || []).length;
    const kw = jsonTry<ServiceKeywords>(s.keywords, { primary: "", secondary: [], longTail: [], aiQueries: [] });
    if (s.shortDesc.toLowerCase().includes(kw.primary.toLowerCase().slice(0, 25))) priSd++;
    for (const m of s.description.matchAll(/^##\s+(.+)$/gm)) h2s1Set.add(m[1]);
    if (kw.secondary.some((k) => /&|,/.test(k))) poleGlued++;
    if (/\bde\s+[aeiouyéèêàâîô]/i.test(`${kw.primary} ${kw.secondary.join(" ")}`)) elision++;
  }
  return { appuie, emdash, checks, trunc, dq, priSd, h2s1: h2s1Set.size, poleGlued, elision };
}

main()
  .catch((e) => {
    console.error("✗ Échec de l'humanisation :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

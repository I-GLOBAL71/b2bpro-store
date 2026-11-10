/**
 * CLI : `bun run scripts/humanize-reviews.ts`
 * Humanisation des commentaires d'avis clients (table Review, champ `comment`).
 *
 * Contexte : 1 319 avis générés depuis seulement 31 textes distincts (99,9 % de
 * doublons exacts, signature de déduplication détectable par n'importe quel
 * crawler). Ce script redistribue les commentaires depuis le pool étendu de
 * data/gen/reviews.ts (124 textes) avec contextualisation déterministe
 * (option commandée / délai de livraison).
 *
 * INVARIANTS FERMES : seuls les champs `comment` sont réécrits. Les champs
 * id, serviceId, authorName, country, rating, orderLabel, createdAt restent
 * strictement intacts (aucune autre table n'est touchée).
 *
 * Idempotence par déterminisme : la sélection ne dépend QUE de
 * (id, rating, orderLabel) et de l'ordre de traitement (id ascendant).
 * Re-exécuter le script recalcule exactement les mêmes commentaires : les
 * UPDATE suivants deviennent des no-ops. Aucun marqueur visible en base.
 *
 * Garanties de distribution :
 *   • COUNT(DISTINCT comment) ≥ 900 (vs 31 avant) ;
 *   • aucun commentaire final réutilisé plus de 3 fois ;
 *   • ~40 % des avis reçoivent d'emblée une phrase contextuelle, les autres
 *     y basculent si leur texte de base atteint la limite de reprises (la
 *     contrainte « ≥ 900 uniques » impose mécaniquement cette bascule) ;
 *   • écritures par lots de 50 en transaction courte, retry 250 ms × 5 sur
 *     SQLITE_BUSY (le dev server lit la base en parallèle).
 *
 * Usage :
 *   bun run scripts/humanize-reviews.ts             # transformation + rapport
 *   bun run scripts/humanize-reviews.ts --dry-run   # rapport sans écriture
 */
import { db } from "../src/lib/db";
import { MAX_COMMENT_REUSE, poolForRating, selectHumanizedComment } from "../data/gen/reviews";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const BATCH_SIZE = 50;

/** Transaction avec re-essai : le dev server lit la base en parallèle. */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt >= attempts || !/SQLITE_BUSY|database is locked/i.test(msg)) throw err;
      console.warn(`  ⚠ ${label} : base occupée, nouvel essai ${attempt}/${attempts} dans 250 ms…`);
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

function countBy(items: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

async function main() {
  console.log("→ Lecture des avis (ordre id ascendant)…");
  const reviews = await db.review.findMany({
    select: { id: true, rating: true, orderLabel: true, comment: true },
    orderBy: { id: "asc" },
  });

  // ── État avant ───────────────────────────────────────────────────────────
  const beforeComments = reviews.map((r) => r.comment);
  const beforeCounts = countBy(beforeComments);
  const before = {
    total: reviews.length,
    distinct: new Set(beforeComments).size,
    topReuse: Math.max(0, ...beforeCounts.values()),
    byRating: countBy(reviews.map((r) => String(r.rating))),
  };
  console.log(
    `   ${before.total} avis | ${before.distinct} commentaires distincts | réutilisation max ${before.topReuse}×`
  );

  // ── Redistribution déterministe ──────────────────────────────────────────
  console.log("→ Redistribution déterministe (pool v2 + contextualisation)…");
  const usage = new Map<string, number>();
  const updates: { id: string; comment: string }[] = [];
  let contextualized = 0;
  for (const r of reviews) {
    const comment = selectHumanizedComment(r.id, r.rating, r.orderLabel, usage);
    usage.set(comment, (usage.get(comment) ?? 0) + 1);
    if (!poolForRating(r.rating).includes(comment)) contextualized++;
    if (comment !== r.comment) updates.push({ id: r.id, comment });
  }
  const planned = {
    distinct: usage.size,
    topReuse: Math.max(0, ...usage.values()),
  };
  console.log(
    `   ${planned.distinct} commentaires distincts prévus | réutilisation max ${planned.topReuse}× | ` +
      `${contextualized} avis contextualisés (${Math.round((contextualized / Math.max(1, reviews.length)) * 100)} %)`
  );

  // ── Écriture par lots ────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log("→ Mode --dry-run : aucune écriture effectuée.");
  } else if (updates.length === 0) {
    console.log("→ Aucune mise à jour nécessaire (base déjà humanisée).");
  } else {
    console.log(`→ Écriture de ${updates.length} commentaire(s) par lots de ${BATCH_SIZE}…`);
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      await withRetry(`lot ${Math.floor(i / BATCH_SIZE) + 1}`, () =>
        db.$transaction(
          batch.map((u) => db.review.update({ where: { id: u.id }, data: { comment: u.comment } }))
        )
      );
      process.stdout.write(`\r   ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length} avis réécrits`);
    }
    process.stdout.write("\n");
  }

  // ── Vérification finale (relue depuis la base) ───────────────────────────
  const updatesById = new Map(updates.map((u) => [u.id, u.comment]));
  const after = DRY_RUN
    ? reviews.map((r) => ({ rating: r.rating, comment: updatesById.get(r.id) ?? r.comment }))
    : await db.review.findMany({ select: { rating: true, comment: true } });
  const afterComments = after.map((r) => r.comment);
  const afterCounts = countBy(afterComments);
  const afterByRating = countBy(after.map((r) => String(r.rating)));
  const afterDistinct = new Set(afterComments).size;
  const topAfter = [...afterCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const emptyComments = afterComments.filter((c) => !c || !c.trim()).length;
  const ratingsUnchanged =
    before.byRating.size === afterByRating.size &&
    [...before.byRating.entries()].every(([k, v]) => afterByRating.get(k) === v);

  console.log("\n═══ Rapport d'humanisation des avis ═══");
  console.log(`Avis traités              : ${before.total}`);
  console.log(`Commentaires réécrits     : ${DRY_RUN ? 0 : updates.length}`);
  console.log(`Avis contextualisés       : ${contextualized} (${Math.round((contextualized / Math.max(1, reviews.length)) * 100)} %)`);
  console.log(`Textes uniques avant      : ${before.distinct}`);
  console.log(`Textes uniques après      : ${afterDistinct}`);
  console.log(`Réutilisation max avant   : ${before.topReuse}×`);
  console.log(`Réutilisation max après   : ${topAfter[0]?.[1] ?? 0}×`);
  console.log(`Distribution des notes    : ${ratingsUnchanged ? "inchangée ✓" : "MODIFIÉE ✗"}`);
  console.log(`Commentaires vides        : ${emptyComments}`);
  console.log(`Objectif ≥ 900 uniques    : ${afterDistinct >= 900 ? "ATTEINT ✓" : "MANQUÉ ✗"}`);
  console.log(`Objectif ≤ ${MAX_COMMENT_REUSE} reprises     : ${(topAfter[0]?.[1] ?? 0) <= MAX_COMMENT_REUSE ? "ATTEINT ✓" : "MANQUÉ ✗"}`);
  console.log("Top répétitions après :");
  for (const [comment, n] of topAfter) {
    console.log(`  [${n}×] ${comment.slice(0, 80)}${comment.length > 80 ? "…" : ""}`);
  }

  if (afterDistinct < 900 || (topAfter[0]?.[1] ?? 0) > MAX_COMMENT_REUSE || !ratingsUnchanged || emptyComments > 0) {
    throw new Error("Garanties de distribution non respectées : voir rapport ci-dessus.");
  }
}

main()
  .catch((e) => {
    console.error("✗ Échec de l'humanisation des avis :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

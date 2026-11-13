/**
 * CLI : `bun run fix:faq-emdash` — hygiene éditoriale SEO (v2.2.1).
 *
 * Correctif ciblé de l'audit élite SEO/GEO/AIO : 13 fiches portent un cadratin
 * « — » (typographie mécanique « trop IA ») dans UNE même réponse FAQ de
 * séquestration, là où le reste du catalogue écrit « feu vert : le vendeur… »
 * (deux-points typographique français, 46 occurrences de référence).
 *
 * Avant : « …séquestré jusqu'à votre feu vert — le vendeur ne touche rien… »
 * Après : « …séquestré jusqu'à votre feu vert : le vendeur ne touche rien… »
 *
 * Idempotent (relancer ne change rien) · déterministe (aucun aléatoire) ·
 * chirurgical (UNIQUEMENT le gabarit « feu vert — le vendeur », jamais les
 * tirets d'incise dans un contexte éditorial légitime).
 *
 * Usage :
 *   bun run scripts/fix-faq-emdash.ts                # base locale (SQLite, .env)
 *   bun run scripts/fix-faq-emdash.ts --dry-run       # rapport sans écriture
 *
 *   # Production Neon (même convention que emojis:clean) :
 *   NEON_DATABASE_URL="postgresql://…sslmode=require" bun run scripts/fix-faq-emdash.ts
 */
import { db } from "../src/lib/db";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const urlArg = args.find((a) => a.startsWith("--url="))?.split("=").slice(1).join("=");
const NEON_URL = urlArg || process.env.NEON_DATABASE_URL;
const ON_NEON = Boolean(NEON_URL && /^postgres(ql)?:\/\//.test(NEON_URL));

/** Le gabarit fautif exact (et sa forme saine de remplacement). */
const FAULTY = "feu vert — le vendeur";
const CLEAN = "feu vert : le vendeur";

function qs(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

// ─── Mode production : SQL direct (pg), même correction que le mode local ───

async function runNeon(): Promise<void> {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: NEON_URL });
  await client.connect();

  const sql = DRY
    ? `SELECT COUNT(*) AS n FROM "Service" WHERE "faq" LIKE ${qs("%" + FAULTY + "%")}`
    : `UPDATE "Service" SET "faq" = replace("faq", ${qs(FAULTY)}, ${qs(CLEAN)}) WHERE "faq" LIKE ${qs("%" + FAULTY + "%")} RETURNING "slug"`;

  const res = await client.query(sql);
  const n = DRY
    ? Number((res.rows?.[0] as { n?: string })?.n ?? 0)
    : Number(res.rowCount ?? 0);
  if (!DRY) {
    for (const r of res.rows as { slug: string }[]) console.log(`  • ${r.slug}`);
  }
  console.log(`\n[fix:faq-emdash] ${DRY ? "DRY-RUN — " : ""}${n} fiche(s) corrigée(s) sur Neon.`);
  await client.end();
}

// ─── Mode local : Prisma (SQLite) ────────────────────────────────────────────

async function runLocal(): Promise<void> {
  const faulty = await db.service.findMany({
    where: { faq: { contains: FAULTY } },
    select: { slug: true, faq: true },
  });

  if (faulty.length === 0) {
    console.log("[fix:faq-emdash] Rien à corriger — base déjà propre.");
    return;
  }

  for (const s of faulty) {
    console.log(`  • ${s.slug}`);
    if (!DRY) {
      await db.service.update({
        where: { slug: s.slug },
        data: { faq: s.faq.split(FAULTY).join(CLEAN) },
      });
    }
  }
  console.log(`\n[fix:faq-emdash] ${DRY ? "DRY-RUN — " : ""}${faulty.length} fiche(s) corrigée(s).`);
}

// ─── Entrée ───────────────────────────────────────────────────────────────────

(ON_NEON ? runNeon() : runLocal())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[fix:faq-emdash] échec :", e);
    process.exit(1);
  });

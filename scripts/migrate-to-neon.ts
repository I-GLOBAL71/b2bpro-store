/**
 * CLI : `bun run db:migrate:neon` — migration intégrale SQLite → Neon PostgreSQL
 *
 * Copie TOUTES les données de la base locale (db/custom.db) vers la base Neon
 * de production : vendeurs, services, options, avis, blog, base de connaissances
 * IA, leads, conversations, commandes — IDs et slugs préservés à l'identique
 * (aucune URL SEO ne change).
 *
 * Usage :
 *   NEON_DATABASE_URL="postgresql://…sslmode=require" bun run db:migrate:neon
 *   bun run db:migrate:neon --url="postgresql://…"
 *
 * Étapes :
 *   1. `prisma db push --skip-generate --schema prisma/schema.postgres.prisma`
 *      (crée/met à jour les tables Neon ; --skip-generate PROTÈGE le client
 *      Prisma SQLite local de toute régénération intempestive) ;
 *   2. purge des tables cibles (ordre inverse des dépendances — refresh complet) ;
 *   3. copie des lignes (ordre des dépendances) avec conversion de types
 *      (booléens 0/1 → true/false, dates SQLite → timestamp Postgres) ;
 *   4. vérification des comptes table par table — code sortie 1 si divergence.
 *
 * Idempotent : ré-exécuter refresh la cible à l'image de la source.
 * La source reste INTACTE (lecture seule) — snapshot local non nécessaire.
 */
import { Database } from "bun:sqlite";
import { Client } from "pg";

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith("--url="))?.split("=").slice(1).join("=");
const TARGET_URL = urlArg || process.env.NEON_DATABASE_URL;
const SQLITE_PATH = args.find((a) => a.startsWith("--sqlite="))?.split("=")[1] || "db/custom.db";

if (!TARGET_URL || !/^postgres(ql)?:\/\//.test(TARGET_URL)) {
  console.error(
    "✗ URL Neon requise : passez --url=\"postgresql://…\" ou NEON_DATABASE_URL.\n" +
      "  (Utilisez la chaîne « Pooled connection » de Neon, avec sslmode=require.)"
  );
  process.exit(1);
}

// Ordre de copie = ordre des dépendances FK ; purge = ordre inverse.
const TABLES = ["Seller", "Service", "ServiceOption", "Review", "BlogPost", "KnowledgeItem", "Lead", "ChatMessage", "Order"] as const;

interface SqliteColumn {
  name: string;
  type: string;
  notnull: number;
}

function convertValue(value: unknown, colType: string): unknown {
  if (value === null || value === undefined) return null;
  switch (colType.toUpperCase()) {
    case "BOOLEAN":
      return value === 1 || value === true;
    case "DATETIME": {
      if (value instanceof Date) return value;
      if (typeof value === "number") return new Date(value);
      const s = String(value).trim().replace(" ", "T");
      const hasTz = /(Z|[+-]\d{2}:?\d{2})$/.test(s);
      const d = new Date(hasTz ? s : `${s}Z`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    default:
      return value;
  }
}

console.log(`\n🚚 Migration SQLite → Neon PostgreSQL`);
console.log(`   Source : ${SQLITE_PATH} (lecture seule)`);
console.log(`   Cible  : ${TARGET_URL.replace(/:\/\/[^@]*@/, "://***@")}\n`);

// ── Étape 1 : créer/mettre à jour les tables Neon (schéma Postgres) ──────────
console.log("1/4 Application du schéma Postgres (prisma db push --schema prisma/schema.postgres.prisma)…");
const push = Bun.spawnSync(
  ["bunx", "prisma", "db", "push", "--skip-generate", "--schema", "prisma/schema.postgres.prisma"],
  { env: { ...process.env, DATABASE_URL: TARGET_URL }, stdout: "inherit", stderr: "inherit" }
);
if (push.exitCode !== 0) {
  console.error("✗ `prisma db push` a échoué — vérifiez l'URL Neon et vos droits.");
  process.exit(1);
}

// ── Étape 2 : lecture intégrale de SQLite ────────────────────────────────────
console.log("2/4 Lecture de la base SQLite source…");
const sqlite = new Database(SQLITE_PATH, { readonly: true });
const sources = new Map<string, { columns: SqliteColumn[]; rows: Record<string, unknown>[] }>();
for (const table of TABLES) {
  const columns = sqlite
    .query(`PRAGMA table_info("${table}")`)
    .all() as unknown as SqliteColumn[];
  if (columns.length === 0) {
    console.error(`✗ Table ${table} introuvable dans la source SQLite.`);
    process.exit(1);
  }
  const rows = sqlite
    .query(`SELECT * FROM "${table}"`)
    .all() as unknown as Record<string, unknown>[];
  sources.set(table, { columns, rows });
}
sqlite.close();

// ── Étape 3 : purge + copie vers Neon ────────────────────────────────────────
console.log("3/4 Copie vers Neon (purge puis insertion, ordre des dépendances)…");
const pg = new Client({ connectionString: TARGET_URL });
await pg.connect();

try {
  await pg.query("BEGIN");
  // Purge (ordre inverse des dépendances FK)
  for (const table of [...TABLES].reverse()) {
    await pg.query(`DELETE FROM "${table}"`);
  }
  // Copie
  for (const table of TABLES) {
    const { columns, rows } = sources.get(table)!;
    if (rows.length === 0) continue;
    const colNames = columns.map((c) => `"${c.name}"`).join(", ");
    const CHUNK = 25;
    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK);
      const values: unknown[] = [];
      // Une requête multi-VALUES par lot : (…),(…),(…)
      const tuples = chunk
        .map(
          (row) =>
            `(${columns
              .map((c) => {
                values.push(convertValue(row[c.name], c.type));
                return `$${values.length}`;
              })
              .join(", ")})`
        )
        .join(", ");
      await pg.query(`INSERT INTO "${table}" (${colNames}) VALUES ${tuples}`, values);
    }
    console.log(`   ✓ ${table} : ${rows.length} ligne(s)`);
  }
  await pg.query("COMMIT");
} catch (e) {
  await pg.query("ROLLBACK").catch(() => undefined);
  console.error("✗ Échec de la copie — transaction annulée (ROLLBACK).", e instanceof Error ? e.message : e);
  await pg.end();
  process.exit(1);
}

// ── Étape 4 : vérification des comptes ───────────────────────────────────────
console.log("4/4 Vérification des comptes…");
let mismatch = false;
for (const table of TABLES) {
  const expected = sources.get(table)!.rows.length;
  const { rows } = await pg.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM "${table}"`);
  const actual = Number(rows[0].n);
  const mark = actual === expected ? "✓" : "✗";
  if (actual !== expected) mismatch = true;
  console.log(`   ${mark} ${table} : ${actual}/${expected}`);
}
await pg.end();

if (mismatch) {
  console.error("\n✗ DIVERGENCE détectée — la cible ne reflète pas la source. Réessayez.");
  process.exit(1);
}
console.log("\n✓ Migration Neon terminée : source et cible sont identiques.");
console.log("  Prochaines étapes (runbook docs/DEPLOIEMENT-VERCEL.md) :");
console.log("  • Vercel → DATABASE_URL = cette URL Neon (pooled)");
console.log("  • miniatures WebP : BLOB_READ_WRITE_TOKEN + bun run thumbs:blob");
console.log("  • paiement : PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENV");
process.exit(0);

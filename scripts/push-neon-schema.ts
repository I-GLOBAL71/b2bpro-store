/**
 * CLI : `bun run db:push:pg` — applique le schéma Postgres (Prisma) à la base Neon.
 *
 * Accepte l'URL cible depuis `NEON_DATABASE_URL` (convention du runbook, cf.
 * docs/DEPLOIEMENT-VERCEL.md §1.3) ou depuis `DATABASE_URL` si celle-ci est déjà
 * une URL `postgres://…` (utile sur des environnements qui n'exportent que celle-ci).
 * L'URL est injectée à `prisma db push` en variable d'environnement réelle — elle
 * PRIME donc sur le `DATABASE_URL` du fichier `.env` (SQLite local), sans jamais
 * modifier ce fichier.
 *
 * Réveil Neon : sur les plans avec auto-suspend, le compute s'endort après
 * inactivité et la première connexion peut être refusée (P1001). Le script
 * réessaie automatiquement jusqu'à 3 fois (5 s d'écart) — le temps que Neon
 * réveille le compute.
 *
 * `--skip-generate` PROTÈGE le client Prisma SQLite local de toute régénération
 * intempestive : le client Postgres n'est généré que sur Vercel (buildCommand).
 *
 * Usage :
 *   NEON_DATABASE_URL="postgresql://…sslmode=require" bun run db:push:pg
 *   bun run db:push:pg --url="postgresql://…"
 *
 * ⚠️ Ce script ne copie AUCUNE donnée — il ne crée/met à jour que les tables.
 * Pour copier les données : `NEON_DATABASE_URL="…" bun run db:migrate:neon`.
 */
const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith("--url="))?.split("=").slice(1).join("=");
const envUrl = process.env.NEON_DATABASE_URL;
const dbUrlIsPostgres = process.env.DATABASE_URL?.startsWith("postgres");
const TARGET_URL = urlArg || envUrl || (dbUrlIsPostgres ? process.env.DATABASE_URL : undefined);

if (!TARGET_URL || !/^postgres(ql)?:\/\//.test(TARGET_URL)) {
  console.error(
    "✗ URL Neon requise : passez --url=\"postgresql://…\", NEON_DATABASE_URL=\"postgresql://…\"\n" +
      "  ou une DATABASE_URL postgres:// déjà exportée. (Utilisez la chaîne « Pooled\n" +
      "  connection » de Neon, avec sslmode=require.)"
  );
  process.exit(1);
}

console.log(`\n🗄️  Application du schéma Postgres à Neon`);
console.log(`   Cible : ${TARGET_URL.replace(/:\/\/[^@]*@/, "://***@")}\n`);

const MAX_ATTEMPTS = 3;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const push = Bun.spawnSync(
    ["bunx", "prisma", "db", "push", "--skip-generate", "--schema", "prisma/schema.postgres.prisma"],
    { env: { ...process.env, DATABASE_URL: TARGET_URL }, stdout: "pipe", stderr: "pipe" }
  );
  const output = `${push.stdout.toString()}\n${push.stderr.toString()}`.trim();

  if (push.exitCode === 0) {
    if (output) console.log(output);
    process.exit(0);
  }

  // P1001 (compute Neon endormi) : réveil en cours → nouvelle tentative.
  if (attempt < MAX_ATTEMPTS && output.includes("P1001")) {
    console.log(`   ⏳ Compute Neon en cours de réveil (P1001) — nouvelle tentative ${attempt + 1}/${MAX_ATTEMPTS} dans 5 s…`);
    await Bun.sleep(5000);
    continue;
  }

  if (output) console.error(output);
  process.exit(push.exitCode ?? 1);
}

console.error("✗ `prisma db push` a échoué après plusieurs tentatives — vérifiez l'URL Neon et vos droits.");
process.exit(1);

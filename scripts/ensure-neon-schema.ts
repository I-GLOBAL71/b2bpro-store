/**
 * CLI (build Vercel) : `bun scripts/ensure-neon-schema.ts`
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Garant de schéma en production — v2.0.2
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PROBLÈME QU'IL RÉSOUT : la base Neon de production ne peut être atteinte
 * QUE depuis Vercel (DATABASE_URL y est exposée au build ET au runtime).
 * Historiquement, appliquer le schéma Postgres exigeait d'exécuter
 * `bun run db:push:pg` depuis un poste où l'URL Neon est disponible — étape
 * humaine, oublieuse : v2.0.0 (auth Google + lien magique) a déployé ses
 * routes SANS jamais créer les tables `User` / `Account` / `Session` /
 * `VerificationToken` côté Neon → POST /api/auth/signin/email = 500 et
 * callback Google impossible (P2021 « table does not exist »).
 *
 * GARANT : ce script est appelé au DÉBUT du build Vercel (vercel.json).
 * Il applique `prisma db push --schema prisma/schema.postgres.prisma`, qui
 * est IDEMPOTENT (crée uniquement ce qui manque, ne touche pas aux données).
 * Dès lors, chaque déploiement aligne automatiquement la base de production
 * sur le schéma du dépôt — plus aucune étape humaine.
 *
 * CLAUSES DE SÉCURITÉ :
 *   • DATABASE_URL absente ou non-Postgres (build local SQLite) → skip muet ;
 *   • SANS `--accept-data-loss` : si le schéma distant diverge au point
 *     d'exiger une opération destructive, `db push` REFUSE (échec contrôlé)
 *     — ce script ne peut JAMAIS supprimer une table ni une colonne de
 *     production ;
 *   • échec réseau/compute endormi → réessais (P1001 ×3), puis AVERTISSEMENT
 *     dans le log de build et exit 0 : le site se déploie toujours (le
 *     comportement en production reste alors celui d'avant le build,
 *     jamais un build cassé) ;
 *   • l'URL de connexion n'est JAMAIS imprimée (masquée avant tout log).
 *
 * Manuel équivalent (runbook §1.3) si besoin hors build :
 *   NEON_DATABASE_URL="postgresql://…sslmode=require" bun run db:push:pg
 */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

const dbUrl = process.env.DATABASE_URL ?? "";

// ── 1. Hors production Postgres → rien à faire (build local SQLite) ─────────
if (!/^postgres(ql)?:\/\//.test(dbUrl)) {
  console.log("⏭️  [neon-schema] DATABASE_URL non-Postgres — base de dev locale, schéma Neon ignoré.");
  process.exit(0);
}

console.log(
  `🗄️  [neon-schema] Synchronisation du schéma Postgres (Neon) — cible : ${dbUrl.replace(/:\/\/[^@]*@/, "://***@")}`
);

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const push = Bun.spawnSync(
    [
      "bunx",
      "prisma",
      "db",
      "push",
      // PAS de --accept-data-loss : opérations destructives toujours refusées.
      "--skip-generate",
      "--schema",
      "prisma/schema.postgres.prisma",
    ],
    { stdout: "pipe", stderr: "pipe" }
  );
  const output = `${push.stdout.toString().trim()}\n${push.stderr.toString().trim()}`.trim();

  // ── Succès : la base est alignée (tables manquantes créées, sinon no-op) ──
  if (push.exitCode === 0) {
    if (output) console.log(output);
    console.log("✅ [neon-schema] Schéma de production aligné — auth (User/Account/Session/VerificationToken) incluse.");
    process.exit(0);
  }

  // ── Compute Neon endormi (P1001) : réveil en cours → nouvelle tentative ──
  if (attempt < MAX_ATTEMPTS && output.includes("P1001")) {
    console.log(`   ⏳ Compute Neon en cours de réveil (P1001) — tentative ${attempt + 1}/${MAX_ATTEMPTS} dans ${RETRY_DELAY_MS / 1000} s…`);
    await Bun.sleep(RETRY_DELAY_MS);
    continue;
  }

  // ── Échec définitif : AVERTIR sans jamais bloquer le déploiement ─────────
  console.warn(
    [
      "",
      "⚠️  ⚠️  ⚠️  [neon-schema] ÉCHEC de synchronisation — LE BUILD CONTINUE QUAND MÊME. ⚠️  ⚠️  ⚠️",
      "   L'authentification (Google + lien magique) restera indisponible en",
      "   production tant que le schéma n'est pas appliqué. Cause probable :",
      "   DATABASE_URL invisible au build (scoping Vercel) ou base injoignable.",
      "",
      "   Correctif manuel (runbook §1.3) :",
      '     NEON_DATABASE_URL="postgresql://…sslmode=require" bun run db:push:pg',
      "",
      "   Détail technique (URL masquée) :",
      ...output.split("\n").slice(-12).map((l) => `     ${l}`),
    ].join("\n")
  );
  // exit 0 VOLONTAIRE : le site doit toujours pouvoir se déployer.
  process.exit(0);
}

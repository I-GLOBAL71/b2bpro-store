/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  scripts/ensure-neon-schema.ts — garant de schéma Neon au build Vercel
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Appelé en TÊTE du `buildCommand` Vercel (voir vercel.json) :
 *   bun scripts/ensure-neon-schema.ts &&
 *   bunx prisma generate --schema prisma/schema.postgres.prisma &&
 *   next build
 *
 * Rôle : appliquer `prisma db push` (schéma Postgres) à la base de production
 * AVANT le build. Idempotent : base déjà conforme → aucune écriture. C'est ce
 * garant qui a créé les tables d'auth (User/Account/Session/VerificationToken)
 * absentes de Neon, faute de quoi TOUTE connexion Google échoue en
 * `?error=Callback` (exception adaptateur Prisma dans le rappel OAuth).
 *
 * v2.1.3 — rattrapage DDL « Account unique index » : l'adaptateur NextAuth
 * interpole `provider_providerAccountId` (getUserByAccount), ce qui EXIGE
 * `@@unique([provider, providerAccountId])` sur Account. Or `db push` ne peut
 * pas AJOUTER un index unique en non-interactif sans `--accept-data-loss`
 * (flag que ce script n'utilise JAMAIS — il autoriserait des changements
 * destructifs sur des données de production). D'où la séquence :
 *   1. `CREATE UNIQUE INDEX IF NOT EXISTS …` via `prisma db execute`
 *      (purement additif, idempotent, échoue proprement si doublons) ;
 *   2. `prisma db push` voit alors le schéma conforme → aucune confirmation.
 *
 * Garanties de sécurité :
 *   • AUCUN `--accept-data-loss` : si des changements destructifs seraient
 *     nécessaires, `db push` ÉCHOUE — jamais une colonne ni une table de
 *     production n'est supprimée par ce script.
 *   • Échec NON bloquant : le build continue (log d'avertissement) — un
 *     incident de réseau vers Neon ne doit pas empêcher le déploiement.
 *   • URL masquée dans les logs (jamais d'identifiants dans la console Vercel).
 *   • Skip silencieux (exit 0) si DATABASE_URL n'est pas Postgres (dev local
 *     SQLite) — le script ne fait alors strictement rien.
 *
 * Réveil Neon : sur les plans auto-suspend, le compute peut être endormi et
 * refuser la première connexion (P1001) → 3 tentatives espacées de 5 s.
 *
 * Historique : une première version de ce garant (v2.0.2) n'avait JAMAIS été
 * commise sur Git — vercel.json en production n'en a donc jamais exécuté. Ce
 * fichier est la version réellement versionnée (v2.1.3) : tout `git push`
 * reconduit désormais le garant avec le code.
 */

import { unlinkSync, writeFileSync } from "node:fs";

const TAG = "[neon-schema]";
const MAX_ATTEMPTS = 3;
const DDL_FILE = ".tmp-neon-ddl.sql";

const dbUrl = process.env.DATABASE_URL?.trim() ?? "";

// ── Skip : développement local (SQLite) ou aucune URL ────────────────────────
if (!dbUrl || !/^postgres(ql)?:\/\//i.test(dbUrl)) {
  console.log(`${TAG} DATABASE_URL non-Postgres (${dbUrl ? "SQLite/dev" : "absente"}) — skip.`);
  process.exit(0);
}

const masked = dbUrl.replace(/:\/\/[^@]*@/, "://***@");
console.log(`${TAG} Synchronisation du schéma Postgres vers Neon…`);
console.log(`${TAG} Cible : ${masked}`);

/**
 * Rattrapage additif : index unique composé Account(provider, providerAccountId)
 * requis par l'adaptateur NextAuth. Échoue PROPREMENT si la table Account
 * n'existe pas encore (db push la créera complète, index inclus) ou si des
 * doublons existent (aucune donnée n'est jamais touchée). Non-fatal.
 */
function ensureAccountUniqueIndex(): boolean {
  try {
    const ddl =
      'CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ' +
      'ON "Account"("provider", "providerAccountId");';
    writeFileSync(DDL_FILE, ddl);
    const res = Bun.spawnSync(
      ["bunx", "prisma", "db", "execute", "--file", DDL_FILE, "--url", dbUrl],
      { stdout: "pipe", stderr: "pipe" },
    );
    return res.exitCode === 0;
  } catch {
    return false;
  } finally {
    try {
      unlinkSync(DDL_FILE);
    } catch {
      /* fichier déjà retiré */
    }
  }
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  // 1. Rattrapage DDL additif (voir en-tête) — idempotent, non-fatal.
  if (ensureAccountUniqueIndex()) {
    console.log(`${TAG} ✓ Index unique Account(provider, providerAccountId) présent.`);
  } else {
    console.log(`${TAG} ℹ Rattrapage d'index non applicable (table absente ou déjà couverte) — db push tranchera.`);
  }

  // 2. Synchronisation idempotente du schéma complet.
  const push = Bun.spawnSync(
    ["bunx", "prisma", "db", "push", "--skip-generate", "--schema", "prisma/schema.postgres.prisma"],
    { env: { ...process.env, DATABASE_URL: dbUrl }, stdout: "pipe", stderr: "pipe" },
  );
  const output = `${push.stdout?.toString() ?? ""}\n${push.stderr?.toString() ?? ""}`.trim();

  if (push.exitCode === 0) {
    if (output) console.log(output);
    console.log(`${TAG} ✓ Schéma Neon conforme (aucune donnée touchée).`);
    process.exit(0);
  }

  // P1001 : compute Neon en cours de réveil → nouvelle tentative.
  if (attempt < MAX_ATTEMPTS && output.includes("P1001")) {
    console.log(`${TAG} ⏳ Compute Neon endormi (P1001) — tentative ${attempt + 1}/${MAX_ATTEMPTS} dans 5 s…`);
    await Bun.sleep(5000);
    continue;
  }

  // Échec définitif : JAMAIS bloquant pour le déploiement.
  console.warn(`${TAG} ⚠ prisma db push a échoué (code ${push.exitCode}) — le build continue.`);
  console.warn(`${TAG} ⚠ Détail (identifiants masqués) :`);
  console.warn(output.replace(/:\/\/[^@]*@/g, "://***@").slice(0, 2000));
  process.exit(0);
}

console.warn(`${TAG} ⚠ Épuisé après ${MAX_ATTEMPTS} tentatives — le build continue.`);
process.exit(0);
